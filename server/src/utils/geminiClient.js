import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

export const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash'
];

/**
 * Executes a Gemini generateContent request with automated multi-model fallback.
 * Prioritizes fast, high-availability models and fails over instantly on 503/429 spikes.
 */
export async function generateGeminiContent({ prompt, config: reqConfig = {}, models = GEMINI_MODELS }) {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  let lastError = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: reqConfig
      });
      return { text: response.text, model };
    } catch (err) {
      lastError = err;
      const status = err.status || err.code || (err.error && err.error.code);
      console.warn(`Gemini call on model "${model}" failed (status: ${status || 'unknown'}): ${err.message}. Failing over to next model...`);
    }
  }

  throw lastError || new Error('All Gemini model fallbacks exhausted.');
}
