import mongoose from 'mongoose';
import { Chunk } from '../models/Chunk.js';
import { embedder } from './embedder.js';
import logger from '../utils/logger.js';

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retriever Module
 * Hybrid retrieval over student workspace materials with Atlas Vector Search
 * and in-memory fallback for local testing and non-Atlas environments.
 */
export class Retriever {
  async retrieve({ workspaceId, query, k = 6, materialIds = null }) {
    if (!workspaceId || !query) {
      return [];
    }

    logger.debug({ workspaceId, query, k }, 'Retrieving context passages for query');

    let queryVector = null;
    try {
      queryVector = await embedder.embedQuery(query);
    } catch (embedErr) {
      logger.warn({ err: embedErr.message }, 'Failed to compute query embedding, proceeding with keyword fallback');
    }

    // 1. Attempt Atlas $vectorSearch if query vector is available
    if (queryVector && Array.isArray(queryVector) && queryVector.length > 0) {
      try {
        const filter = {
          workspaceId: new mongoose.Types.ObjectId(workspaceId)
        };
        if (materialIds && Array.isArray(materialIds) && materialIds.length > 0) {
          filter.materialId = {
            $in: materialIds.map(id => new mongoose.Types.ObjectId(id))
          };
        }

        const pipeline = [
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector,
              numCandidates: Math.max(k * 10, 50),
              limit: k,
              filter
            }
          },
          {
            $project: {
              _id: 1,
              workspaceId: 1,
              materialId: 1,
              text: 1,
              location: 1,
              score: { $meta: 'vectorSearchScore' }
            }
          }
        ];

        const results = await Chunk.aggregate(pipeline);
        if (results && results.length > 0) {
          return results;
        }
      } catch (vectorSearchErr) {
        logger.debug(
          { err: vectorSearchErr.message },
          'Atlas $vectorSearch unavailable or index not created, falling back to in-memory cosine search'
        );
      }
    }

    // 2. In-Memory Cosine Similarity / Keyword Fallback
    try {
      const filter = { workspaceId };
      if (materialIds && Array.isArray(materialIds) && materialIds.length > 0) {
        filter.materialId = { $in: materialIds };
      }

      const chunks = await Chunk.find(filter).lean();
      if (!chunks || chunks.length === 0) {
        return [];
      }

      // If we have a query vector and chunks have embeddings, score by cosine similarity
      if (queryVector && queryVector.length > 0 && chunks.some(c => c.embedding?.length > 0)) {
        const scored = chunks.map(chunk => ({
          _id: chunk._id,
          workspaceId: chunk.workspaceId,
          materialId: chunk.materialId,
          text: chunk.text,
          location: chunk.location,
          score: cosineSimilarity(queryVector, chunk.embedding)
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, k);
      }

      // 3. Keyword / Substring match fallback (useful for unit tests without mock embeddings)
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2);

      const scored = chunks.map(chunk => {
        const textLower = chunk.text.toLowerCase();
        let matches = 0;
        for (const word of keywords) {
          if (textLower.includes(word)) matches += 1;
        }
        return {
          _id: chunk._id,
          workspaceId: chunk.workspaceId,
          materialId: chunk.materialId,
          text: chunk.text,
          location: chunk.location,
          score: matches / Math.max(keywords.length, 1)
        };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, k);
    } catch (fallbackErr) {
      logger.error({ err: fallbackErr.message }, 'Retrieval fallback failed');
      return [];
    }
  }
}

export const retriever = new Retriever();
export default retriever;
