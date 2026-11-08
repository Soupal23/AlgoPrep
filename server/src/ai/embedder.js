import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import pRetry from 'p-retry';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

class Embedder {
  constructor() {
    this.client = null;
    this.cache = new Map(); // hash -> vector
    this.maxCacheSize = 2000;
  }

  getClient() {
    if (!this.client) {
      if (!config.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not configured in environment variables');
      }
      this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
    return this.client;
  }

  hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  async embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
    const vectors = await this.embedBatch([text], taskType);
    return vectors[0];
  }

  async embedQuery(query) {
    const vectors = await this.embedBatch([query], 'RETRIEVAL_QUERY');
    return vectors[0];
  }

  async embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const ai = this.getClient();
    let model = config.geminiEmbedModel || 'gemini-embedding-001';
    if (model === 'text-embedding-004') {
      model = 'gemini-embedding-001';
    }
    const outputDimensionality = config.embedDimensions || 768;

    const results = new Array(texts.length);
    const toFetchIndices = [];
    const toFetchTexts = [];

    // Check memory cache first
    texts.forEach((txt, idx) => {
      const h = this.hash(txt);
      if (this.cache.has(h)) {
        results[idx] = this.cache.get(h);
      } else {
        toFetchIndices.push(idx);
        toFetchTexts.push(txt);
      }
    });

    if (toFetchTexts.length === 0) {
      return results;
    }

    // Embed in paced batches of 16 to respect Gemini token-per-minute limits
    const BATCH_SIZE = 16;
    for (let i = 0; i < toFetchTexts.length; i += BATCH_SIZE) {
      if (i > 0) {
        // Inter-batch throttle delay
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      const chunk = toFetchTexts.slice(i, i + BATCH_SIZE);
      const chunkIndices = toFetchIndices.slice(i, i + BATCH_SIZE);

      const callFn = async () => {
        const embedPromises = chunk.map(content =>
          ai.models.embedContent({
            model,
            contents: content,
            config: {
              outputDimensionality,
              taskType
            }
          })
        );
        return Promise.all(embedPromises);
      };

      try {
        const responses = await pRetry(callFn, {
          retries: 2,
          minTimeout: 1000,
          factor: 2
        });

        responses.forEach((res, resIdx) => {
          const originalIdx = chunkIndices[resIdx];
          const vector = res.embedding?.values || res.embeddings?.[0]?.values || [];
          results[originalIdx] = vector;

          // Store in cache
          if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }
          this.cache.set(this.hash(chunk[resIdx]), vector);
        });
      } catch (err) {
        if (err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('429')) {
          logger.warn(
            { model, batchIndex: i, totalChunks: toFetchTexts.length },
            'Gemini free-tier embedding rate limit reached. Storing partial embeddings and continuing with keyword index.'
          );
          break; // Stop querying Gemini, retain vectors collected so far
        }
        logger.warn({ model, err: err.message }, 'Failed to generate embeddings batch');
        break;
      }
    }

    // Default any non-embedded chunk slots to empty array
    for (let j = 0; j < results.length; j++) {
      if (!Array.isArray(results[j])) {
        results[j] = [];
      }
    }

    return results;
  }
}

export const embedder = new Embedder();
export default embedder;
