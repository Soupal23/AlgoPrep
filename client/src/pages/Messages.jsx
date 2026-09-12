import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, Send, Users, AlertCircle, Plus, CheckCheck, Wifi, WifiOff } from 'lucide-react';

// How long after the last keystroke before we emit typing_stop
const TYPING_DEBOUNCE_MS = 3000;

export const Messages = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
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

  // Socket state
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});

  const chatBottomRef = useRef(null);
  const activeConvRef = useRef(null);       // stable ref to avoid stale closure in socket listeners
  const typingTimeoutRef = useRef(null);    // debounce timer for stop-typing
  const isTypingRef = useRef(false);        // track if we've already emitted typing_start

  // Keep ref in sync with state
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // ── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
  }, []);

  // ── Auto-open from Browse Teachers ──────────────────────────────────────
  useEffect(() => {
    if (targetTeacherId && user?.role === 'student' && conversations.length >= 0) {
      const existing = conversations.find(
        (c) => c.partner?._id === targetTeacherId || c.partner === targetTeacherId
      );
      if (existing) {
        setActiveConv(existing);
      } else {
        openNewChatModal();
      }
    }
  }, [targetTeacherId, conversations]);

  // ── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg) => {
      const currentConv = activeConvRef.current;
      if (currentConv && String(msg.conversationId) === String(currentConv.conversationId)) {
        // Append to current thread
        setMessages((prev) => {
          // Deduplicate in case the sender also gets the event
          if (prev.some((m) => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
        // Emit read receipt since the window is open
        socket.emit('mark_read', { conversationId: currentConv.conversationId });
      } else {
        // Increment unread badge for that conversation
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.conversationId]: (prev[msg.conversationId] || 0) + 1
        }));
      }
      // Bubble the last message preview up in the sidebar
      setConversations((prev) =>
        prev.map((c) =>
          String(c.conversationId) === String(msg.conversationId)
            ? { ...c, lastMessage: { content: msg.content, senderId: msg.senderId }, lastMessageAt: msg.createdAt }
            : c
        ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      );
    };

    const onPartnerTyping = ({ conversationId }) => {
      if (String(conversationId) === String(activeConvRef.current?.conversationId)) {
        setPartnerTyping(true);
      }
    };

    const onPartnerStoppedTyping = ({ conversationId }) => {
      if (String(conversationId) === String(activeConvRef.current?.conversationId)) {
        setPartnerTyping(false);
      }
    };

    const onMessagesRead = ({ conversationId, readBy }) => {
      if (String(conversationId) === String(activeConvRef.current?.conversationId)) {
        // Mark all sent messages as read
        setMessages((prev) =>
          prev.map((m) =>
            String(m.senderId) === user.id && !m.readAt
              ? { ...m, readAt: new Date().toISOString() }
              : m
          )
        );
      }
    };

    const onOnlineUsersList = (userList) => {
      if (Array.isArray(userList)) {
        setOnlineUsers(new Set(userList.map(String)));
      }
    };

    const onOnlineStatus = ({ userId, online }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
    };

    socket.on('new_message', onNewMessage);
    socket.on('partner_typing', onPartnerTyping);
    socket.on('partner_stopped_typing', onPartnerStoppedTyping);
    socket.on('messages_read', onMessagesRead);
    socket.on('online_status', onOnlineStatus);
    socket.on('online_users_list', onOnlineUsersList);

    // Request the latest list of online user IDs
    socket.emit('get_online_users');

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('partner_typing', onPartnerTyping);
      socket.off('partner_stopped_typing', onPartnerStoppedTyping);
      socket.off('messages_read', onMessagesRead);
      socket.off('online_status', onOnlineStatus);
      socket.off('online_users_list', onOnlineUsersList);
    };
  }, [socket, user]);

  // ── Join/leave conversation rooms ────────────────────────────────────────
  useEffect(() => {
    if (!socket || !activeConv) return;
    const convId = activeConv.conversationId;
    if (String(convId).startsWith('temp-')) return;

    socket.emit('join_conversation', { conversationId: convId });
    socket.emit('mark_read', { conversationId: convId });
    setPartnerTyping(false);
    // Clear unread badge
    setUnreadCounts((prev) => { const next = { ...prev }; delete next[convId]; return next; });

    return () => {
      socket.emit('leave_conversation', { conversationId: convId });
      // Stop typing if we were in the middle of composing
      if (isTypingRef.current) {
        socket.emit('typing_stop', { conversationId: convId });
        isTypingRef.current = false;
      }
    };
  }, [socket, activeConv]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // ── Auto-fetch messages when active conversation changes ──────────────────
  useEffect(() => {
    if (activeConv?.conversationId) {
      fetchMessages(activeConv.conversationId);
    }
  }, [activeConv?.conversationId]);

  // ── Data fetchers ────────────────────────────────────────────────────────
  const fetchConversations = async () => {
    try {
      setLoadingConvs(true);
      setError('');
      const res = await api.getConversations();
      const list = res.conversations || [];
      setConversations(list);
      if (list.length > 0 && !activeConvRef.current) {
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
      return;
    }
    try {
      if (showSpinner) setLoadingMsgs(true);
      const res = await api.getConversationMessages(convId);
      setMessages(res.messages || []);
    } catch {
      // silent
    } finally {
      if (showSpinner) setLoadingMsgs(false);
    }
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConv) return;

    const partner = getPartner(activeConv);
    const recipient = partner?._id || partner;

    // Stop typing immediately
    stopTyping();

    try {
      setSending(true);
      const res = await api.sendMessage(recipient, newMessageText);
      setNewMessageText('');
      // If socket is connected, new_message event will update the UI.
      // If not, fall back to a REST fetch.
      if (!isConnected) {
        fetchMessages(res.conversationId, false);
      }
      if (String(activeConv.conversationId).startsWith('temp-')) {
        // Upgrade temp conversation to real one
        fetchConversations();
      }
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // ── Typing indicator ─────────────────────────────────────────────────────
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current && socket && activeConvRef.current) {
      socket.emit('typing_stop', { conversationId: activeConvRef.current.conversationId });
      isTypingRef.current = false;
    }
  }, [socket]);

  const handleInputChange = (e) => {
    setNewMessageText(e.target.value);
    if (!socket || !activeConv || String(activeConv.conversationId).startsWith('temp-')) return;

    if (!isTypingRef.current) {
      socket.emit('typing_start', { conversationId: activeConv.conversationId });
      isTypingRef.current = true;
    }
    // Reset debounce timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_DEBOUNCE_MS);
  };

  // ── New chat modal ───────────────────────────────────────────────────────
  const openNewChatModal = async () => {
    setShowNewModal(true);
    setLoadingContacts(true);
    try {
      const res = await api.getMessageContacts();
      setContacts(res.contacts || []);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const startNewConversation = (contact) => {
    setShowNewModal(false);
    const existing = conversations.find(
      (c) => c.partner?._id === contact._id
    );
    if (existing) {
      setActiveConv(existing);
    } else {
      const tempConv = {
        conversationId: `temp-${Date.now()}`,
        partner: contact,
        participants: [user, contact],
        lastMessageAt: new Date().toISOString()
      };
      setConversations([tempConv, ...conversations]);
      setActiveConv(tempConv);
      setMessages([]);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getPartner = (conv) => conv?.partner;
  const isPartnerOnline = (conv) => {
    const partner = getPartner(conv);
    if (!partner) return false;
    const partnerId = String(partner._id || partner.id || partner);
    return onlineUsers.has(partnerId);
  };

  // ── Render ───────────────────────────────────────────────────────────────
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
            <p className="text-xs text-slate-400">Private communication between students, teachers, and admins</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Socket connection badge */}
          <span
            title={isConnected ? 'Real-time connected' : 'Connecting…'}
            className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border transition-colors ${
              isConnected
                ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live' : 'Offline'}
          </span>

          <button
            onClick={openNewChatModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-bold text-xs shadow-md flex items-center gap-2 hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
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
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
            {loadingConvs ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-slate-400">No active conversations.</p>
                <button onClick={openNewChatModal} className="text-xs font-bold text-emerald-400 hover:underline">
                  Start a new chat
                </button>
              </div>
            ) : (
              conversations.map((conv) => {
                const partner = getPartner(conv);
                const isSelected = activeConv?.conversationId === conv.conversationId;
                const online = isPartnerOnline(conv);
                const unread = unreadCounts[conv.conversationId] || 0;

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
                    {/* Avatar with online dot */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-900 flex items-center justify-center text-white text-sm font-bold">
                        {partner?.avatarUrl ? (
                          <img src={`/${partner.avatarUrl}`} alt={partner.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{partner?.name ? partner.name[0].toUpperCase() : 'U'}</span>
                        )}
                      </div>
                      {online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 block" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">{partner?.name || 'User'}</h4>
                        <div className="flex items-center gap-1.5">
                          {unread > 0 && (
                            <span className="text-[9px] font-bold bg-emerald-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                              {unread}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
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
                  const partner = getPartner(activeConv);
                  const online = isPartnerOnline(activeConv);
                  return (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-900 flex items-center justify-center text-white text-xs font-bold">
                          {partner?.avatarUrl ? (
                            <img src={`/${partner.avatarUrl}`} alt={partner.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{partner?.name ? partner.name[0].toUpperCase() : 'U'}</span>
                          )}
                        </div>
                        {online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 block" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{partner?.name}</h3>
                        <span className="text-[10px] font-mono text-slate-400 capitalize">
                          {online ? (
                            <span className="text-emerald-400">● Online</span>
                          ) : (
                            partner?.role
                          )}
                        </span>
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

                {/* Typing indicator bubble */}
                {partnerTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Input Footer */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex items-center gap-3 bg-slate-950/60">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={handleInputChange}
                  onBlur={stopTyping}
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
                Choose an existing chat from the left sidebar or start a new message.
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
                    ? "You must join a teacher's class first to send them messages."
                    : user.role === 'teacher'
                    ? 'Students must join your class roster, or admins must be active, before you can message them.'
                    : 'No active teachers found.'}
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
