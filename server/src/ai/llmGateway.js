import { GoogleGenAI } from '@google/genai';
import pRetry from 'p-retry';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import { observability } from '../utils/observability.js';

export class LLMValidationError extends Error {
  constructor(message, errors, rawText) {
    super(message);
    this.name = 'LLMValidationError';
    this.errors = errors;
    this.rawText = rawText;
  }
}

class LLMGateway {
  constructor() {
    this.client = null;
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

  resolveModel(tier = 'default') {
    let chosen;
    switch (tier) {
      case 'fast':
        chosen = config.geminiModelFast || 'gemini-3.5-flash-lite';
        break;
      case 'reasoning':
        chosen = config.geminiModelReasoning || 'gemini-3.5-flash';
        break;
      case 'default':
      default:
        chosen = config.geminiModelDefault || 'gemini-3.5-flash';
        break;
    }

    // Auto-map deprecated or discontinued models
    if (chosen.includes('gemini-2.5-flash-lite')) return 'gemini-3.5-flash-lite';
    if (chosen.includes('gemini-2.5-flash')) return 'gemini-3.5-flash';
    if (chosen.includes('gemini-2.5-pro')) return 'gemini-3.5-flash';
    return chosen;
  }

  async generateText({
    task = 'general',
    prompt,
    systemPrompt = '',
    modelTier = 'default',
    temperature = 0.7,
    maxOutputTokens = undefined
  }) {
    const ai = this.getClient();
    const model = this.resolveModel(modelTier);
    const startTime = Date.now();

    const reqConfig = {
      temperature,
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {})
    };

    const callFn = async () => {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Gemini API call timed out after 12000ms')), 12000);
      });

