import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Bot, User, ExternalLink, Loader2,
  Scale, BookOpen, Sparkles, Clock,
  Plus, Trash2, MessageSquare, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { yokRefToUrl, yokSourceLabel } from '../lib/yokRef';
import { useLanguage } from '../contexts/LanguageContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Source { name: string; text: string; score: number; }

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatSession {
  session_id: string;
  title: string;
  last_at: string;
  count: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('ca_token') ?? ''}`,
  };
}

const SUGGESTIONS = [
  "Yatay geçiş için şartlar ve kontenjanlar nelerdir?",
  "Azami öğrenim süresi dolan öğrencinin hakları nelerdir?",
  "Lisansüstü tez savunması için gerekli şartlar nelerdir?",
  "Çift anadal programına kabul koşulları nelerdir?",
  "Disiplin cezası kararlarına nasıl itiraz edilir?",
  "Kayıt dondurma hangi hallerde mümkündür?",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function FormattedAnswer({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed text-slate-700 space-y-3">
      {text.split('\n\n').map((para, i) => {
        if (!para.trim()) return null;
        const formatted = para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) => {
          if (chunk.startsWith('**') && chunk.endsWith('**'))
            return <strong key={j} className="font-bold text-slate-900">{chunk.slice(2, -2)}</strong>;
          return <span key={j}>{chunk}</span>;
        });
        return <p key={i}>{formatted}</p>;
      })}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Şimdi';
  if (mins < 60) return `${mins}dk önce`;
  if (hours < 24) return `${hours}sa önce`;
  return `${days}g önce`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KnowledgePortal() {
  const [sessions, setSessions]       = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { language } = useLanguage();

  // ── Fetch session list ──────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/chat/sessions`, { headers: authHeaders() });
      if (res.ok) setSessions(await res.json());
    } finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── Load messages for a session ─────────────────────────────────────────────
  const loadSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setMessages([]);
    try {
      const res = await fetch(`${BASE}/api/chat/sessions/${sessionId}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data: Array<{ question: string; answer: string; createdAt: string }> = await res.json();
      const msgs: Message[] = [];
      data.forEach(m => {
        msgs.push({ id: `u-${m.createdAt}`, role: 'user', content: m.question, timestamp: new Date(m.createdAt) });
        msgs.push({ id: `a-${m.createdAt}`, role: 'assistant', content: m.answer, timestamp: new Date(m.createdAt) });
      });
      setMessages(msgs);
    } catch { /* silent */ }
  }, []);

  // ── Create new session ──────────────────────────────────────────────────────
  const newSession = useCallback(async () => {
    const res = await fetch(`${BASE}/api/chat/sessions`, { method: 'POST', headers: authHeaders() });
    const { session_id } = await res.json();
    setActiveSessionId(session_id);
    setMessages([]);
    textareaRef.current?.focus();
  }, []);

  // ── Delete session ──────────────────────────────────────────────────────────
  const deleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    await fetch(`${BASE}/api/chat/sessions/${sessionId}`, { method: 'DELETE', headers: authHeaders() });
    setSessions(prev => prev.filter(s => s.session_id !== sessionId));
    if (activeSessionId === sessionId) { setActiveSessionId(null); setMessages([]); }
    setDeletingId(null);
  }, [activeSessionId]);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    // Ensure we have a session
    let sessionId = activeSessionId;
    if (!sessionId) {
      const res = await fetch(`${BASE}/api/chat/sessions`, { method: 'POST', headers: authHeaders() });
      const d = await res.json();
      sessionId = d.session_id;
      setActiveSessionId(sessionId);
    }

    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }

    const userId  = `u-${Date.now()}`;
    const thinkId = `t-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: userId,  role: 'user',      content: question, timestamp: new Date() },
      { id: thinkId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true },
    ]);
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ question, session_id: sessionId, language }),
      });
      if (!res.ok) throw new Error();
      const data: { answer: string; sources: Source[]; session_id: string } = await res.json();

      setMessages(prev => prev.map(m =>
        m.id === thinkId
          ? { ...m, content: data.answer, sources: data.sources, isStreaming: false }
          : m
      ));

      // Refresh session list to show new/updated session
      const listRes = await fetch(`${BASE}/api/chat/sessions`, { headers: authHeaders() });
      if (listRes.ok) setSessions(await listRes.json());

    } catch {
      setMessages(prev => prev.map(m =>
        m.id === thinkId
          ? { ...m, content: language === 'en' ? 'Sorry, an error occurred. Please try again.' : 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', isStreaming: false }
          : m
      ));
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeSessionId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const hasMessages = messages.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-20rem)] -mx-8 overflow-hidden rounded-3xl border border-slate-100 shadow-sm bg-white">

      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col border-r border-slate-100 bg-slate-50/80 overflow-hidden shrink-0"
          >
            {/* New chat button */}
            <div className="p-4 border-b border-slate-100">
              <button onClick={newSession}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                <Plus size={16} /> Yeni Sohbet
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {loadingSessions ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-slate-300" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Henüz sohbet yok</p>
                </div>
              ) : (
                sessions.map(s => (
                  <motion.div key={s.session_id} layout
                    onClick={() => loadSession(s.session_id)}
                    className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all
                      ${activeSessionId === s.session_id
                        ? 'bg-primary/8 border border-primary/15'
                        : 'hover:bg-slate-100 border border-transparent'}`}>
                    <MessageSquare size={14} className={`mt-0.5 shrink-0 ${activeSessionId === s.session_id ? 'text-primary' : 'text-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium truncate leading-snug ${activeSessionId === s.session_id ? 'text-primary' : 'text-slate-700'}`}>
                        {s.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {s.count} mesaj
                      </p>
                    </div>
                    <button
                      onClick={e => deleteSession(s.session_id, e)}
                      disabled={deletingId === s.session_id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 hover:text-red-400 text-slate-300 shrink-0">
                      {deletingId === s.session_id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Trash2 size={12} />}
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
          <button onClick={() => setSidebarOpen(v => !v)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400">
            <ChevronLeft size={18} className={`transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </button>
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-primary" />
            <span className="font-bold text-slate-800 text-sm">YÖK Hukuki Danışman</span>
          </div>
          <span className="ml-auto text-[10px] text-slate-300 font-medium uppercase tracking-widest">RAG destekli · GPT-4o-mini</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Empty state */}
          {!hasMessages && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full gap-8 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <Scale size={28} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Nasıl yardımcı olabilirim?</h2>
                <p className="text-sm text-slate-400 max-w-sm">
                  YÖK mevzuatı hakkında sorularınızı sorun. Cevaplar gerçek kanun ve yönetmelik maddelerine dayandırılır.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button key={s}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => sendMessage(s)}
                    className="text-left text-xs px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:border-primary hover:text-primary hover:shadow-md transition-all font-medium flex items-start gap-2">
                    <Sparkles size={12} className="text-primary shrink-0 mt-0.5" />
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message bubbles */}
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <Scale size={15} className="text-primary" />
                  </div>
                )}

                <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-primary text-white px-5 py-3 rounded-2xl rounded-tr-md text-sm leading-relaxed font-medium shadow-lg shadow-primary/15">
                      {msg.content}
                    </div>
                  ) : msg.isStreaming ? (
                    <div className="bg-white border border-slate-100 px-5 py-4 rounded-2xl rounded-tl-md shadow-sm flex items-center gap-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400 font-medium">Mevzuat inceleniyor...</span>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 px-6 py-5 rounded-2xl rounded-tl-md shadow-sm space-y-4 w-full">
                      <FormattedAnswer text={msg.content} />

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <BookOpen size={10} /> YÖK Mevzuat Kaynakları
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((src, i) => (
                              <a key={i} href={yokRefToUrl(src.name)} target="_blank" rel="noreferrer"
                                title={src.text}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border border-primary/15 rounded-xl text-[11px] font-bold text-primary hover:bg-primary/10 transition-all group">
                                <Scale size={10} />
                                {yokSourceLabel(src.name)}
                                <ExternalLink size={9} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-300 flex items-center gap-1">
                        <Clock size={9} />
                        {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <User size={14} className="text-slate-500" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 px-6 pb-6 pt-3 border-t border-slate-100">
          {hasMessages && !loading && (
            <div className="flex gap-2 flex-wrap mb-3">
              {SUGGESTIONS.slice(0, 3).map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-[10px] px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-500 hover:border-primary hover:text-primary transition-all font-medium">
                  {s.length > 42 ? s.slice(0, 42) + '…' : s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-end bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-primary focus-within:shadow-md transition-all">
            <textarea ref={textareaRef} rows={1}
              placeholder="Mevzuat hakkında bir soru sorun... (Enter ile gönder)"
              className="flex-1 resize-none outline-none text-sm text-slate-700 placeholder:text-slate-400 leading-relaxed bg-transparent min-h-[36px] max-h-32"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md shadow-primary/20">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-300 mt-2">
            Yanıtlar YÖK mevzuatına dayandırılmaktadır · Resmi hukuki tavsiye yerine geçmez
          </p>
        </div>
      </div>
    </div>
  );
}
