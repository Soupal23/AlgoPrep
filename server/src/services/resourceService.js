import { z } from 'zod';
import { Day } from '../models/Day.js';
import { Roadmap } from '../models/Roadmap.js';
import { Resource } from '../models/Resource.js';
import { ResourceQueryCache } from '../models/ResourceQueryCache.js';
import { DayResource } from '../models/DayResource.js';
import { searchYouTube } from '../resources/adapters/youtube.js';
import { searchWikipedia } from '../resources/adapters/wikipedia.js';
import { searchWeb } from '../resources/adapters/webSearch.js';
import { searchArxiv } from '../resources/adapters/arxiv.js';
import { llmGateway } from '../ai/llmGateway.js';
import { PROMPTS } from '../ai/prompts/index.js';
import { updateJobProgress, completeJob, failJob } from './jobService.js';
import logger from '../utils/logger.js';

const singleRankingItem = z.object({
  externalId: z.string(),
  score: z.number().min(0).max(100),
  whyRecommended: z.string().optional().default('')
});

const rerankResponseSchema = z.union([
  z.object({
    rankings: z.array(singleRankingItem)
  }),
  z.object({
    evaluations: z.array(singleRankingItem)
  }),
  z.array(singleRankingItem)
]);

/**
 * Computes heuristic lexical relevance between topic query and resource title/description.
 */
function computeLexicalRelevance(topicTitle, resource) {
  if (!topicTitle) return 70;
  const terms = topicTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const text = `${resource.title || ''} ${resource.description || ''}`.toLowerCase();

  if (text.includes(topicTitle.toLowerCase())) {
    return 95;
  }

  let matches = 0;
  for (const t of terms) {
    if (text.includes(t)) matches++;
  }

  if (terms.length === 0) return 70;
  const ratio = matches / terms.length;
  return Math.round(60 + ratio * 35);
}

/**
 * Returns default whyRecommended explanation when LLM is offline or times out.
 */
function getDefaultWhyRecommended(candidate, topicTitle) {
  switch (candidate.source) {
    case 'youtube':
      return `Intuitive video walkthrough with visual traces and clear implementation patterns for ${topicTitle}.`;
    case 'wikipedia':
      return `Comprehensive encyclopedic reference covering formal theorems, definitions, and asymptotic bounds for ${topicTitle}.`;
    case 'arxiv':
      return `Academic peer-reviewed publication detailing formal algorithmic invariants and proofs for ${topicTitle}.`;
    case 'web':
    default:
      return `Standard architectural documentation, production code examples, and reference guides for ${topicTitle}.`;
  }
}

/**
 * Retrieves existing curated resources for a day.
 */
export const getDayResources = async (dayId, userId) => {
  const day = await Day.findById(dayId).lean();
  if (!day) {
    const error = new Error('Day not found');
    error.statusCode = 404;
    throw error;
  }

  if (day.ownerId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own this learning day');
    error.statusCode = 403;
    throw error;
  }

  const resources = await DayResource.find({ dayId })
    .populate('resourceId')
    .sort({ rank: 1 })
    .lean();

  return {
    dayId,
    status: day.content?.resourcesStatus || 'pending',
    resources
  };
};

/**
 * Curates educational resources across YouTube, Wikipedia, Web, and arXiv for a Day.
 * Uses 30-day ResourceQueryCache to guard external API quotas.
 */
