import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
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
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 text-black font-semibold text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-all cursor-pointer group"
        >
          <Sparkles className="w-3.5 h-3.5 fill-black" />
          <span>AI Tutor</span>
        </button>
      )}

      {/* Slide-out Tutor Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-[#121215] border-l border-zinc-700 shadow-2xl flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="p-4 border-b border-zinc-700 bg-[#09090b] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>AI Tutor</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-700">
                    Socratic
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                title="New Chat"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-[#09090b] border-b border-zinc-700 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                disabled={isStreaming}
                onClick={() => handleSendMessage(p.prompt)}
                className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span className="text-xs font-mono">Loading context...</span>
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-300">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ask AI Tutor</h4>
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
                    className={`max-w-[88%] p-3 rounded-xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-white text-black font-medium'
                        : 'bg-[#18181b] text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-invert prose-xs max-w-none space-y-2">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            pre: ({ children }) => (
                              <pre className="p-3 rounded-lg bg-[#09090b] border border-zinc-700 overflow-x-auto text-[11px] font-mono text-zinc-200 my-2 leading-normal">
                                {children}
                              </pre>
                            ),
                            code: ({ className, children, ...props }) => {
                              const isBlock = /language-/.test(className || '') || (typeof children === 'string' && children.includes('\n'));
                              return isBlock ? (
                                <code className={`font-mono text-zinc-200 text-[11px] ${className || ''}`} {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono text-amber-300 text-[11px]" {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.content ? msg.content.replace(/\|[^\S\r\n]*\|[^\S\r\n]*/g, '|\n| ') : ''}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Citations Pill on Assistant Message */}
                  {!isUser && msg.citations?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-zinc-500 font-mono">Sources:</span>
                      {msg.citations.map((c, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => setSelectedCitation(c)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
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
                <div className="max-w-[88%] p-3 rounded-xl text-xs leading-relaxed bg-[#18181b] text-zinc-200 border border-zinc-700 shadow-sm space-y-2">
                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        pre: ({ children }) => (
                          <pre className="p-3 rounded-lg bg-[#09090b] border border-zinc-700 overflow-x-auto text-[11px] font-mono text-zinc-200 my-2 leading-normal">
                            {children}
                          </pre>
                        ),
                        code: ({ className, children, ...props }) => {
                          const isBlock = /language-/.test(className || '') || (typeof children === 'string' && children.includes('\n'));
                          return isBlock ? (
                            <code className={`font-mono text-zinc-200 text-[11px] ${className || ''}`} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono text-amber-300 text-[11px]" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {streamingReply ? streamingReply.replace(/\|[^\S\r\n]*\|[^\S\r\n]*/g, '|\n| ') : 'Thinking...'}
                    </ReactMarkdown>
                  </div>
                  <span className="inline-block w-1.5 h-3 bg-white animate-pulse align-middle ml-1" />
                </div>

                {streamingCitations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-zinc-500 font-mono">Sources:</span>
                    {streamingCitations.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-700 flex items-center gap-1"
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
            <div className="p-3 bg-[#18181b] border-t border-zinc-700 text-xs space-y-2">
              <div className="flex items-center justify-between text-zinc-200 font-bold">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{selectedCitation.materialName} (Page {selectedCitation.pageNumber})</span>
                </span>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="p-2.5 rounded-lg bg-[#09090b] border border-zinc-700 text-zinc-300 text-[11px] italic leading-relaxed max-h-24 overflow-y-auto">
                "{selectedCitation.snippet}"
              </p>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-[#09090b] border-t border-zinc-700">
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
                placeholder="Ask tutor an algorithm or concept question..."
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-zinc-500 focus:outline-none text-xs text-white placeholder-zinc-500 resize-none max-h-24 font-mono"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming}
                className="w-9 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black disabled:text-zinc-600 flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-[0_0_10px_rgba(245,158,11,0.2)]"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
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
