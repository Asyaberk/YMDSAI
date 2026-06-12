import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, ChevronDown,
  ArrowUpRight, MessageSquare, Filter,
  Loader2, FolderOpen, Eye, Download,
  Search, X, Trash2, ArrowLeft, History,
  BarChart3, Plus, MinusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { documents, DocumentSummary, DocumentDetail, ArticleDetail } from '../lib/api';
import DocumentViewer from '../components/DocumentViewer';
import { yokRefToUrl } from '../lib/yokRef';
import { useLanguage } from '../contexts/LanguageContext';

// ── Translations ──────────────────────────────────────────────────────────────

const copy = {
  tr: {
    // ListView
    searchPlaceholder: 'Belge adı ara...',
    newAnalysis: 'Yeni Analiz',
    statLabels: ['Toplam Belge', 'Uyumlu', 'Kısmen Uyumlu', 'Uyumsuz'],
    filterAll: 'Tümü',
    noDocsYet: 'Henüz analiz edilmiş belge yok',
    uploadFirst: 'İlk Belgeyi Yükle',
    noSearchResult: 'Arama sonucu bulunamadı',
    tableHeaders: ['', 'Belge Adı', 'Kategori', 'Uyum Skoru', 'Durum', 'Tarih', 'İşlem'],
    viewTooltip: 'Analizi Gör',
    deleteTooltip: 'Sil',
    docsShown: (n: number) => `${n} belge gösteriliyor`,
    lastUpdated: 'Son güncelleme:',
    deleteConfirm: (name: string) => `"${name}" belgesini silmek istediğinizden emin misiniz?`,
    deleted: 'Belge silindi',
    deleteError: 'Silme işlemi başarısız',
    loadError: 'Belgeler yüklenemedi',
    // DetailView
    backToList: 'Belgelere Dön',
    detailSubtitle: 'Madde bazında YÖK uyum analizi',
    viewPdf: 'PDF İncele',
    complianceLabel: 'UYUM',
    scoreCalcLabel: 'Bu skor nasıl hesaplandı?',
    scoreDesc: (total: number, scorable: number) =>
      `Belgenizin ${total} maddesinden ${scorable} tanesi YÖK mevzuatıyla karşılaştırıldı.`,
    outOfScope: (n: number) => `${n} madde YÖK kapsamı dışında, skora dahil edilmedi.`,
    pointingText: 'Uyumlu maddeler',
    partialPoints: ', kısmen uyumlu maddeler',
    nonPoints: ', uyumsuz maddeler',
    pointedEnd: 'puanlandı.',
    viewAll: 'Tümünü Gör',
    distToFull: "%100'e kalan",
    articlesNeedFix: (n: number) => `${n} madde düzeltilmeli`,
    problemHeader: (n: number) => `Düzeltilmesi Gereken ${n} Madde`,
    clickDetail: 'Tıklayarak detay görebilirsiniz',
    filterLabel: 'Filtre',
    noArticleMatch: 'Bu filtreyle eşleşen madde yok.',
    showAllArticles: 'Tüm maddeleri gör',
    // Similarity labels (kept Turkish since these describe content quality)
    simHigh: 'Yüksek örtüşme',
    simMid: 'Orta örtüşme',
    simLow: 'Düşük örtüşme',
    // Article section labels (UI labels only — content stays Turkish)
    docText: 'Belgenizdeki Metin',
    yokText: 'YÖK Mevzuatı',
    goToRef: 'Dayanak Mevzuata Git',
    reasoning: 'Değerlendirme Gerekçesi',
    suggestion: 'Düzeltme Önerisi',
    // Status explanations
    statusCompliant: '✅ Bu madde uyumlu',
    statusPartial: '⚠️ Kısmen uyumlu — revizyon önerilir',
    statusOutOfScope: '⊖ Kapsam Dışı — YÖK bu konuyu düzenlemiyor',
    statusNonCompliant: '❌ Uyumsuz — düzeltme gerekiyor',
    overlapPrefix: 'YÖK mevzuatıyla anlam örtüşmesi:',
    overlapOutScope: ' Bu madde üniversitenin kendi takdirine bırakılan bir alanı düzenliyor.',
    overlapHigh: ' Madde büyük ölçüde YÖK gereklilikleriyle örtüşüyor.',
    overlapMid: ' Madde kısmen uyumlu; eksik veya çelişkili hükümler var.',
    overlapLow: ' Madde YÖK mevzuatıyla önemli ölçüde çelişiyor veya karşılanmıyor.',
    // Breakdown panel
    breakdownTitle: 'Uyum Dağılımı',
    scoreFormula: 'Skor formülü:',
    articleUnit: 'madde',
    viewInPdf: "Belgeyi PDF'te İncele",
    askAI: 'Uzman AI\'ya Sor',
    askAIDesc: 'Bu maddeler hakkında soru sor',
  },
  en: {
    // ListView
    searchPlaceholder: 'Search document name...',
    newAnalysis: 'New Analysis',
    statLabels: ['Total Documents', 'Compliant', 'Partially Compliant', 'Non-Compliant'],
    filterAll: 'Tümü', // Keep Turkish for backend filter matching
    noDocsYet: 'No analysed documents yet',
    uploadFirst: 'Upload First Document',
    noSearchResult: 'No search results found',
    tableHeaders: ['', 'Document Name', 'Category', 'Compliance Score', 'Status', 'Date', 'Action'],
    viewTooltip: 'View Analysis',
    deleteTooltip: 'Delete',
    docsShown: (n: number) => `${n} documents shown`,
    lastUpdated: 'Last updated:',
    deleteConfirm: (name: string) => `Are you sure you want to delete "${name}"?`,
    deleted: 'Document deleted',
    deleteError: 'Delete operation failed',
    loadError: 'Could not load documents',
    // DetailView
    backToList: 'Back to Documents',
    detailSubtitle: 'Article-level YÖK compliance analysis',
    viewPdf: 'View PDF',
    complianceLabel: 'COMPLIANCE',
    scoreCalcLabel: 'How was this score calculated?',
    scoreDesc: (total: number, scorable: number) =>
      `${scorable} out of ${total} articles in your document were compared against YÖK regulations.`,
    outOfScope: (n: number) => `${n} articles are outside YÖK scope and were excluded from the score.`,
    pointingText: 'Compliant articles scored',
    partialPoints: ', partially compliant articles scored',
    nonPoints: ', non-compliant articles scored',
    pointedEnd: '.',
    viewAll: 'View All',
    distToFull: 'Distance to 100%',
    articlesNeedFix: (n: number) => `${n} articles need correction`,
    problemHeader: (n: number) => `${n} Articles Requiring Correction`,
    clickDetail: 'Click to see details',
    filterLabel: 'Filter',
    noArticleMatch: 'No articles match this filter.',
    showAllArticles: 'Show all articles',
    // Similarity labels
    simHigh: 'High overlap',
    simMid: 'Medium overlap',
    simLow: 'Low overlap',
    // Article section labels
    docText: 'Text in Your Document',
    yokText: 'YÖK Regulation',
    goToRef: 'Go to Source Regulation',
    reasoning: 'Assessment Reasoning',
    suggestion: 'Correction Suggestion',
    // Status explanations
    statusCompliant: '✅ This article is compliant',
    statusPartial: '⚠️ Partially compliant — revision recommended',
    statusOutOfScope: '⊖ Out of Scope — YÖK does not regulate this topic',
    statusNonCompliant: '❌ Non-compliant — correction required',
    overlapPrefix: 'Semantic overlap with YÖK regulations:',
    overlapOutScope: ' This article regulates an area left to the university\'s own discretion.',
    overlapHigh: ' The article largely aligns with YÖK requirements.',
    overlapMid: ' The article is partially compliant; there are missing or conflicting provisions.',
    overlapLow: ' The article significantly conflicts with or fails to meet YÖK regulations.',
    // Breakdown panel
    breakdownTitle: 'Compliance Breakdown',
    scoreFormula: 'Score formula:',
    articleUnit: 'articles',
    viewInPdf: 'View Document in PDF',
    askAI: 'Ask Expert AI',
    askAIDesc: 'Ask questions about these articles',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('ca_token') ?? ''}` };
}

function statusBadge(s: string) {
  if (s === 'Uyumlu')        return 'bg-success/10 text-success border-success/20';
  if (s === 'Kısmen Uyumlu') return 'bg-warning/10 text-warning border-warning/20';
  if (s === 'Kapsam Dışı')   return 'bg-slate-100 text-slate-500 border-slate-200';
  return 'bg-danger/10 text-danger border-danger/20';
}
function statusIcon(s: string, size = 16) {
  if (s === 'Uyumlu')        return <CheckCircle2 size={size} className="text-success" />;
  if (s === 'Kısmen Uyumlu') return <AlertTriangle size={size} className="text-warning" />;
  if (s === 'Kapsam Dışı')   return <MinusCircle size={size} className="text-slate-400" />;
  return <AlertTriangle size={size} className="text-danger" />;
}
function scoreColor(n: number) {
  return n > 80 ? 'text-success' : n > 60 ? 'text-warning' : 'text-danger';
}
function barColor(n: number) {
  return n > 80 ? 'bg-success' : n > 60 ? 'bg-warning' : 'bg-danger';
}

// ── View: Document List ───────────────────────────────────────────────────────

interface ListViewProps { onSelect: (id: string) => void; }

function ListView({ onSelect }: ListViewProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const c = copy[language];

  const [docList, setDocList]           = useState<DocumentSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterStatus, setFilterStatus] = useState('Tümü'); // Always Turkish for backend matching
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    documents.list()
      .then(setDocList)
      .catch(() => showNotification(c.loadError))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(c.deleteConfirm(name))) return;
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/documents/${id}`, { method: 'DELETE', headers: authHeaders() });
      setDocList(prev => prev.filter(d => d.id !== id));
      showNotification(c.deleted);
    } catch {
      showNotification(c.deleteError);
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

  // Filter chips: display label differs by language, but internal value stays Turkish
  const filterChips = [
    { value: 'Tümü', label: c.filterAll },
    { value: 'Uyumlu', label: 'Uyumlu' },
    { value: 'Kısmen Uyumlu', label: 'Kısmen Uyumlu' },
    { value: 'Uyumsuz', label: 'Uyumsuz' },
  ];

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
          <input type="text" placeholder={c.searchPlaceholder}
            className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-72 outline-none focus:border-primary transition-all shadow-sm"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2 self-start">
          <Plus size={16} /> {c.newAnalysis}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: c.statLabels[0], value: stats.total,   color: 'text-slate-900', bg: 'bg-slate-100',  icon: FileText },
          { label: c.statLabels[1], value: stats.uyumlu,  color: 'text-success',   bg: 'bg-success/10', icon: CheckCircle2 },
          { label: c.statLabels[2], value: stats.kismen,  color: 'text-warning',   bg: 'bg-warning/10', icon: AlertTriangle },
          { label: c.statLabels[3], value: stats.uyumsuz, color: 'text-danger',    bg: 'bg-danger/10',  icon: AlertTriangle },
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
        {filterChips.map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all
              ${filterStatus === f.value ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-primary'}`}>
            {f.label}{f.value !== 'Tümü' && ` (${docList.filter(d => d.status === f.value).length})`}
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
                <p className="text-sm font-medium">{c.noDocsYet}</p>
                <button onClick={() => navigate('/upload')} className="btn-primary px-6 py-3 text-sm">
                  {c.uploadFirst}
                </button>
              </>
            ) : (
              <p className="text-sm font-medium">{c.noSearchResult}</p>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-50 bg-slate-50/50">
              {c.tableHeaders.map((h, i) => (
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

                  <div className="col-span-1">
                    <div className="w-9 h-9 bg-primary/5 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <FileText size={16} />
                    </div>
                  </div>

                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{doc.pipeline?.toUpperCase() ?? 'HYBRID'} · {doc.model ?? 'gpt-4o-mini'}</p>
                  </div>

                  <div className="col-span-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg">{doc.category}</span>
                  </div>

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

                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusBadge(doc.status)}`}>
                      {statusIcon(doc.status, 12)} {doc.status}
                    </span>
                  </div>

                  <div className="col-span-1">
                    <p className="text-xs text-slate-400">
                      {new Date(doc.uploadDate).toLocaleDateString(language === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  <div className="col-span-1 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onSelect(doc.id)} title={c.viewTooltip}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                      <Eye size={15} />
                    </button>
                    <button onClick={e => handleDelete(doc.id, doc.name, e)} title={c.deleteTooltip}
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
          <span>{c.docsShown(filtered.length)}</span>
          <div className="flex items-center gap-2">
            <History size={13} />
            <span>{c.lastUpdated} {new Date().toLocaleTimeString(language === 'en' ? 'en-GB' : 'tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── View: Analysis Detail ─────────────────────────────────────────────────────

interface DetailViewProps { docId: string; onBack: () => void; }

function DetailView({ docId, onBack }: DetailViewProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const c = copy[language];

  const [detail, setDetail]                     = useState<DocumentDetail | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [selectedArticle, setSelectedArticle]   = useState<ArticleDetail | null>(null);
  const [viewerOpen, setViewerOpen]             = useState(false);
  const [filterStatus, setFilterStatus]         = useState<'Tümü' | 'Uyumlu' | 'Kısmen Uyumlu' | 'Uyumsuz' | 'Kapsam Dışı'>('Tümü');

  useEffect(() => {
    setLoading(true);
    setFilterStatus('Tümü');
    documents.get(docId)
      .then(d => { setDetail(d); })
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
        <p className="text-sm font-medium">
          {language === 'en' ? 'Loading analysis...' : 'Analiz yükleniyor...'}
        </p>
      </div>
    </div>
  );

  if (!detail) return null;

  const uyumlu   = detail.articles.filter(a => a.status === 'Uyumlu').length;
  const kismen   = detail.articles.filter(a => a.status === 'Kısmen Uyumlu').length;
  const uyumsuz  = detail.articles.filter(a => a.status === 'Uyumsuz').length;
  const kapsam   = detail.articles.filter(a => a.status === 'Kapsam Dışı').length;
  const scorable = detail.articles.length - kapsam;
  const total    = detail.articleCount || detail.articles.length;

  const problemArticles = detail.articles.filter(a =>
    a.status === 'Uyumsuz' || a.status === 'Kısmen Uyumlu'
  );

  // Filter chips with Turkish internal values
  const filterChips = [
    { value: 'Tümü' as const,          label: language === 'en' ? 'All' : 'Tümü',           count: total    },
    { value: 'Uyumsuz' as const,       label: 'Uyumsuz',                                    count: uyumsuz  },
    { value: 'Kısmen Uyumlu' as const, label: 'Kısmen Uyumlu',                              count: kismen   },
    { value: 'Uyumlu' as const,        label: 'Uyumlu',                                     count: uyumlu   },
    { value: 'Kapsam Dışı' as const,   label: language === 'en' ? 'Out of Scope' : 'Kapsam Dışı', count: kapsam },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* PDF Viewer Modal */}
      {viewerOpen && <DocumentViewer doc={detail} onClose={() => setViewerOpen(false)} />}

      {/* Back + Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary font-semibold px-3 py-2 rounded-xl hover:bg-primary/5 transition-all">
            <ArrowLeft size={16} /> {c.backToList}
          </button>
          <span className="text-slate-200">|</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900 truncate max-w-xs">{detail.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {c.detailSubtitle} · {new Date(detail.uploadDate).toLocaleDateString(language === 'en' ? 'en-GB' : 'tr-TR')}
            </p>
          </div>
        </div>
        <button onClick={() => setViewerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-primary transition-all self-start">
          <Eye size={16} /> {c.viewPdf}
        </button>
      </div>

      {/* Score Summary */}
      <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-5
        ${detail.complianceScore > 80 ? 'bg-success/5 border-success/20' :
          detail.complianceScore > 60 ? 'bg-warning/5 border-warning/20' :
          'bg-danger/5 border-danger/20'}`}>

        <div className="relative w-20 h-20 shrink-0 mx-auto sm:mx-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke={detail.complianceScore > 80 ? '#22c55e' : detail.complianceScore > 60 ? '#f59e0b' : '#ef4444'}
              strokeWidth="3" strokeDasharray={`${detail.complianceScore} 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${scoreColor(detail.complianceScore)}`}>%{detail.complianceScore}</span>
            <span className="text-[9px] text-slate-400 font-bold">{c.complianceLabel}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-base font-bold ${detail.complianceScore > 80 ? 'text-success' : detail.complianceScore > 60 ? 'text-warning' : 'text-danger'}`}>
              {detail.status}
            </span>
            <span className="text-slate-300">—</span>
            <span className="text-sm text-slate-500">{c.scoreCalcLabel}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            {c.scoreDesc(total, scorable)}
            {kapsam > 0 && <span className="text-slate-400"> ({c.outOfScope(kapsam)})</span>}
            {' '}{c.pointingText} <strong className="text-success">%100</strong>
            {c.partialPoints} <strong className="text-warning">%60</strong>
            {c.nonPoints} <strong className="text-danger">%0</strong>{c.pointedEnd}
          </p>
          <div className="flex gap-4 flex-wrap">
            <button onClick={() => setFilterStatus('Uyumlu')}
              className="flex items-center gap-1.5 text-xs font-bold text-success hover:underline">
              <CheckCircle2 size={13} /> {uyumlu} Uyumlu
            </button>
            <button onClick={() => setFilterStatus('Kısmen Uyumlu')}
              className="flex items-center gap-1.5 text-xs font-bold text-warning hover:underline">
              <AlertTriangle size={13} /> {kismen} Kısmen Uyumlu
            </button>
            <button onClick={() => setFilterStatus('Uyumsuz')}
              className="flex items-center gap-1.5 text-xs font-bold text-danger hover:underline">
              <AlertTriangle size={13} /> {uyumsuz} Uyumsuz
            </button>
            {kapsam > 0 && (
              <button onClick={() => setFilterStatus('Kapsam Dışı')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:underline">
                <MinusCircle size={13} /> {kapsam} {language === 'en' ? 'Out of Scope' : 'Kapsam Dışı'}
              </button>
            )}
            <button onClick={() => setFilterStatus('Tümü')}
              className="text-xs font-bold text-slate-400 hover:underline">
              {c.viewAll}
            </button>
          </div>
        </div>

        {detail.complianceScore < 100 && (
          <div className="shrink-0 text-center px-5 py-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.distToFull}</p>
            <p className="text-2xl font-bold text-danger mt-1">{100 - detail.complianceScore}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{c.articlesNeedFix(problemArticles.length)}</p>
          </div>
        )}
      </div>

      {/* Problem Articles Banner */}
      {problemArticles.length > 0 && (
        <div className="bg-danger/3 border border-danger/15 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-danger" />
            <h3 className="text-sm font-bold text-slate-800">{c.problemHeader(problemArticles.length)}</h3>
            <span className="text-[10px] text-slate-400 ml-auto">{c.clickDetail}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {problemArticles.map(a => (
              <button key={a.id}
                onClick={() => { setFilterStatus('Tümü'); setSelectedArticle(a); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:shadow-sm
                  ${a.status === 'Uyumsuz'
                    ? 'bg-danger/8 border-danger/20 text-danger hover:bg-danger/15'
                    : 'bg-warning/8 border-warning/20 text-warning hover:bg-warning/15'}`}>
                {a.status === 'Uyumsuz' ? <AlertTriangle size={11} /> : <AlertTriangle size={11} />}
                {a.number && <span>{a.number} —</span>} {a.title.length > 30 ? a.title.slice(0, 30) + '…' : a.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Article list */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-400" />
            {filterChips.map(f => (
              <button key={f.value} onClick={() => setFilterStatus(f.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                  ${filterStatus === f.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {f.label} {f.value !== 'Tümü' && `(${f.count})`}
              </button>
            ))}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-success opacity-50" />
              <p className="text-sm font-medium">{c.noArticleMatch}</p>
              <button onClick={() => setFilterStatus('Tümü')} className="text-xs text-primary mt-2 hover:underline">
                {c.showAllArticles}
              </button>
            </div>
          ) : filteredArticles.map(art => {
            const simPct = Math.round(art.similarity * 100);
            const simLabel = simPct >= 80 ? c.simHigh : simPct >= 50 ? c.simMid : c.simLow;
            const simColor = simPct >= 80 ? 'text-success' : simPct >= 50 ? 'text-warning' : 'text-danger';

            return (
              <motion.div key={art.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-white border rounded-[24px] overflow-hidden transition-all cursor-pointer
                  ${selectedArticle?.id === art.id ? 'border-primary shadow-xl shadow-primary/10' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}`}
                onClick={() => setSelectedArticle(selectedArticle?.id === art.id ? null : art)}>

                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">{statusIcon(art.status)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {art.number && <span className="text-primary mr-2">{art.number}</span>}
                        {art.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${simPct >= 80 ? 'bg-success' : simPct >= 50 ? 'bg-warning' : 'bg-danger'}`}
                              style={{ width: `${simPct}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold ${simColor}`}>{simLabel} (%{simPct})</span>
                        </div>
                        {art.yokReference && (
                          <a href={yokRefToUrl(art.yokReference)} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium">
                            {art.yokReference} <ArrowUpRight size={9} />
                          </a>
                        )}
                      </div>
                      {art.status !== 'Uyumlu' && art.suggestion && !selectedArticle && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
                          💡 {art.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusBadge(art.status)}`}>
                      {art.status}
                    </span>
                    <ChevronDown size={15} className={`text-slate-400 transition-transform ${selectedArticle?.id === art.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {selectedArticle?.id === art.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 overflow-hidden">
                      <div className="p-6 space-y-5 bg-slate-50/50">

                        {/* Status explanation */}
                        <div className={`p-4 rounded-xl border ${
                          art.status === 'Uyumlu' ? 'bg-success/5 border-success/20' :
                          art.status === 'Kısmen Uyumlu' ? 'bg-warning/5 border-warning/20' :
                          art.status === 'Kapsam Dışı' ? 'bg-slate-100 border-slate-200' :
                          'bg-danger/5 border-danger/20'}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                            art.status === 'Uyumlu' ? 'text-success' :
                            art.status === 'Kısmen Uyumlu' ? 'text-warning' :
                            art.status === 'Kapsam Dışı' ? 'text-slate-500' :
                            'text-danger'}`}>
                            {art.status === 'Uyumlu' ? c.statusCompliant :
                             art.status === 'Kısmen Uyumlu' ? c.statusPartial :
                             art.status === 'Kapsam Dışı' ? c.statusOutOfScope :
                             c.statusNonCompliant}
                          </p>
                          <p className="text-xs text-slate-600">
                            {c.overlapPrefix} <strong className={simColor}>%{simPct}</strong> —
                            {art.status === 'Kapsam Dışı' ? c.overlapOutScope :
                             simPct >= 80 ? c.overlapHigh :
                             simPct >= 50 ? c.overlapMid :
                             c.overlapLow}
                          </p>
                        </div>

                        {/* Article text — content stays as-is (Turkish from backend) */}
                        {art.text && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{c.docText}</p>
                            <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-100">{art.text}</p>
                          </div>
                        )}
                        {art.yokText && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.yokText}</p>
                              {art.yokReference && (
                                <a href={yokRefToUrl(art.yokReference)} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                                  {c.goToRef} <ArrowUpRight size={10} />
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{c.reasoning}</p>
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
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              💡 {c.suggestion}
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">{art.suggestion}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Right panel */}
        <div className="space-y-6">

          {/* Score breakdown */}
          <div className="bg-slate-900 text-white p-6 rounded-[32px] space-y-5">
            <h3 className="text-base font-bold">{c.breakdownTitle}</h3>

            {[
              { label: 'Uyumlu',        count: uyumlu,  color: 'bg-success', text: 'text-success', puan: 100 },
              { label: 'Kısmen Uyumlu', count: kismen,  color: 'bg-warning', text: 'text-warning', puan: 60  },
              { label: 'Uyumsuz',       count: uyumsuz, color: 'bg-danger',  text: 'text-danger',  puan: 0   },
            ].map(s => {
              const pct = total > 0 ? Math.round(s.count / total * 100) : 0;
              return (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
                      <span className="text-slate-300 font-medium">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${s.text}`}>{s.count} {c.articleUnit}</span>
                      <span className="text-slate-600 text-[10px]">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${s.color}`} />
                  </div>
                </div>
              );
            })}

            <div className="pt-4 border-t border-white/10 text-xs text-slate-500 space-y-1">
              <p>{c.scoreFormula}</p>
              <p className="font-mono text-slate-400">({uyumlu}×100 + {kismen}×60 + {uyumsuz}×0) ÷ {total || 1}</p>
              <p className="font-mono text-slate-300 font-bold">= %{detail.complianceScore}</p>
            </div>

            <button onClick={() => setViewerOpen(true)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
              <Eye size={16} /> {c.viewInPdf}
            </button>
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            <button onClick={() => navigate('/portal')}
              className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 hover:border-primary hover:shadow-md transition-all text-left">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <MessageSquare size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{c.askAI}</p>
                <p className="text-xs text-slate-400">{c.askAIDesc}</p>
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
