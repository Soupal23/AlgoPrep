import { ChatSession } from '../models/ChatSession.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { Day } from '../models/Day.js';
import { Attempt } from '../models/Attempt.js';
import { ConceptMastery } from '../models/ConceptMastery.js';
import { DayResource } from '../models/DayResource.js';
import { retriever } from '../ai/retriever.js';
import { llmGateway } from '../ai/llmGateway.js';
import { PROMPTS } from '../ai/prompts/index.js';
import logger from '../utils/logger.js';

/**
 * Creates or retrieves an active chat session.
 */
export async function createOrGetChatSession({ workspaceId, ownerId, dayId = null, title = null }) {
  let session = null;
  if (dayId) {
    session = await ChatSession.findOne({ workspaceId, ownerId, dayId }).sort({ updatedAt: -1 });
  }

  if (!session) {
    session = await ChatSession.create({
      workspaceId,
      ownerId,
      dayId: dayId || null,
      title: title || (dayId ? 'Day Session Chat' : 'Study Notes Q&A')
    });
  }

  return session;
}

/**
 * Lists all chat sessions for a workspace and owner.
 */
export async function getChatSessions({ workspaceId, ownerId }) {
  return ChatSession.find({ workspaceId, ownerId })
    .sort({ updatedAt: -1 })
    .lean();
}

/**
 * Retrieves paginated messages for a session.
 */
