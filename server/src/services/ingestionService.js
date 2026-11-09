import fs from 'fs/promises';
import { Material } from '../models/Material.js';
import { Chunk } from '../models/Chunk.js';
import { parseDocument } from '../parsing/index.js';
import { chunkSections } from '../parsing/chunker.js';
import { embedder } from '../ai/embedder.js';
import { config } from '../config/env.js';
import { updateJobProgress, completeJob, failJob } from './jobService.js';
import logger from '../utils/logger.js';

/**
 * Ingestion Service
 * Handles reading, parsing, semantic chunking, embedding, and storing workspace materials.
 */
export const ingestMaterial = async ({
  materialId,
  workspaceId,
  userId,
  buffer = null,
  filePath = null,
  mimeType = '',
  originalName = '',
  jobId = null
}) => {
  logger.info({ materialId, workspaceId, jobId }, 'Starting material ingestion');

  try {
    const material = await Material.findById(materialId);
    if (!material) {
      logger.warn({ materialId }, 'Material record not found (deleted or from a previous database instance). Skipping ingestion.');
      if (jobId) {
        await failJob(jobId, new Error(`Material ${materialId} not found`)).catch(() => {});
      }
      return { skipped: true };
    }

    material.status = 'processing';
    material.error = null;
    await material.save();

    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 15,
        stage: 'Reading document source'
      });
    }

    // 1. Resolve buffer
    let fileBuffer = buffer;
    if (!fileBuffer && filePath) {
      try {
        fileBuffer = await fs.readFile(filePath);
      } catch (readErr) {
        logger.warn({ err: readErr.message, filePath }, 'Could not read local file path for ingestion');
      }
    }

    if (!fileBuffer && fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
      try {
        const response = await fetch(fileUrl);
        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuf);
        }
      } catch (fetchErr) {
        logger.warn({ err: fetchErr.message, fileUrl }, 'Could not fetch remote fileUrl for ingestion');
      }
    }

    if (!fileBuffer) {
      throw new Error('No document content or file path provided for ingestion');
    }

    const resolvedMime = mimeType || material.mimeType || '';
    const resolvedName = originalName || material.fileName || '';

    // 2. Parse text & structure
    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 35,
        stage: 'Extracting text and pages'
      });
    }

    const { sections, pageCount, charCount } = await parseDocument(
      fileBuffer,
      resolvedMime,
      resolvedName
    );

    // 3. Chunk sections
    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 55,
        stage: 'Splitting into semantic chunks'
      });
    }

    let chunks = chunkSections(sections);

    // Fallback if empty sections
    if (chunks.length === 0 && charCount > 0) {
      chunks = chunkSections([{ page: 1, text: sections.map(s => s.text).join('\n\n') }]);
    }

    // 4. Generate embeddings
    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 75,
        stage: `Generating embeddings for ${chunks.length} chunks`
      });
    }

    let embeddings = [];
    if (chunks.length > 0) {
      const texts = chunks.map(c => c.text);
      try {
        embeddings = await embedder.embedBatch(texts);
      } catch (embedErr) {
        logger.warn(
          { err: embedErr.message, materialId },
          'Embedding generation encountered an issue, storing chunks without embeddings'
        );
        embeddings = new Array(chunks.length).fill([]);
      }
    }

    // 5. Store chunks in MongoDB
    if (chunks.length > 0) {
      // Remove any previously existing chunks for this material (in case of re-ingest)
      await Chunk.deleteMany({ materialId });

      const chunkDocs = chunks.map((chunk, index) => {
        const hasEmbedding = Array.isArray(embeddings[index]) && embeddings[index].length > 0;
        return {
          workspaceId,
          materialId,
          ownerId: userId,
          text: chunk.text,
          tokenCount: chunk.tokenCount,
          location: chunk.location,
          embedding: hasEmbedding ? embeddings[index] : [],
          embeddingStatus: hasEmbedding ? 'ready' : 'failed',
          embeddingModel: config.geminiEmbedModel || 'gemini-embedding-001',
          embeddingDim: 768,
          hash: chunk.hash
        };
      });

      await Chunk.insertMany(chunkDocs);
    }

    // 6. Update Material
    material.status = 'ready';
    material.pageCount = pageCount || 1;
    material.charCount = charCount;
    material.chunkCount = chunks.length;
    await material.save();

    // 7. Complete Job
    if (jobId) {
      await completeJob(jobId, {
        materialId: material._id,
        fileName: material.fileName,
        pageCount: material.pageCount,
        chunkCount: chunks.length
      });
    }

    logger.info(
      { materialId, chunkCount: chunks.length, pageCount },
      'Material ingestion completed successfully'
    );

    return {
      success: true,
      material,
      chunkCount: chunks.length
    };
  } catch (error) {
    logger.error({ materialId, err: error.message }, 'Material ingestion failed');

    await Material.findByIdAndUpdate(materialId, {
      status: 'failed',
      error: error.message
    }).catch(() => {});

    if (jobId) {
      await failJob(jobId, error).catch(() => {});
    }

    throw error;
  }
};
