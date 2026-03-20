import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, Search, Send, ArrowLeft, Phone, Bot, User as UserIcon,
  AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw
} from 'lucide-react';
import { AgentConversation, AgentMessage, ConversationStatus, HandoffRequest } from '../types';

// --- Fetch helper ---
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// --- Status helpers ---
const statusConfig: Record<ConversationStatus, { label: string; color: string; icon: typeof Bot }> = {
  active: { label: 'IA Ativo', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Bot },
  escalated: { label: 'Humano', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: UserIcon },
  closed: { label: 'Encerrado', color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400', icon: XCircle },
};

const StatusPill = ({ status }: { status: ConversationStatus }) => {
  const cfg = statusConfig[status] || statusConfig.active;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
};

// --- Conversation sidebar ---
const ConversationSidebar = ({
  conversations,
  selectedId,
  onSelect,
  loading,
  onRefresh,
  search,
  onSearchChange,
}: {
  conversations: AgentConversation[];
  selectedId: string | null;
  onSelect: (conv: AgentConversation) => void;
  loading: boolean;
  onRefresh: () => void;
  search: string;
  onSearchChange: (val: string) => void;
}) => {
  const filtered = conversations.filter((c) => {
    const name = c.patients?.name?.toLowerCase() ?? '';
    const phone = c.patient_phone ?? '';
    const q = search.toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <MessageCircle size={20} className="text-indigo-500" />
            Conversas
          </h3>
          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Nenhuma conversa encontrada</div>
        ) : (
          filtered.map((conv) => {
            const lastMsg = conv.agent_messages?.[0];
            const name = conv.patients?.name ?? conv.patient_phone;
            const isSelected = conv.id === selectedId;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate max-w-[160px]">
                    {name}
                  </span>
                  <StatusPill status={conv.status} />
                </div>
                {lastMsg && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {lastMsg.role === 'agent' ? '🤖 ' : lastMsg.role === 'human' ? '👤 ' : ''}
                    {lastMsg.content}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(conv.last_message_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// --- Chat view (center panel) ---
const ChatView = ({
  conversation,
  messages,
  loading,
  onSendMessage,
  onUpdateStatus,
  onBack,
}: {
  conversation: AgentConversation;
  messages: AgentMessage[];
  loading: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onUpdateStatus: (status: ConversationStatus) => Promise<void>;
  onBack: () => void;
}) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      await onSendMessage(text);
    } finally {
      setSending(false);
    }
  };

  const name = conversation.patients?.name ?? conversation.patient_phone;
  const isEscalated = conversation.status === 'escalated';
  const isClosed = conversation.status === 'closed';

  const roleStyles: Record<string, string> = {
    patient: 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 self-start',
    agent: 'bg-indigo-500 text-white self-end',
    human: 'bg-emerald-500 text-white self-end',
    system: 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 self-center text-xs italic',
  };

  const roleLabels: Record<string, string> = {
    patient: '👤 Paciente',
    agent: '🤖 IA',
    human: '👨‍⚕️ Atendente',
    system: '⚙️ Sistema',
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 dark:text-white truncate">{name}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone size={12} />
            {conversation.patient_phone}
            <StatusPill status={conversation.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation.status === 'active' && (
            <button
              onClick={() => onUpdateStatus('escalated')}
              className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
            >
              Assumir
            </button>
          )}
          {isEscalated && (
            <button
              onClick={() => onUpdateStatus('active')}
              className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              Devolver à IA
            </button>
          )}
          {!isClosed && (
            <button
              onClick={() => onUpdateStatus('closed')}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Encerrar
            </button>
          )}
          {isClosed && (
            <button
              onClick={() => onUpdateStatus('active')}
              className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              Reabrir
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            Carregando mensagens...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-12">Nenhuma mensagem ainda</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col max-w-[75%] ${msg.role === 'patient' ? '' : msg.role === 'system' ? 'mx-auto' : 'ml-auto'}`}>
              <span className="text-[10px] text-gray-400 mb-0.5 px-1">{roleLabels[msg.role] ?? msg.role}</span>
              <div className={`px-3 py-2 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words ${roleStyles[msg.role] ?? roleStyles.system}`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isClosed && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {!isEscalated && conversation.status === 'active' ? (
            <div className="text-center text-xs text-gray-400 py-2">
              <Bot size={14} className="inline mr-1" />
              IA está respondendo automaticamente. Clique &quot;Assumir&quot; para enviar mensagens manuais.
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="p-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Handoff Banner ---
const HandoffBanner = ({
  handoffs,
  onAccept,
  onReject,
}: {
  handoffs: HandoffRequest[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) => {
  if (handoffs.length === 0) return null;
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium mb-1">
        <AlertTriangle size={16} />
        {handoffs.length} solicitação{handoffs.length > 1 ? 'ões' : ''} de atendimento humano
      </div>
      {handoffs.map((h) => (
        <div key={h.id} className="flex items-center justify-between py-1 text-sm">
          <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">
            {h.agent_conversations?.patients?.name ?? h.agent_conversations?.patient_phone ?? 'Paciente'} — {h.reason}
          </span>
          <div className="flex gap-2">
            <button onClick={() => onAccept(h.id)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
              <CheckCircle size={12} className="inline mr-1" />Aceitar
            </button>
            <button onClick={() => onReject(h.id)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
              <XCircle size={12} className="inline mr-1" />Rejeitar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Main Atendimento Page ---
export const AtendimentoPage = () => {
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<AgentConversation | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [handoffs, setHandoffs] = useState<HandoffRequest[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');

  // Polling interval ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const data = await authFetch('/api/agent/conversations?limit=100');
      setConversations(data.conversations ?? []);
    } catch (err) {
      console.error('Fetch conversations error:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchHandoffs = useCallback(async () => {
    try {
      const data = await authFetch('/api/agent/handoffs');
      setHandoffs(data.handoffs ?? []);
    } catch (err) {
      console.error('Fetch handoffs error:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const data = await authFetch(`/api/agent/conversations/${convId}/messages?limit=100`);
      setMessages(data.messages ?? []);
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchConversations();
    fetchHandoffs();

    pollRef.current = setInterval(() => {
      fetchConversations();
      fetchHandoffs();
      if (selectedConv) {
        fetchMessages(selectedConv.id);
      }
    }, 10000); // Poll every 10s

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages when selecting a conversation
  const handleSelectConv = (conv: AgentConversation) => {
    setSelectedConv(conv);
    fetchMessages(conv.id);
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedConv) return;
    try {
      const data = await authFetch(`/api/agent/conversations/${selectedConv.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  const handleUpdateStatus = async (status: ConversationStatus) => {
    if (!selectedConv) return;
    try {
      await authFetch(`/api/agent/conversations/${selectedConv.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setSelectedConv({ ...selectedConv, status });
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConv.id ? { ...c, status } : c))
      );
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handleAcceptHandoff = async (handoffId: string) => {
    try {
      await authFetch('/api/agent/handoffs', {
        method: 'PUT',
        body: JSON.stringify({ handoffId, action: 'accept' }),
      });
      setHandoffs((prev) => prev.filter((h) => h.id !== handoffId));
      fetchConversations();
    } catch (err) {
      console.error('Accept handoff error:', err);
    }
  };

  const handleRejectHandoff = async (handoffId: string) => {
    try {
      await authFetch('/api/agent/handoffs', {
        method: 'PUT',
        body: JSON.stringify({ handoffId, action: 'reject' }),
      });
      setHandoffs((prev) => prev.filter((h) => h.id !== handoffId));
      fetchConversations();
    } catch (err) {
      console.error('Reject handoff error:', err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <HandoffBanner handoffs={handoffs} onAccept={handleAcceptHandoff} onReject={handleRejectHandoff} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — hidden on mobile when chat is open */}
        <div className={`${selectedConv ? 'hidden lg:flex' : 'flex'} flex-col`}>
          <ConversationSidebar
            conversations={conversations}
            selectedId={selectedConv?.id ?? null}
            onSelect={handleSelectConv}
            loading={loadingConvs}
            onRefresh={fetchConversations}
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        {/* Chat area */}
        {selectedConv ? (
          <ChatView
            conversation={selectedConv}
            messages={messages}
            loading={loadingMsgs}
            onSendMessage={handleSendMessage}
            onUpdateStatus={handleUpdateStatus}
            onBack={() => setSelectedConv(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center text-gray-400">
              <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha um paciente na lista ao lado para ver as mensagens</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
