import React, { useState } from 'react';
import { X, ExternalLink, Scale, FileText, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentDetail, ArticleDetail, RetrievedChunk } from '../lib/api';
import { yokRefToUrl } from '../lib/yokRef';

const BACKEND = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

function pdfUrl(docId: string) {
  return `${BACKEND}/api/documents/${docId}/pdf`;
}


interface Props {
  doc: DocumentDetail;
  onClose: () => void;
}

type Tab = 'text' | 'yok' | 'summary';

function statusColor(s: string) {
  if (s === 'Uyumlu')        return '#22c55e';
  if (s === 'Kısmen Uyumlu') return '#f59e0b';
  return '#ef4444';
}

function statusBg(s: string) {
  if (s === 'Uyumlu')        return 'rgba(34,197,94,0.15)';
  if (s === 'Kısmen Uyumlu') return 'rgba(245,158,11,0.15)';
  return 'rgba(239,68,68,0.15)';
}

/**
 * Highlight occurrences of `needle` inside `haystack` with a colored <mark>.
 */
function highlightText(haystack: string, needle: string, color: string): React.ReactNode {
  if (!needle || needle.length < 10) return haystack;
  const idx = haystack.indexOf(needle.slice(0, 60));
  if (idx === -1) return haystack;
  return (
    <>
      {haystack.slice(0, idx)}
      <mark style={{ background: color, borderRadius: 3, padding: '1px 0' }}>
        {haystack.slice(idx, idx + needle.length)}
      </mark>
      {haystack.slice(idx + needle.length)}
    </>
  );
}

/**
 * Build annotated document text: split fullText into paragraphs,
 * wrap matched article texts with colored highlights.
 */
function AnnotatedDocumentText({ fullText, articles }: { fullText: string; articles: ArticleDetail[] }) {
  if (!fullText) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        <FileText size={32} className="mx-auto mb-3 opacity-30" />
        <p>Belge metni mevcut değil.</p>
        <p className="text-xs mt-1 opacity-70">Yeni bir analiz yaparken metin otomatik kaydedilecek.</p>
      </div>
    );
  }

  // Build a list of { start, end, article } for all article text occurrences
  type Span = { start: number; end: number; article: ArticleDetail };
  const spans: Span[] = [];

  for (const art of articles) {
    if (!art.text || art.text.length < 10) continue;
    const needle = art.text.slice(0, 80);
    const idx = fullText.indexOf(needle);
    if (idx !== -1) {
      spans.push({ start: idx, end: idx + art.text.length, article: art });
    }
  }

  // Sort spans by start position
  spans.sort((a, b) => a.start - b.start);

  if (spans.length === 0) {
    // No direct text matches — just show the full text cleanly
    return (
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono text-xs">
        {fullText}
        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-slate-400 text-xs">
          💡 Madde metinleri tam eşleşme ile renklendiriliyor. Madde metinleri kısa tutulmuşsa eşleşme bulunamayabilir.
        </div>
      </div>
    );
  }

  // Build rendered segments
  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (cursor < span.start) {
      segments.push(
        <span key={`plain-${cursor}`} className="text-slate-600">
          {fullText.slice(cursor, span.start)}
        </span>
      );
    }
    const art = span.article;
    segments.push(
      <mark
        key={`mark-${span.start}`}
        title={`${art.number} — ${art.title} (${art.status})`}
        style={{
          background: statusBg(art.status),
          borderLeft: `3px solid ${statusColor(art.status)}`,
          borderRadius: '3px',
          paddingLeft: '4px',
          display: 'inline',
          cursor: 'help',
        }}
      >
        {fullText.slice(span.start, span.end)}
      </mark>
    );
    cursor = span.end;
  }

  if (cursor < fullText.length) {
    segments.push(
      <span key="plain-end" className="text-slate-600">{fullText.slice(cursor)}</span>
    );
  }

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs">
      {segments}
    </div>
  );
}