      try {
        let result;
        try {
          result = await Promise.race([
            ai.models.generateContent({
              model,
              contents: prompt,
              config: reqConfig
            }),
            timeoutPromise
          ]);
        } catch (callErr) {
          if ((callErr.message?.includes('503') || callErr.message?.includes('404')) && model !== 'gemini-3.5-flash-lite') {
            logger.warn({ fromModel: model, toModel: 'gemini-3.5-flash-lite' }, 'Primary model unavailable, falling back to gemini-3.5-flash-lite');
            result = await ai.models.generateContent({
              model: 'gemini-3.5-flash-lite',
              contents: prompt,
              config: reqConfig
            });
          } else {
            throw callErr;
          }
        }
        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const isFatalOrQuota = (err) => {
      const msg = err?.message || '';
      return (
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('429') ||
        msg.includes('limit exceeded') ||
        msg.includes('NOT_FOUND') ||
        msg.includes('404')
      );
    };

    try {
      const response = await pRetry(callFn, {
        retries: 1,
        minTimeout: 500,
        factor: 2,
        shouldRetry: (err) => !isFatalOrQuota(err),
        onFailedAttempt: (error) => {
          logger.warn(
            { task, model, attempt: error.attemptNumber, err: error.message },
            'Gemini call failed, retrying...'
          );
        }
      });

      const latencyMs = Date.now() - startTime;
      const text = response.text || '';
      const usage = response.usageMetadata || {};

      logger.info(
        {
          task,
          model,
          latencyMs,
          promptTokens: usage.promptTokenCount || 0,
          candidatesTokens: usage.candidatesTokenCount || 0
        },
        'LLM generateText completed'
      );

      observability.recordLLMCall({
        task,
        model,
        latencyMs,
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        success: true
      });

      return {
        text,
        model,
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0
        },
        latencyMs
      };
    } catch (err) {
      logger.error({ task, model, err: err.message }, 'LLM generateText failed');
      observability.recordLLMCall({
        task,
        model,
        latencyMs: Date.now() - startTime,
        success: false,
        error: err.message
      });
      throw err;
    }
  }

  async generateObject({
    task = 'structured_json',
    prompt,
    systemPrompt = '',
    schema,
    modelTier = 'default',
    temperature = 0.2
  }) {
    const ai = this.getClient();
    const model = this.resolveModel(modelTier);
    const startTime = Date.now();

    const jsonSystemInstruction = `${systemPrompt ? `${systemPrompt}\n\n` : ''}CRITICAL: You MUST respond ONLY with a raw, valid JSON object that strictly adheres to the requested format. Do NOT include markdown code blocks, backticks, or preamble.`;

    const reqConfig = {
      temperature,
      responseMimeType: 'application/json',
      systemInstruction: jsonSystemInstruction
    };

    const executeCall = async (userPrompt) => {
      const callFn = async () => {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Gemini API call timed out after 12000ms')), 12000);
        });

        try {
          let result;
          try {
            result = await Promise.race([
              ai.models.generateContent({
                model,
                contents: userPrompt,
                config: reqConfig
              }),
              timeoutPromise
            ]);
          } catch (callErr) {
            if ((callErr.message?.includes('503') || callErr.message?.includes('404')) && model !== 'gemini-3.5-flash-lite') {
              logger.warn({ fromModel: model, toModel: 'gemini-3.5-flash-lite' }, 'Primary model unavailable for structured output, falling back to gemini-3.5-flash-lite');
              result = await ai.models.generateContent({
                model: 'gemini-3.5-flash-lite',
                contents: userPrompt,
                config: reqConfig
              });
            } else {
              throw callErr;
            }
          }
          return result;
        } finally {
          clearTimeout(timeoutId);
        }
      };

      return pRetry(callFn, {
        retries: 1,
        minTimeout: 500,
        factor: 2,
        shouldRetry: (err) => {
          const msg = err?.message || '';
          return (
            !msg.includes('RESOURCE_EXHAUSTED') &&
            !msg.includes('429') &&
            !msg.includes('limit exceeded') &&
            !msg.includes('NOT_FOUND') &&
            !msg.includes('404')
          );
        }
      });
    };

    let rawText = '';
    try {
      const response = await executeCall(prompt);
      rawText = response.text || '';

      let parsedJson;
      try {
        const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        parsedJson = JSON.parse(cleaned);
      } catch (jsonErr) {
        // Attempt schema repair once if JSON syntax failed
        logger.warn({ task, model }, 'Initial JSON parse failed. Attempting schema repair...');
        const repairPrompt = `${prompt}\n\nYour previous response was not valid JSON:\n"${rawText}"\nPlease fix the JSON syntax and return ONLY valid JSON.`;
        const repairRes = await executeCall(repairPrompt);
        rawText = repairRes.text || '';
        const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        parsedJson = JSON.parse(cleaned);
      }

      if (schema) {
        const validation = schema.safeParse(parsedJson);
        if (!validation.success) {
          logger.warn(
            { task, errors: validation.error.errors },
            'JSON schema validation failed. Initiating repair prompt...'
          );

          const repairPrompt = `${prompt}\n\nYour previous JSON failed schema validation with errors: ${JSON.stringify(
            validation.error.errors
          )}\nPrevious response:\n${JSON.stringify(
            parsedJson,
            null,
            2
          )}\nPlease correct the errors and return ONLY the compliant JSON.`;

          const repairedRes = await executeCall(repairPrompt);
          rawText = repairedRes.text || '';
          const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          const repairedJson = JSON.parse(cleaned);

          const secondValidation = schema.safeParse(repairedJson);
          if (!secondValidation.success) {
            throw new LLMValidationError(
              'LLM output failed schema validation after repair attempt',
              secondValidation.error.errors,
              rawText
            );
          }
          parsedJson = secondValidation.data;
        } else {
          parsedJson = validation.data;
        }
      }

      const latencyMs = Date.now() - startTime;
      logger.info({ task, model, latencyMs }, 'LLM generateObject completed');

      observability.recordLLMCall({
        task,
        model,
        latencyMs,
        success: true
      });

      return {
        data: parsedJson,
        model,
        latencyMs
      };
    } catch (err) {
      logger.error({ task, model, err: err.message, rawText }, 'LLM generateObject failed');
      observability.recordLLMCall({
        task,
        model,
        latencyMs: Date.now() - startTime,
        success: false,
        error: err.message
      });
      throw err;
    }
  }

  async *streamText({
    task = 'stream',
    prompt,
    systemPrompt = '',
    modelTier = 'default',
    temperature = 0.7
  }) {
    const ai = this.getClient();
    const model = this.resolveModel(modelTier);

    const reqConfig = {
      temperature,
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {})
    };

    const startTime = Date.now();
    let activeModel = model;
    try {
      let responseStream;
      try {
        responseStream = await ai.models.generateContentStream({
          model: activeModel,
          contents: prompt,
          config: reqConfig
        });
      } catch (streamErr) {
        if ((streamErr.message?.includes('503') || streamErr.message?.includes('404')) && activeModel !== 'gemini-3.5-flash-lite') {
          logger.warn({ fromModel: activeModel, toModel: 'gemini-3.5-flash-lite' }, 'Primary model unavailable for streaming, falling back to gemini-3.5-flash-lite');
          activeModel = 'gemini-3.5-flash-lite';
          responseStream = await ai.models.generateContentStream({
            model: activeModel,
            contents: prompt,
            config: reqConfig
          });
        } else {
          throw streamErr;
        }
      }

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }

      observability.recordLLMCall({
        task,
        model,
        latencyMs: Date.now() - startTime,
        success: true
      });
    } catch (err) {
      observability.recordLLMCall({
        task,
        model,
        latencyMs: Date.now() - startTime,
        success: false,
        error: err.message
      });
      throw err;
    }
  }
}

export const llmGateway = new LLMGateway();
export default llmGateway;
