import React, { useState, useEffect } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, ChevronDown,
  ArrowUpRight, MessageSquare, Filter,
  Loader2, FolderOpen, Eye, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { documents, DocumentSummary, DocumentDetail, ArticleDetail } from '../lib/api';
import DocumentViewer from '../components/DocumentViewer';
import { yokRefToUrl } from '../lib/yokRef';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(s: string) {
  if (s === 'Uyumlu')        return 'bg-success/10 text-success border-success/20';
  if (s === 'Kısmen Uyumlu') return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-danger/10 text-danger border-danger/20';
}

function statusIcon(s: string) {
  if (s === 'Uyumlu')        return <CheckCircle2 size={16} className="text-success" />;
  if (s === 'Kısmen Uyumlu') return <AlertTriangle size={16} className="text-warning" />;
  return <AlertTriangle size={16} className="text-danger" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ComplianceAnalysis() {
  const navigate = useNavigate();

  const [docList, setDocList]       = useState<DocumentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail]         = useState<DocumentDetail | null>(null);
  const [loadingList, setLoadingList]     = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleDetail | null>(null);
  const [viewerOpen, setViewerOpen]   = useState(false);
  const [filterStatus, setFilterStatus] = useState<'Tümü' | 'Uyumlu' | 'Kısmen Uyumlu' | 'Uyumsuz'>('Tümü');

  // Load document list
  useEffect(() => {
    documents.list()
      .then(list => {
        setDocList(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingList(false));
  }, []);

  // Load detail when selection changes
  useEffect(() => {
    if (!selectedId) return;
    setLoadingDetail(true);
    setDetail(null);
    setSelectedArticle(null);
    setViewerOpen(false);
    documents.get(selectedId)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const filteredArticles = (detail?.articles ?? []).filter(a =>
    filterStatus === 'Tümü' || a.status === filterStatus
  );

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!loadingList && docList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center">
          <FolderOpen size={36} className="text-slate-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Henüz analiz yok</h2>
          <p className="text-slate-400 mt-2 text-sm">Belge yükleyerek ilk uyum analizini başlatın.</p>
        </div>
        <button onClick={() => navigate('/upload')} className="btn-primary px-8 py-4">
          İlk Belgeyi Yükle
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* PDF Viewer Modal */}
      {viewerOpen && detail && (
        <DocumentViewer doc={detail} onClose={() => setViewerOpen(false)} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-medium tracking-tight text-slate-900">Uyum Analizi</h1>
          <p className="text-slate-500 mt-1 text-sm">Madde bazında YÖK uyum durumu ve düzeltme önerileri.</p>
        </div>
        <div className="flex gap-3 self-start">
          {detail && (
            <button
              onClick={() => setViewerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-primary transition-all"
            >
              <Eye size={16} /> PDF İncele
            </button>
          )}
          <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2">
            <FileText size={16} /> Yeni Analiz
          </button>
        </div>
      </div>

      {/* Belge Seçici */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belge:</span>
        {loadingList ? (
          <div className="h-9 w-48 bg-slate-100 rounded-xl animate-pulse" />
        ) : (
          <div className="relative">
            <select
              value={selectedId ?? ''}
              onChange={e => setSelectedId(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-primary transition-all cursor-pointer"
            >
              {docList.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* Filtre */}
        <div className="flex items-center gap-1 ml-auto">
          <Filter size={14} className="text-slate-400" />
          {(['Tümü', 'Uyumsuz', 'Kısmen Uyumlu', 'Uyumlu'] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                ${filterStatus === f ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Özet Kartlar */}
      {detail && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Uyum Skoru', value: `%${detail.complianceScore}`, color: detail.complianceScore > 80 ? 'text-success' : detail.complianceScore > 60 ? 'text-warning' : 'text-danger' },
            { label: 'Toplam Madde', value: String(detail.articleCount), color: 'text-slate-900' },
            { label: 'Uyumsuz', value: String(detail.articles.filter(a => a.status === 'Uyumsuz').length), color: 'text-danger' },
            { label: 'Pipeline', value: (detail.pipeline ?? 'hybrid').toUpperCase(), color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ana İçerik */}
      {loadingDetail ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <Loader2 size={36} className="animate-spin text-primary" />
            <p className="text-sm font-medium">Analiz detayları yükleniyor...</p>
          </div>
        </div>
      ) : detail ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Madde Listesi */}
          <div className="lg:col-span-2 space-y-3">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CheckCircle2 size={40} className="mx-auto mb-3 text-success opacity-50" />
                <p className="text-sm font-medium">Bu filtreyle eşleşen madde yok.</p>
              </div>
            ) : filteredArticles.map((art) => (
              <motion.div
                key={art.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white border rounded-[24px] overflow-hidden transition-all cursor-pointer
                  ${selectedArticle?.id === art.id ? 'border-primary shadow-xl shadow-primary/10' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}`}
                onClick={() => setSelectedArticle(selectedArticle?.id === art.id ? null : art)}
              >
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
                            <a
                              href={yokRefToUrl(art.yokReference)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-primary hover:underline flex items-center gap-1 font-medium"
                            >
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
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${selectedArticle?.id === art.id ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Açılır Detay */}
                <AnimatePresence>
                  {selectedArticle?.id === art.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 overflow-hidden"
                    >
                      <div className="p-6 space-y-5 bg-slate-50/50">
                        {art.text && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Taslak Metni</p>
                            <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-100">
                              {art.text}
                            </p>
                          </div>
                        )}
                        {art.yokText && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">YÖK Mevzuatı</p>
                              {art.yokReference && (
                                <a
                                  href={yokRefToUrl(art.yokReference)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                                >
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

          {/* Sağ Panel */}
          <div className="space-y-6">
            {/* Özet */}
            <div className="bg-slate-900 text-white p-8 rounded-[32px] space-y-6">
              <h3 className="text-lg font-bold">Analiz Özeti</h3>
              <div className="space-y-3">
                {[
                  { label: 'Belge', value: detail.name, cls: 'text-slate-300 truncate text-right max-w-[120px]' },
                  { label: 'Model', value: detail.model ?? 'gpt-4o-mini', cls: 'text-primary' },
                  { label: 'Pipeline', value: (detail.pipeline ?? 'hybrid').toUpperCase(), cls: 'text-primary' },
                  { label: 'Tarih', value: new Date(detail.uploadDate).toLocaleDateString('tr-TR'), cls: 'text-slate-300' },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-xs gap-2">
                    <span className="text-slate-500 font-bold uppercase tracking-widest shrink-0">{s.label}</span>
                    <span className={`font-bold ${s.cls}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Score ring */}
              <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={detail.complianceScore > 80 ? '#22c55e' : detail.complianceScore > 60 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${detail.complianceScore} 100`}
                      strokeLinecap="round"
                    />
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

              {/* PDF görüntüle butonu */}
              <button
                onClick={() => setViewerOpen(true)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Eye size={16} /> Belgeyi İncele
              </button>
            </div>

            {/* Madde Dağılımı */}
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
                      <span className="text-slate-400">{count} madde ({pct}%)</span>
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

            {/* Hızlı erişim */}
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
                  <Download size={16} className="text-success" />
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
      ) : null}
    </div>
  );
}