function ArticleComparisonPanel({ articles }: { articles: ArticleDetail[] }) {
  const [filter, setFilter] = useState<string>('Tümü');

  const filtered = filter === 'Tümü'
    ? articles
    : articles.filter(a => a.status === filter);

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        <Scale size={32} className="mx-auto mb-3 opacity-30" />
        <p>Karşılaştırılacak madde yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {['Tümü', 'Uyumlu', 'Kısmen Uyumlu', 'Uyumsuz'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
              ${filter === f
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} madde</span>
      </div>

      {filtered.map(art => (
        <div key={art.id} className="rounded-2xl border border-slate-100 overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(art.status) }} />
              <p className="text-sm font-bold text-slate-800 truncate">
                {art.number && <span className="text-primary mr-1.5">{art.number}</span>}
                {art.title}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              {/* Similarity bar */}
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(art.similarity * 100, 100)}%`,
                    background: statusColor(art.status)
                  }} />
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  %{Math.round(art.similarity * 100)}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                style={{
                  color: statusColor(art.status),
                  borderColor: statusColor(art.status) + '30',
                  background: statusBg(art.status),
                }}>
                {art.status}
              </span>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            {/* Left: document article text */}
            <div className="p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">📄 Taslak Belgesi</p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {art.text || <span className="text-slate-300 italic">Metin yok</span>}
              </p>
            </div>

            {/* Right: YÖK regulation text */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">⚖️ YÖK Mevzuatı</p>
                {art.yokReference && (
                  <a href={yokRefToUrl(art.yokReference)} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                    {art.yokReference.slice(0, 30)}{art.yokReference.length > 30 ? '…' : ''}
                    <ExternalLink size={9} />
                  </a>
                )}
              </div>
              {art.yokText ? (
                <p className="text-xs text-slate-700 leading-relaxed bg-primary/3 p-3 rounded-xl border-l-4"
                  style={{ borderColor: statusColor(art.status) }}>
                  {art.yokText}
                </p>
              ) : (
                <p className="text-xs text-slate-300 italic">YÖK metni yok</p>
              )}
            </div>
          </div>

          {/* Reasoning (if any) */}
          {art.reasoning?.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Değerlendirme</p>
              <ul className="space-y-1">
                {art.reasoning.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-600">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ArticleSummaryPanel({ articles }: { articles: ArticleDetail[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {articles.map(art => (
        <div key={art.id} className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
          <button
            onClick={() => setExpanded(expanded === art.id ? null : art.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: statusColor(art.status) }}
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {art.number && <span className="text-primary mr-2">{art.number}</span>}
                  {art.title}
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1 flex-wrap">
                  Benzerlik: %{Math.round(art.similarity * 100)}
                  {art.yokReference && (
                    <>
                      <span className="text-slate-300">·</span>
                      <a
                        href={yokRefToUrl(art.yokReference)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        {art.yokReference} <ExternalLink size={9} />
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                style={{
                  color: statusColor(art.status),
                  borderColor: statusColor(art.status) + '40',
                  background: statusBg(art.status),
                }}
              >
                {art.status}
              </span>
              {expanded === art.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </div>
          </button>

          <AnimatePresence>
            {expanded === art.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-slate-100"
              >
                <div className="p-5 space-y-4 bg-slate-50/50">
                  {art.text && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Taslak Metni</p>
                      <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                        {art.text}
                      </p>
                    </div>
                  )}
                  {art.yokText && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">YÖK Referansı</p>
                        {art.yokReference && (
                          <a
                            href={yokRefToUrl(art.yokReference)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                          >
                            mevzuat.gov.tr <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-800 p-3 rounded-xl border-l-4 border-primary">
                        {art.yokText}
                      </p>
                    </div>
                  )}
                  {art.reasoning?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Değerlendirme</p>
                      <ul className="space-y-1.5">
                        {art.reasoning.map((r, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-700">
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {art.suggestion && art.status !== 'Uyumlu' && (
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Öneri</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{art.suggestion}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function DocumentViewer({ doc, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('text');

  const tabs = [
    { id: 'text'       as Tab, label: 'Belge Metni',        icon: FileText },
    { id: 'yok'        as Tab, label: 'Madde Karşılaştırma', icon: Scale   },
    { id: 'summary'    as Tab, label: 'Madde Özeti',        icon: Layers  },
  ];

  const legendItems = [
    { color: 'rgba(34,197,94,0.3)',  border: '#22c55e', label: 'Uyumlu'        },
    { color: 'rgba(245,158,11,0.3)', border: '#f59e0b', label: 'Kısmen Uyumlu' },
    { color: 'rgba(239,68,68,0.3)',  border: '#ef4444', label: 'Uyumsuz'       },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-[32px] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate">{doc.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {doc.pipeline?.toUpperCase()} · {doc.model} · {doc.articleCount} madde · %{doc.complianceScore} uyum
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <a
                href={pdfUrl(doc.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
                title="Orijinal PDF'i yeni sekmede aç"
              >
                <ExternalLink size={14} /> Orijinal PDF
              </a>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-8 py-3 border-b border-slate-100 bg-slate-50/50">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all
                  ${tab === t.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}

            {/* Highlight legend (only on text tab) */}
            {tab === 'text' && (
              <div className="ml-auto flex items-center gap-3">
                {legendItems.map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm border"
                      style={{ background: l.color, borderColor: l.border }}
                    />
                    <span className="text-[10px] text-slate-500 font-medium">{l.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {tab === 'text' && (
              <AnnotatedDocumentText fullText={doc.fullText ?? ''} articles={doc.articles ?? []} />
            )}
            {tab === 'yok' && (
              <ArticleComparisonPanel articles={doc.articles ?? []} />
            )}
            {tab === 'summary' && (
              <ArticleSummaryPanel articles={doc.articles ?? []} />
            )}
          </div>

          {/* Footer status bar */}
          <div className="px-8 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex gap-6">
              {[
                { label: 'Uyumlu', count: doc.articles?.filter(a => a.status === 'Uyumlu').length ?? 0, color: 'text-success' },
                { label: 'Kısmen', count: doc.articles?.filter(a => a.status === 'Kısmen Uyumlu').length ?? 0, color: 'text-warning' },
                { label: 'Uyumsuz', count: doc.articles?.filter(a => a.status === 'Uyumsuz').length ?? 0, color: 'text-danger' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">{s.label}:</span>
                  <span className={`font-bold ${s.color}`}>{s.count}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Yükleme:</span>
              <span className="font-medium text-slate-600">
                {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