export const getOrCurateDayResources = async ({ dayId, userId, force = false, jobId = null }) => {
  const day = await Day.findById(dayId);
  if (!day) {
    const error = new Error(`Day ${dayId} not found`);
    error.statusCode = 404;
    throw error;
  }

  if (day.ownerId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own this learning day');
    error.statusCode = 403;
    throw error;
  }

  // 1. If not forcing regeneration and already ready, return existing records
  if (!force && day.content?.resourcesStatus === 'ready') {
    const existing = await DayResource.find({ dayId })
      .populate('resourceId')
      .sort({ rank: 1 })
      .lean();
    if (existing.length > 0) {
      if (jobId) await completeJob(jobId, { count: existing.length, cached: true });
      return existing;
    }
  }

  try {
    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 10,
        stage: 'Inspecting day topics and cache'
      });
    }

    const roadmap = await Roadmap.findById(day.roadmapId).lean();
    if (!roadmap) {
      const error = new Error('Parent roadmap not found');
      error.statusCode = 404;
      throw error;
    }

    // Resolve topics assigned to this day
    const assignedKeys = day.topicKeys || [];
    let dayTopics = (roadmap.topics || []).filter(t => assignedKeys.includes(t.key));

    // Fallback if day has no assigned topics (e.g., revision or mock exam)
    if (dayTopics.length === 0) {
      dayTopics = (roadmap.topics || []).slice(0, 3);
    }

    const totalTopics = dayTopics.length;
    const finalDayResources = [];

    for (let tIdx = 0; tIdx < totalTopics; tIdx++) {
      const topic = dayTopics[tIdx];
      const level = roadmap.settings?.level || 'intermediate';
      const cacheKey = `topic:${topic.key}:${level}`;

      let selectedResources = [];

      // 2. Check 30-day Query Cache (Zero API spend if hit)
      if (!force) {
        const cached = await ResourceQueryCache.findOne({ key: cacheKey }).lean();
        if (cached && Array.isArray(cached.resourceIds) && cached.resourceIds.length > 0) {
          const cachedDocs = await Resource.find({
            _id: { $in: cached.resourceIds },
            isAlive: true
          }).lean();

          if (cachedDocs.length >= 2) {
            logger.info({ cacheKey, count: cachedDocs.length }, 'ResourceQueryCache hit — reusing cached resources');
            selectedResources = cachedDocs.map(doc => ({
              ...doc,
              finalScore: doc.qualityScore || 85,
              whyRecommended: getDefaultWhyRecommended(doc, topic.title)
            }));
          }
        }
      }

      // 3. Cache Miss: Query multi-source adapters in parallel
      if (selectedResources.length === 0) {
        if (jobId) {
          await updateJobProgress(jobId, {
            progress: Math.min(80, Math.round(15 + ((tIdx + 0.5) / totalTopics) * 60)),
            stage: `Curating video, encyclopedic, and research adapters for "${topic.title}"`
          });
        }

        const [ytResult, wikiResult, webResult, arxivResult] = await Promise.allSettled([
          searchYouTube(topic.title, 2),
          searchWikipedia(topic.title),
          searchWeb(topic.title, 2),
          searchArxiv(topic.title, 1)
        ]);

        const candidates = [];
        if (ytResult.status === 'fulfilled' && Array.isArray(ytResult.value)) {
          candidates.push(...ytResult.value);
        }
        if (wikiResult.status === 'fulfilled' && Array.isArray(wikiResult.value)) {
          candidates.push(...wikiResult.value);
        }
        if (webResult.status === 'fulfilled' && Array.isArray(webResult.value)) {
          candidates.push(...webResult.value);
        }
        if (arxivResult.status === 'fulfilled' && Array.isArray(arxivResult.value)) {
          candidates.push(...arxivResult.value);
        }

        // Deduplicate candidates by externalId & URL
        const seen = new Set();
        const uniqueCandidates = [];
        for (const c of candidates) {
          if (!c.url || seen.has(c.url) || seen.has(c.externalId)) continue;
          seen.add(c.url);
          seen.add(c.externalId);
          uniqueCandidates.push(c);
        }

        // 4. Two-Stage Ranking & LLM Reranking
        const candidateScores = new Map();

        // Calculate heuristic relevance & quality score
        for (const c of uniqueCandidates) {
          const relScore = computeLexicalRelevance(topic.title, c);
          const qualScore = c.qualityScore || 75;
          candidateScores.set(c.externalId, {
            relScore,
            qualScore,
            llmScore: 75,
            whyRecommended: getDefaultWhyRecommended(c, topic.title)
          });
        }

        // LLM Reranking pass
        if (uniqueCandidates.length > 0) {
          try {
            const rerankPrompt = PROMPTS['resources.rerank.v1'];
            const response = await llmGateway.generateObject({
              task: 'resource_reranking',
              prompt: rerankPrompt.template({
                topicTitle: topic.title,
                topicDescription: topic.description || '',
                candidates: uniqueCandidates.slice(0, 6)
              }),
              systemPrompt: rerankPrompt.system,
              schema: rerankResponseSchema,
              modelTier: 'fast',
              temperature: 0.2
            });

            const raw = response?.data || response?.object;
            const rankings = Array.isArray(raw)
              ? raw
              : (raw?.rankings || raw?.evaluations || []);
            if (Array.isArray(rankings)) {
              for (const r of rankings) {
                if (candidateScores.has(r.externalId)) {
                  const current = candidateScores.get(r.externalId);
                  current.llmScore = Math.max(0, Math.min(100, r.score || 75));
                  if (r.whyRecommended && r.whyRecommended.trim().length > 5) {
                    current.whyRecommended = r.whyRecommended.trim();
                  }
                }
              }
            }
          } catch (llmErr) {
            logger.warn({ err: llmErr.message, topic: topic.title }, 'LLM resource rerank skipped, using heuristic scoring');
          }
        }

        // Calculate final score formula: 0.4*rel + 0.2*qual + 0.4*llm
        const rankedCandidates = uniqueCandidates.map(c => {
          const scores = candidateScores.get(c.externalId) || {
            relScore: 70,
            qualScore: 75,
            llmScore: 75,
            whyRecommended: getDefaultWhyRecommended(c, topic.title)
          };
          const finalScore = Math.round(
            0.4 * scores.relScore + 0.2 * scores.qualScore + 0.4 * scores.llmScore
          );
          return {
            ...c,
            finalScore,
            whyRecommended: scores.whyRecommended
          };
        });

        // Diversity-based selection: Top 1-2 videos, 1 Wikipedia, 1 arXiv, 1 Web
        const videos = rankedCandidates.filter(c => c.source === 'youtube').sort((a, b) => b.finalScore - a.finalScore).slice(0, 2);
        const wikis = rankedCandidates.filter(c => c.source === 'wikipedia').sort((a, b) => b.finalScore - a.finalScore).slice(0, 1);
        const arxivs = rankedCandidates.filter(c => c.source === 'arxiv').sort((a, b) => b.finalScore - a.finalScore).slice(0, 1);
        const webs = rankedCandidates.filter(c => c.source === 'web').sort((a, b) => b.finalScore - a.finalScore).slice(0, 1);

        selectedResources = [...videos, ...wikis, ...arxivs, ...webs];
        if (selectedResources.length === 0) {
          selectedResources = rankedCandidates.slice(0, 4);
        }

        // 5. Upsert into Resource collection & save to 30-day cache
        const persistedResourceIds = [];
        for (const item of selectedResources) {
          const doc = await Resource.findOneAndUpdate(
            { source: item.source, externalId: item.externalId },
            {
              $set: {
                url: item.url,
                title: item.title,
                description: item.description,
                thumbnail: item.thumbnail || null,
                durationSec: item.durationSec || null,
                authorOrChannel: item.authorOrChannel || '',
                language: item.language || 'en',
                stats: item.stats || {},
                qualityScore: item.qualityScore || 80,
                lastCheckedAt: new Date(),
                isAlive: true
              }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          item._id = doc._id;
          persistedResourceIds.push(doc._id);
        }

        // Update 30-day cache
        await ResourceQueryCache.findOneAndUpdate(
          { key: cacheKey },
          {
            $set: {
              topicTitle: topic.title,
              level,
              resourceIds: persistedResourceIds,
              metadata: {
                rankedCount: persistedResourceIds.length,
                sourceBreakdown: selectedResources.reduce((acc, curr) => {
                  acc[curr.source] = (acc[curr.source] || 0) + 1;
                  return acc;
                }, {})
              },
              createdAt: new Date()
            }
          },
          { upsert: true, new: true }
        );
      }

      // 6. Persist DayResource records for this topic
      await DayResource.deleteMany({ dayId, topicKey: topic.key });

      for (let rIdx = 0; rIdx < selectedResources.length; rIdx++) {
        const res = selectedResources[rIdx];
        const dayRes = await DayResource.create({
          dayId,
          workspaceId: day.workspaceId,
          ownerId: day.ownerId,
          topicKey: topic.key,
          topicTitle: topic.title,
          resourceId: res._id,
          rank: rIdx + 1,
          finalScore: res.finalScore || 85,
          whyRecommended: res.whyRecommended || getDefaultWhyRecommended(res, topic.title),
          feedback: { helpful: null, watched: false }
        });
        finalDayResources.push(dayRes);
      }
    }

    // Mark Day resources status as ready
    day.content = day.content || {};
    day.content.resourcesStatus = 'ready';
    await day.save();

    if (jobId) {
      await updateJobProgress(jobId, { progress: 100, stage: 'Curated resources ready' });
      await completeJob(jobId, { count: finalDayResources.length });
    }

    // Populate and return
    return await DayResource.find({ dayId })
      .populate('resourceId')
      .sort({ rank: 1 })
      .lean();
  } catch (err) {
    logger.error({ err: err.message, dayId }, 'Failed to curate resources for day');
    day.content = day.content || {};
    day.content.resourcesStatus = 'failed';
    await day.save().catch(() => {});

    if (jobId) {
      await failJob(jobId, err).catch(() => {});
    }
    throw err;
  }
};

/**
 * Updates student feedback on a recommended day resource.
 */
export const saveResourceFeedback = async ({ dayResourceId, userId, helpful, watched }) => {
  const dayResource = await DayResource.findById(dayResourceId);
  if (!dayResource) {
    const error = new Error('Day resource not found');
    error.statusCode = 404;
    throw error;
  }

  if (dayResource.ownerId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You cannot modify this resource feedback');
    error.statusCode = 403;
    throw error;
  }

  dayResource.feedback = dayResource.feedback || {};
  if (helpful !== undefined) {
    dayResource.feedback.helpful = helpful;
  }
  if (watched !== undefined) {
    dayResource.feedback.watched = Boolean(watched);
  }
  dayResource.feedback.updatedAt = new Date();

  await dayResource.save();
  return await dayResource.populate('resourceId');
};
