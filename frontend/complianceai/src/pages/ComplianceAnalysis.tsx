import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, ChevronDown,
  ArrowUpRight, MessageSquare, Filter,
  Loader2, FolderOpen, Eye, Download,
  Search, X, Trash2, ArrowLeft, History,
  BarChart3, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { documents, DocumentSummary, DocumentDetail, ArticleDetail } from '../lib/api';
import DocumentViewer from '../components/DocumentViewer';
import { yokRefToUrl } from '../lib/yokRef';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('ca_token') ?? ''}` };
}

function statusBadge(s: string) {
  if (s === 'Uyumlu')        return 'bg-success/10 text-success border-success/20';
  if (s === 'Kısmen Uyumlu') return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-danger/10 text-danger border-danger/20';
}
function statusIcon(s: string, size = 16) {
  if (s === 'Uyumlu')        return <CheckCircle2 size={size} className="text-success" />;
  if (s === 'Kısmen Uyumlu') return <AlertTriangle size={size} className="text-warning" />;
  return <AlertTriangle size={size} className="text-danger" />;
}
function scoreColor(n: number) {
  return n > 80 ? 'text-success' : n > 60 ? 'text-warning' : 'text-danger';
}
function barColor(n: number) {
  return n > 80 ? 'bg-success' : n > 60 ? 'bg-warning' : 'bg-danger';
}

// ── View: Document List ───────────────────────────────────────────────────────

interface ListViewProps {
  onSelect: (id: string) => void;
}

function ListView({ onSelect }: ListViewProps) {
  const navigate = useNavigate();
  const [docList, setDocList]         = useState<DocumentSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('Tümü');
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    documents.list()
      .then(setDocList)
      .catch(() => showNotification('Belgeler yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${name}" belgesini silmek istediğinizden emin misiniz?`)) return;
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/documents/${id}`, { method: 'DELETE', headers: authHeaders() });
      setDocList(prev => prev.filter(d => d.id !== id));
      showNotification('Belge silindi');
    } catch {
      showNotification('Silme işlemi başarısız');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = docList.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'Tümü' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total:   docList.length,
    uyumlu:  docList.filter(d => d.status === 'Uyumlu').length,
    kismen:  docList.filter(d => d.status === 'Kısmen Uyumlu').length,
    uyumsuz: docList.filter(d => d.status === 'Uyumsuz').length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[100] px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium">
            <CheckCircle2 size={18} className="text-success" /> {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input type="text" placeholder="Belge adı ara..."
            className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-72 outline-none focus:border-primary transition-all shadow-sm"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        <button onClick={() => navigate('/upload')}
          className="btn-primary flex items-center gap-2 self-start">
          <Plus size={16} /> Yeni Analiz
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Belge',   value: stats.total,   color: 'text-slate-900', bg: 'bg-slate-100',    icon: FileText },
          { label: 'Uyumlu',         value: stats.uyumlu,  color: 'text-success',   bg: 'bg-success/10',   icon: CheckCircle2 },
          { label: 'Kısmen Uyumlu',  value: stats.kismen,  color: 'text-warning',   bg: 'bg-warning/10',   icon: AlertTriangle },
          { label: 'Uyumsuz',        value: stats.uyumsuz, color: 'text-danger',    bg: 'bg-danger/10',    icon: AlertTriangle },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color} ${loading ? 'animate-pulse' : ''}`}>
                {loading ? '—' : s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {['Tümü', 'Uyumlu', 'Kısmen Uyumlu', 'Uyumsuz'].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all
              ${filterStatus === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-primary'}`}>
            {f}{f !== 'Tümü' && ` (${docList.filter(d => d.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Document table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-400">
            <FolderOpen size={40} className="opacity-50" />
            {docList.length === 0 ? (
              <>
                <p className="text-sm font-medium">Henüz analiz edilmiş belge yok</p>
                <button onClick={() => navigate('/upload')} className="btn-primary px-6 py-3 text-sm">
                  İlk Belgeyi Yükle
                </button>
              </>
            ) : (
              <p className="text-sm font-medium">Arama sonucu bulunamadı</p>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-50 bg-slate-50/50">
              {['', 'Belge Adı', 'Kategori', 'Uyum Skoru', 'Durum', 'Tarih', 'İşlem'].map((h, i) => (
                <div key={i} className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest
                  ${i === 0 ? 'col-span-1' : i === 1 ? 'col-span-3' : i === 2 ? 'col-span-2' :
                    i === 3 ? 'col-span-2' : i === 4 ? 'col-span-2' : i === 5 ? 'col-span-1' : 'col-span-1 text-right'}`}>
                  {h}
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-50">
              {filtered.map((doc, i) => (
                <motion.div key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  onClick={() => onSelect(doc.id)}>

                  {/* Icon */}
                  <div className="col-span-1">
                    <div className="w-9 h-9 bg-primary/5 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <FileText size={16} />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{doc.pipeline?.toUpperCase() ?? 'HYBRID'} · {doc.model ?? 'gpt-4o-mini'}</p>
                  </div>

                  {/* Category */}
                  <div className="col-span-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg">
                      {doc.category}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor(doc.complianceScore)}`}
                          style={{ width: `${doc.complianceScore}%` }} />
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${scoreColor(doc.complianceScore)}`}>
                        %{doc.complianceScore}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusBadge(doc.status)}`}>
                      {statusIcon(doc.status, 12)} {doc.status}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-1">
                    <p className="text-xs text-slate-400">
                      {new Date(doc.uploadDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onSelect(doc.id)} title="Analizi Gör"
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                      <Eye size={15} />
                    </button>
                    <button onClick={e => handleDelete(doc.id, doc.name, e)} title="Sil"
                      disabled={deletingId === doc.id}
                      className="p-2 text-slate-400 hover:text-danger hover:bg-danger/5 rounded-xl transition-all disabled:opacity-40">
                      {deletingId === doc.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
          <span>{filtered.length} belge gösteriliyor</span>
          <div className="flex items-center gap-2">
            <History size={13} />
            <span>Son güncelleme: {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── View: Analysis Detail ─────────────────────────────────────────────────────

interface DetailViewProps {
  docId: string;
  onBack: () => void;
}

function DetailView({ docId, onBack }: DetailViewProps) {
  const navigate = useNavigate();
  const [detail, setDetail]             = useState<DocumentDetail | null>(null);
  const [loading, setLoading]           = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ArticleDetail | null>(null);
  const [viewerOpen, setViewerOpen]     = useState(false);
  const [filterStatus, setFilterStatus] = useState<'Tümü' | 'Uyumlu' | 'Kısmen Uyumlu' | 'Uyumsuz'>('Tümü');

  useEffect(() => {
    setLoading(true);
    documents.get(docId)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [docId]);

  const filteredArticles = (detail?.articles ?? []).filter(a =>
    filterStatus === 'Tümü' || a.status === filterStatus
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="text-sm font-medium">Analiz yükleniyor...</p>
      </div>
    </div>
  );

  if (!detail) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* PDF Viewer Modal */}
      {viewerOpen && <DocumentViewer doc={detail} onClose={() => setViewerOpen(false)} />}

      {/* Back + Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary font-semibold px-3 py-2 rounded-xl hover:bg-primary/5 transition-all">
            <ArrowLeft size={16} /> Belgelere Dön
          </button>
          <span className="text-slate-200">|</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900 truncate max-w-xs">{detail.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Madde bazında YÖK uyum analizi</p>
          </div>
        </div>
        <div className="flex gap-3 self-start">
          <button onClick={() => setViewerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-primary transition-all">
            <Eye size={16} /> PDF İncele
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Uyum Skoru',   value: `%${detail.complianceScore}`, color: scoreColor(detail.complianceScore) },
          { label: 'Toplam Madde', value: String(detail.articleCount),  color: 'text-slate-900' },
          { label: 'Uyumsuz',      value: String(detail.articles.filter(a => a.status === 'Uyumsuz').length), color: 'text-danger' },
          { label: 'Pipeline',     value: (detail.pipeline ?? 'hybrid').toUpperCase(), color: 'text-primary' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Article list */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-400" />
            {(['Tümü', 'Uyumsuz', 'Kısmen Uyumlu', 'Uyumlu'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                  ${filterStatus === f ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {f}
              </button>
            ))}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-success opacity-50" />
              <p className="text-sm font-medium">Bu filtreyle eşleşen madde yok.</p>
            </div>
          ) : filteredArticles.map(art => (
            <motion.div key={art.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white border rounded-[24px] overflow-hidden transition-all cursor-pointer
                ${selectedArticle?.id === art.id ? 'border-primary shadow-xl shadow-primary/10' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}`}
              onClick={() => setSelectedArticle(selectedArticle?.id === art.id ? null : art)}>

              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {statusIcon(art.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {art.number && <span className="text-primary mr-2">{art.number}</span>}
                      {art.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      Benzerlik: %{Math.round(art.similarity * 100)}
                      {art.yokReference && (
                        <>
                          <span className="text-slate-200">·</span>
                          <a href={yokRefToUrl(art.yokReference)} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-primary hover:underline flex items-center gap-1 font-medium">
                            {art.yokReference} <ArrowUpRight size={10} />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-bold ${statusBadge(art.status)}`}>
                    {art.status}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${selectedArticle?.id === art.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              <AnimatePresence>
                {selectedArticle?.id === art.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 overflow-hidden">
                    <div className="p-6 space-y-5 bg-slate-50/50">
                      {art.text && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Taslak Metni</p>
                          <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-100">{art.text}</p>
                        </div>
                      )}
                      {art.yokText && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">YÖK Mevzuatı</p>
                            {art.yokReference && (
                              <a href={yokRefToUrl(art.yokReference)} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                                mevzuat.gov.tr'de Aç <ArrowUpRight size={10} />
                              </a>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed bg-slate-900 text-slate-300 p-4 rounded-xl border-l-4 border-primary">
                            {art.yokText}
                          </p>
                        </div>
                      )}
                      {art.reasoning?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Değerlendirme</p>
                          <ul className="space-y-2">
                            {art.reasoning.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {art.suggestion && art.status !== 'Uyumlu' && (
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Düzeltme Önerisi</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{art.suggestion}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Right panel */}
        <div className="space-y-6">

          {/* Score summary */}
          <div className="bg-slate-900 text-white p-8 rounded-[32px] space-y-6">
            <h3 className="text-lg font-bold">Analiz Özeti</h3>
            <div className="space-y-3">
              {[
                { label: 'Belge',    value: detail.name, cls: 'text-slate-300 truncate text-right max-w-[120px]' },
                { label: 'Model',    value: detail.model ?? 'gpt-4o-mini', cls: 'text-primary' },
                { label: 'Pipeline', value: (detail.pipeline ?? 'hybrid').toUpperCase(), cls: 'text-primary' },
                { label: 'Tarih',    value: new Date(detail.uploadDate).toLocaleDateString('tr-TR'), cls: 'text-slate-300' },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs gap-2">
                  <span className="text-slate-500 font-bold uppercase tracking-widest shrink-0">{s.label}</span>
                  <span className={`font-bold ${s.cls}`}>{s.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={detail.complianceScore > 80 ? '#22c55e' : detail.complianceScore > 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3" strokeDasharray={`${detail.complianceScore} 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">%{detail.complianceScore}</span>
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-white">{detail.status}</p>
                <p className="text-xs text-slate-500">{detail.articleCount} madde incelendi</p>
              </div>
            </div>

            <button onClick={() => setViewerOpen(true)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
              <Eye size={16} /> Belgeyi İncele
            </button>
          </div>

          {/* Distribution */}
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Madde Dağılımı</h3>
            {(['Uyumlu', 'Kısmen Uyumlu', 'Uyumsuz'] as const).map(s => {
              const count = detail.articles.filter(a => a.status === s).length;
              const pct   = detail.articleCount > 0 ? Math.round(count / detail.articleCount * 100) : 0;
              const color = s === 'Uyumlu' ? 'bg-success' : s === 'Kısmen Uyumlu' ? 'bg-warning' : 'bg-danger';
              return (
                <div key={s} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">{s}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${color}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            <button onClick={() => navigate('/portal')}
              className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 hover:border-primary hover:shadow-md transition-all text-left">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <MessageSquare size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Uzman AI'ya Sor</p>
                <p className="text-xs text-slate-400">YÖK mevzuatı hakkında soru sor</p>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 ml-auto" />
            </button>
            <button onClick={() => navigate('/reports')}
              className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 hover:border-primary hover:shadow-md transition-all text-left">
              <div className="w-9 h-9 bg-success/10 rounded-xl flex items-center justify-center">
                <BarChart3 size={16} className="text-success" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Raporlar</p>
                <p className="text-xs text-slate-400">Trend ve kategori grafikleri</p>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function ComplianceAnalysis() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return selectedId
    ? <DetailView docId={selectedId} onBack={() => setSelectedId(null)} />
    : <ListView onSelect={setSelectedId} />;
}
