import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../../services/api';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Loader2,
  FileText,
  Bot,
  User,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const AITutorDrawer = ({ workspaceId, dayId = null, dayTitle = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingReply, setStreamingReply] = useState('');
  const [streamingCitations, setStreamingCitations] = useState([]);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Suggested prompts
  const suggestedPrompts = [
    { label: 'Explain simply', prompt: 'Could you explain today’s main concept in intuitive, simple terms with a real-world analogy?' },
    { label: 'Code example', prompt: 'Can you show me a clear code implementation example illustrating the core algorithm or invariant?' },
    { label: 'What to revise?', prompt: 'What weak concepts or prerequisite topics should I revise to master today’s material?' },
    { label: 'Quick quiz', prompt: 'Ask me a quick conceptual question to test if I understand the fundamental trade-offs.' }
  ];

  // Load or create session when drawer opens
  useEffect(() => {
    if (isOpen && workspaceId && !activeSession) {
      initSession();
    }
  }, [isOpen, workspaceId, dayId]);

  // Scroll to bottom when messages or streaming text changes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingReply, isOpen]);

  const initSession = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.createChatSession(workspaceId, {
        dayId,
        title: dayTitle ? `Day: ${dayTitle}` : 'Study Notes Q&A'
      });
      if (res?.session) {
        setActiveSession(res.session);
        loadMessages(res.session._id);
      }
    } catch (err) {
      console.error('Failed to initialize tutor chat session:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      const res = await api.getChatMessages(sessionId);
      setMessages(res?.messages || []);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isStreaming) return;

    setInputMessage('');
    const userText = textToSend.trim();

    // Optimistically append user message to UI
    const tempUserMsg = {
      _id: `temp-${Date.now()}`,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    setIsStreaming(true);
    setStreamingReply('');
    setStreamingCitations([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let currentSessionId = activeSession?._id;
      if (!currentSessionId) {
        const newSessionRes = await api.createChatSession(workspaceId, {
          dayId,
          title: dayTitle ? `Day: ${dayTitle}` : 'Study Notes Q&A'
        });
        currentSessionId = newSessionRes.session._id;
        setActiveSession(newSessionRes.session);
      }

      await api.streamChatMessage(currentSessionId, userText, {
        signal: controller.signal,
        onMeta: (meta) => {
          if (meta?.citations) {
            setStreamingCitations(meta.citations);
          }
        },
        onChunk: (chunk) => {
          setStreamingReply((prev) => prev + chunk);
        },
        onDone: (result) => {
          setIsStreaming(false);
          setStreamingReply('');
          setStreamingCitations([]);
          // Add finalized assistant message
          setMessages((prev) => [
            ...prev,
            {
              _id: result.messageId || `done-${Date.now()}`,
              role: 'assistant',
              content: result.content,
              citations: result.citations || []
            }
          ]);
        },
        onError: (err) => {
          console.error('Stream error:', err);
          setIsStreaming(false);
          setStreamingReply('');
          setMessages((prev) => [
            ...prev,
            {
              _id: `err-${Date.now()}`,
              role: 'assistant',
              content: `⚠️ ${err.message || 'Error communicating with AI tutor.'}`
            }
          ]);
        }
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setIsStreaming(false);
        setStreamingReply('');
        setMessages((prev) => [
          ...prev,
          {
            _id: `err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Failed to reach tutor: ${err.message}`
          }
        ]);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = async () => {
    if (isStreaming) return;
    try {
      const res = await api.createChatSession(workspaceId, {
        dayId,
        title: dayTitle ? `Day: ${dayTitle}` : 'New Study Chat'
      });
      if (res?.session) {
        setActiveSession(res.session);
        setMessages([]);
        setStreamingReply('');
        setStreamingCitations([]);
      }
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  return (
    <>
      {/* Floating Trigger Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-xs shadow-2xl hover:scale-105 hover:shadow-indigo-500/25 transition-all duration-300 cursor-pointer group border border-white/20"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
          </div>
          <span className="tracking-wide">Ask AI Tutor</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Slide-out Tutor Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-[#120f1c] border-l border-[#383050] shadow-2xl flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="p-4 border-b border-[#251e35] bg-[#14111f]/90 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md relative">
                <Bot className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#14111f]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>AI Study Tutor</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                    Socratic
                  </span>
                </h3>
                <p className="text-[11px] text-[#9f99b0] truncate max-w-[240px]">
                  {dayTitle ? dayTitle : 'Grounded in course notes & slides'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                title="Start New Chat"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1c1729] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Tutor"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1c1729] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-[#181426] border-b border-[#251e35] overflow-x-auto no-scrollbar flex items-center gap-2">
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                disabled={isStreaming}
                onClick={() => handleSendMessage(p.prompt)}
                className="whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-medium bg-[#1c1729] hover:bg-purple-950/60 border border-[#383050] hover:border-purple-600 text-slate-300 hover:text-purple-200 transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs font-mono">Loading conversation context...</span>
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
                  <Lightbulb className="w-6 h-6 text-yellow-400" />
                </div>
                <h4 className="text-sm font-bold text-white">How can I help you study today?</h4>
                <p className="text-xs text-[#9f99b0] max-w-xs mx-auto leading-relaxed">
                  Ask questions about algorithms, step-by-step derivations, code implementations, or click a suggested prompt above!
                </p>
              </div>
            ) : null}

            {/* Render Messages */}
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg._id || i}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-purple-600 text-white rounded-tr-none shadow-md'
                        : 'bg-[#1c1729] text-slate-200 border border-[#383050] rounded-tl-none shadow-sm'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-invert prose-xs max-w-none space-y-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content ? msg.content.replace(/\|\s*\|\s*/g, '|\n| ') : ''}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Citations Pill on Assistant Message */}
                  {!isUser && msg.citations?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-[#9f99b0] font-mono">Sources:</span>
                      {msg.citations.map((c, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => setSelectedCitation(c)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#1c1729] hover:bg-indigo-950 text-indigo-300 border border-indigo-900 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[120px]">{c.materialName}</span>
                          {c.pageNumber && <span>p.{c.pageNumber}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Real-time Streaming Message */}
            {isStreaming && (
              <div className="flex flex-col items-start space-y-1.5">
                <div className="max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed bg-[#1c1729] text-slate-200 border border-indigo-500/40 rounded-tl-none shadow-sm space-y-2">
                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingReply ? streamingReply.replace(/\|\s*\|\s*/g, '|\n| ') : 'Thinking...'}
                    </ReactMarkdown>
                  </div>
                  <span className="inline-block w-2 h-3.5 bg-indigo-400 animate-pulse align-middle ml-1" />
                </div>

                {streamingCitations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-[#9f99b0] font-mono">Sources:</span>
                    {streamingCitations.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#1c1729] text-indigo-300 border border-indigo-900 flex items-center gap-1"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{c.materialName}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Citation Preview Modal */}
          {selectedCitation && (
            <div className="p-3 bg-[#181426] border-t border-[#383050] text-xs space-y-2">
              <div className="flex items-center justify-between text-indigo-300 font-bold">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{selectedCitation.materialName} (Page {selectedCitation.pageNumber})</span>
                </span>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="p-2.5 rounded-xl bg-[#14111f] border border-[#251e35] text-slate-300 text-[11px] italic leading-relaxed max-h-24 overflow-y-auto">
                "{selectedCitation.snippet}"
              </p>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-[#14111f] border-t border-[#251e35]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={inputMessage}
                disabled={isStreaming}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your tutor anything..."
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-[#1c1729] border border-[#383050] focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500 resize-none max-h-24"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#1c1729] text-white disabled:text-slate-600 flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-md"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AITutorDrawer;