export async function getChatMessages({ sessionId, ownerId, limit = 50 }) {
  const session = await ChatSession.findById(sessionId);
  if (!session) {
    const error = new Error('Chat session not found');
    error.statusCode = 404;
    throw error;
  }

  if (session.ownerId.toString() !== ownerId.toString()) {
    const error = new Error('Forbidden: You do not own this chat session');
    error.statusCode = 403;
    throw error;
  }

  return ChatMessage.find({ sessionId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
}

/**
 * Deletes a chat session and its messages.
 */
export async function deleteChatSession({ sessionId, ownerId }) {
  const session = await ChatSession.findById(sessionId);
  if (!session) {
    const error = new Error('Chat session not found');
    error.statusCode = 404;
    throw error;
  }

  if (session.ownerId.toString() !== ownerId.toString()) {
    const error = new Error('Forbidden: You do not own this chat session');
    error.statusCode = 403;
    throw error;
  }

  await ChatMessage.deleteMany({ sessionId });
  await ChatSession.findByIdAndDelete(sessionId);

  return { success: true };
}

/**
 * Guardrail check: Checks if student has an active in-progress test.
 * Automatically marks expired attempts as 'expired' so stale sessions never permanently block the student.
 */
export async function hasActiveTestAttempt(ownerId, workspaceId, dayId = null) {
  const query = {
    userId: ownerId,
    status: 'in-progress'
  };
  if (workspaceId) query.workspaceId = workspaceId;
  if (dayId) query.dayId = dayId;

  const activeAttempts = await Attempt.find(query).populate('testId').lean();
  if (!activeAttempts || activeAttempts.length === 0) return false;

  const now = Date.now();
  let hasLiveAttempt = false;

  for (const att of activeAttempts) {
    const timeLimitMinutes = att.testId?.timeLimitMinutes || 20;
    const elapsedMs = now - new Date(att.startedAt).getTime();
    const maxAllowedMs = (timeLimitMinutes + 1) * 60 * 1000;

    if (elapsedMs > maxAllowedMs) {
      // Auto-expire stale attempt in background
      await Attempt.updateOne(
        { _id: att._id },
        { status: 'expired', submittedAt: new Date(new Date(att.startedAt).getTime() + maxAllowedMs) }
      ).catch(() => {});
    } else {
      hasLiveAttempt = true;
    }
  }

  return hasLiveAttempt;
}

/**
 * Compacts conversation memory by updating ChatSession.summary.
 */
export async function compactConversationMemory(session) {
  try {
    const messages = await ChatMessage.find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    if (messages.length < 6) return;

    const promptObj = PROMPTS['tutor.summarize.v1'];
    const res = await llmGateway.generateText({
      task: 'chat_summarize',
      prompt: promptObj.template({
        existingSummary: session.summary || '',
        messages
      }),
      systemPrompt: promptObj.system,
      modelTier: 'fast',
      temperature: 0.2
    });

    if (res?.text) {
      session.summary = res.text.trim();
      await session.save();
      logger.info({ sessionId: session._id }, 'Chat session conversation memory compacted');
    }
  } catch (err) {
    logger.warn({ err: err.message, sessionId: session._id }, 'Failed to compact conversation memory');
  }
}

/**
 * Handles real-time streaming chat with RAG retrieval, guardrails, and citation tracking.
 */
export async function streamTutorChat({
  sessionId,
  ownerId,
  userMessage,
  onMeta,
  onChunk,
  onDone,
  onError
}) {
  try {
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      const error = new Error('Chat session not found');
      error.statusCode = 404;
      throw error;
    }

    if (session.ownerId.toString() !== ownerId.toString()) {
      const error = new Error('Forbidden: You do not own this chat session');
      error.statusCode = 403;
      throw error;
    }

    // 1. Record user message
    const userMsgDoc = await ChatMessage.create({
      sessionId,
      workspaceId: session.workspaceId,
      ownerId,
      role: 'user',
      content: userMessage
    });

    session.messageCount = (session.messageCount || 0) + 1;

    // Auto-update title from first message
    if (session.messageCount === 1 || session.title === 'New Study Chat') {
      const cleanTitle = userMessage.split(/\s+/).slice(0, 6).join(' ');
      session.title = cleanTitle.length > 3 ? `${cleanTitle}...` : 'Study Notes Q&A';
    }
    await session.save();

    // 2. Anti-Cheating Guardrail: verify if test is currently in-progress
    const inExam = await hasActiveTestAttempt(ownerId, session.workspaceId, session.dayId);
    if (inExam) {
      const refusal = `You currently have an active diagnostic examination in progress.

To protect your learning assessment and test score validity, I cannot answer questions, provide derivations, or reveal answers while your test timer is running.

Please complete and submit your test first—once submitted, we can review every concept and question in detail!`;

      if (onMeta) onMeta({ citations: [] });
      for (const char of refusal) {
        if (onChunk) onChunk(char);
      }

      const assistantMsg = await ChatMessage.create({
        sessionId,
        workspaceId: session.workspaceId,
        ownerId,
        role: 'assistant',
        content: refusal,
        citations: []
      });

      if (onDone) onDone({ messageId: assistantMsg._id, content: refusal, citations: [] });
      return;
    }

    // 3. Context gathering: Day info (if linked)
    let dayTitle = '';
    let dayObjectives = [];
    if (session.dayId) {
      const dayDoc = await Day.findById(session.dayId).lean();
      if (dayDoc) {
        dayTitle = dayDoc.title || `Day ${dayDoc.dayNumber}`;
        dayObjectives = dayDoc.objectives || [];
      }
    }

    // 4. Semantic RAG Retrieval over workspace materials
    let retrievedChunks = [];
    let citations = [];
    try {
      retrievedChunks = await retriever.retrieve(session.workspaceId, userMessage, 3);
      citations = retrievedChunks.map((c) => ({
        chunkId: c.chunkId || null,
        materialId: c.materialId || null,
        materialName: c.materialName || 'Course Notes',
        pageNumber: c.pageNumber || 1,
        snippet: (c.text || '').slice(0, 240).trim()
      }));
    } catch (retrievalErr) {
      logger.warn({ err: retrievalErr.message }, 'Tutor RAG retrieval skipped, proceeding with general knowledge');
    }

    // Send metadata (citations) to client immediately
    if (onMeta) {
      onMeta({ citations });
    }

    // 5. Query Weak Concepts if student is asking for revision/weak areas
    const queryLower = userMessage.toLowerCase();
    let weakConceptSignals = '';
    if (
      queryLower.includes('weak') ||
      queryLower.includes('revise') ||
      queryLower.includes('gap') ||
      queryLower.includes('struggle') ||
      queryLower.includes('what should i study')
    ) {
      try {
        const weakList = await ConceptMastery.find({
          workspaceId: session.workspaceId,
          ownerId,
          mastery: { $lt: 0.6 }
        })
          .sort({ mastery: 1 })
          .limit(5)
          .lean();

        if (weakList.length > 0) {
          weakConceptSignals = `\nStudent Weak Concepts (<60% Mastery):\n${weakList
            .map((w) => `- ${w.conceptTitle || w.conceptKey}: ${(w.mastery * 100).toFixed(0)}%`)
            .join('\n')}`;
        }
      } catch (e) {}
    }

    // 6. Recent Conversation History (last 8 messages)
    const recentHistory = await ChatMessage.find({ sessionId })
      .sort({ createdAt: -1 })
      .skip(1) // skip the user message just saved
      .limit(8)
      .lean();
    const rawRecentMessages = recentHistory.reverse();

    // Filter out anti-cheating refusal messages from LLM history so they never poison future responses
    const recentMessages = rawRecentMessages.filter(
      (m) =>
        !m.content?.toLowerCase().includes('diagnostic examination') &&
        !m.content?.toLowerCase().includes('complete and submit your test') &&
        !m.content?.toLowerCase().includes('test timer is running')
    );

    // 7. Assemble Prompt
    const promptDef = PROMPTS['tutor.chat.v1'];
    const promptText = promptDef.template({
      dayTitle,
      dayObjectives,
      conversationSummary: session.summary ? `${session.summary}${weakConceptSignals}` : weakConceptSignals,
      recentMessages,
      retrievedChunks,
      userQuery: userMessage
    });

    // 8. Stream Response from LLM
    let fullReply = '';
    try {
      const stream = llmGateway.streamText({
        task: 'tutor_chat',
        prompt: promptText,
        systemPrompt: promptDef.system,
        modelTier: 'default',
        temperature: 0.5
      });

      for await (const chunk of stream) {
        fullReply += chunk;
        if (onChunk) onChunk(chunk);
      }
    } catch (streamErr) {
      logger.error({ err: streamErr.message }, 'Stream generation failed, using fallback tutor response');
      if (!fullReply) {
        fullReply = `I'm analyzing your materials for "${userMessage}". While the streaming service recovers, let's explore this step-by-step: focus on the core invariants and definitions in your lecture notes.`;
        if (onChunk) onChunk(fullReply);
      }
    }

    // 9. Save assistant response
    const assistantMsg = await ChatMessage.create({
      sessionId,
      workspaceId: session.workspaceId,
      ownerId,
      role: 'assistant',
      content: fullReply,
      citations
    });

    session.messageCount = (session.messageCount || 0) + 1;
    await session.save();

    // 10. Check if memory compaction should trigger
    if (session.messageCount >= 12 && session.messageCount % 6 === 0) {
      setImmediate(() => {
        compactConversationMemory(session);
      });
    }

    if (onDone) {
      onDone({
        messageId: assistantMsg._id,
        content: fullReply,
        citations
      });
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Error in streamTutorChat');
    if (onError) onError(err);
  }
}
