import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Users, AlertCircle, Plus, CheckCheck, RefreshCw } from 'lucide-react';

export const Messages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetTeacherId = searchParams.get('teacherId');

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [showNewModal, setShowNewModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const chatBottomRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Check if directed from Browse Teachers page via ?teacherId=...
  useEffect(() => {
    if (targetTeacherId && user?.role === 'student' && conversations.length >= 0) {
      const existing = conversations.find(
        (c) => c.teacher?._id === targetTeacherId || c.teacher === targetTeacherId
      );
      if (existing) {
        setActiveConv(existing);
      } else {
        openNewChatModal();
      }
    }
  }, [targetTeacherId, conversations]);

  // Polling messages every 5 seconds
  useEffect(() => {
    if (!activeConv || String(activeConv.conversationId).startsWith('temp-')) return;
    fetchMessages(activeConv.conversationId, false);

    const interval = setInterval(() => {
      fetchMessages(activeConv.conversationId, false);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeConv]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoadingConvs(true);
      setError('');
      const res = await api.getConversations();
      const list = res.conversations || [];
      setConversations(list);

      if (list.length > 0 && !activeConv) {
        setActiveConv(list[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  };

  const fetchMessages = async (convId, showSpinner = true) => {
    if (!convId || String(convId).startsWith('temp-')) {
      setMessages([]);
      if (showSpinner) setLoadingMsgs(false);
      return;
    }

    try {
      if (showSpinner) setLoadingMsgs(true);
      const res = await api.getConversationMessages(convId);
      setMessages(res.messages || []);
    } catch (err) {
      // silent on polling error
    } finally {
      if (showSpinner) setLoadingMsgs(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConv) return;

    const recipient =
      user.role === 'student' ? activeConv.teacher?._id : activeConv.student?._id;

    try {
      setSending(true);
      const res = await api.sendMessage(recipient, newMessageText);
      setNewMessageText('');
      fetchMessages(res.conversationId, false);
      fetchConversations();
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const openNewChatModal = async () => {
    setShowNewModal(true);
    setLoadingContacts(true);
    try {
      if (user.role === 'student') {
        const res = await api.getMyTeachers();
        setContacts((res.teachers || []).map((m) => m.teacher));
      } else if (user.role === 'teacher') {
        const res = await api.getTeacherRoster();
        setContacts((res.roster || []).map((m) => m.student));
      }
    } catch (err) {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const startNewConversation = (contact) => {
    setShowNewModal(false);
    // Check if conversation exists
    const existing = conversations.find(
      (c) =>
        (user.role === 'student' && c.teacher?._id === contact._id) ||
        (user.role === 'teacher' && c.student?._id === contact._id)
    );

    if (existing) {
      setActiveConv(existing);
    } else {
      // Dummy transient object for new chat
      const tempConv = {
        conversationId: `temp-${Date.now()}`,
        student: user.role === 'student' ? user : contact,
        teacher: user.role === 'teacher' ? user : contact,
        lastMessageAt: new Date().toISOString()
      };
      setConversations([tempConv, ...conversations]);
      setActiveConv(tempConv);
      setMessages([]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Direct Messaging</h1>
            <p className="text-xs text-slate-400">Private communication between enrolled students and instructors</p>
          </div>
        </div>

        <button
          onClick={openNewChatModal}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-bold text-xs shadow-md flex items-center gap-2 hover:opacity-95 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[550px] shadow-2xl">
        {/* Sidebar */}
        <div className="border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-slate-950/40">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">Conversations</span>
            <button onClick={fetchConversations} className="text-slate-400 hover:text-white p-1" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
            {loadingConvs ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-slate-400">No active conversations.</p>
                <button
                  onClick={openNewChatModal}
                  className="text-xs font-bold text-emerald-400 hover:underline"
                >
                  Start a new chat
                </button>
              </div>
            ) : (
              conversations.map((conv) => {
                const partner = user.role === 'student' ? conv.teacher : conv.student;
                const isSelected = activeConv?.conversationId === conv.conversationId;

                return (
                  <button
                    key={conv.conversationId}
                    onClick={() => {
                      setActiveConv(conv);
                      fetchMessages(conv.conversationId);
                    }}
                    className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-slate-800/80 border-l-4 border-emerald-500' : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {partner?.avatarUrl ? (
                        <img src={`/${partner.avatarUrl}`} alt={partner.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{partner?.name ? partner.name[0].toUpperCase() : 'U'}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">{partner?.name || 'User'}</h4>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {conv.lastMessage?.content || 'Click to open conversation'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Thread */}
        <div className="md:col-span-2 flex flex-col justify-between bg-slate-900/30">
          {activeConv ? (
            <>
              {/* Partner Top Bar */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                {(() => {
                  const partner = user.role === 'student' ? activeConv.teacher : activeConv.student;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-900 flex items-center justify-center text-white text-xs font-bold">
                        {partner?.avatarUrl ? (
                          <img src={`/${partner.avatarUrl}`} alt={partner.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{partner?.name ? partner.name[0].toUpperCase() : 'U'}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{partner?.name}</h3>
                        <span className="text-[10px] font-mono text-slate-400 capitalize">{partner?.role}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[420px]">
                {loadingMsgs ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500">
                    No messages yet. Send a message to start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user.id || msg.senderId?._id === user.id;

                    return (
                      <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] p-3.5 rounded-2xl text-xs space-y-1 ${
                            isMe
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none shadow-md'
                              : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                          <div
                            className={`flex items-center gap-1 text-[9px] font-mono ${
                              isMe ? 'text-emerald-200 justify-end' : 'text-slate-400 justify-start'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && msg.readAt && <CheckCheck className="w-3 h-3 text-cyan-200" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Footer */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex items-center gap-3 bg-slate-950/60">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessageText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="p-16 text-center space-y-3 m-auto text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-700" />
              <p className="text-sm font-bold text-white">Select a Conversation</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Choose an existing chat from the left sidebar or start a new message with your enrolled teachers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Start New Conversation</span>
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white text-xs font-mono">
                ✕
              </button>
            </div>

            {loadingContacts ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <p>No eligible contacts found.</p>
                <p className="text-[11px] text-slate-500">
                  {user.role === 'student'
                    ? 'You must join a teacher’s class first to send them messages.'
                    : 'Students must join your class roster before you can message them.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {contacts.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => startNewConversation(c)}
                    className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-left flex items-center justify-between transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.name}</h4>
                      <p className="text-[10px] font-mono text-slate-400">{c.email}</p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                      Message →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
