import { config } from '../config/env.js';
import logger from './logger.js';

class ObservabilityManager {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      tasks: {},
      latencies: []
    };
  }

  recordLLMCall({
    task = 'general',
    model,
    latencyMs = 0,
    promptTokens = 0,
    completionTokens = 0,
    success = true,
    error = null
  }) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    this.metrics.totalPromptTokens += promptTokens || 0;
    this.metrics.totalCompletionTokens += completionTokens || 0;

    if (!this.metrics.tasks[task]) {
      this.metrics.tasks[task] = {
        count: 0,
        failures: 0,
        totalLatencyMs: 0
      };
    }
    this.metrics.tasks[task].count++;
    if (!success) this.metrics.tasks[task].failures++;
    this.metrics.tasks[task].totalLatencyMs += latencyMs;

    this.metrics.latencies.push(latencyMs);
    if (this.metrics.latencies.length > 500) {
      this.metrics.latencies.shift();
    }

    // Optional Langfuse Tracing
    if (config.langfusePublicKey && config.langfuseSecretKey) {
      this.sendLangfuseSpan({
        task,
        model,
        latencyMs,
        promptTokens,
        completionTokens,
        success,
        error
      }).catch(() => {});
    }
  }

  async sendLangfuseSpan({ task, model, latencyMs, promptTokens, completionTokens, success, error }) {
    try {
      const auth = Buffer.from(`${config.langfusePublicKey}:${config.langfuseSecretKey}`).toString('base64');
      const payload = {
        batch: [
          {
            id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'generation-create',
            body: {
              name: task,
              model,
              startTime: new Date(Date.now() - latencyMs).toISOString(),
              endTime: new Date().toISOString(),
              level: success ? 'DEFAULT' : 'ERROR',
              statusMessage: error ? error.toString() : 'OK',
              usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens
              }
            }
          }
        ]
      };

      await fetch(`${config.langfuseHost.replace(/\/$/, '')}/api/public/ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // Non-blocking observability error
    }
  }

  getStats() {
    const latencies = [...this.metrics.latencies].sort((a, b) => a - b);
    const avgLatencyMs = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    const p95LatencyMs = latencies.length > 0
      ? latencies[Math.floor(latencies.length * 0.95)] || 0
      : 0;

    const failureRate = this.metrics.totalRequests > 0
      ? Number(((this.metrics.failedRequests / this.metrics.totalRequests) * 100).toFixed(1))
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      failureRatePercent: failureRate,
      avgLatencyMs,
      p95LatencyMs,
      totalTokens: this.metrics.totalPromptTokens + this.metrics.totalCompletionTokens,
      tasks: this.metrics.tasks,
      langfuseConfigured: !!(config.langfusePublicKey && config.langfuseSecretKey)
    };
  }
}

export const observability = new ObservabilityManager();
export default observability;
