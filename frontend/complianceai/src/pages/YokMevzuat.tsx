import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale, ExternalLink, Search, RefreshCw, BookOpen,
  ChevronRight, Loader2, AlertCircle, CheckCircle2,
  Gavel, FileText, Megaphone, ScrollText, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MevzuatItem {
  title: string;
  url: string | null;
  hasLink: boolean;
}

interface MevzuatCategory {
  name: string;
  count: number;
  items: MevzuatItem[];
}

interface MevzuatData {
  source: string;
  lastUpdated: string | null;
  cached: boolean;
  totalCount: number;
  categories: MevzuatCategory[];
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

function categoryIcon(name: string) {
  if (name === 'Kanunlar')      return <Gavel      size={18} className="text-primary" />;
  if (name === 'Yönetmelikler') return <ScrollText size={18} className="text-warning" />;
  if (name === 'Tebliğler')     return <FileText   size={18} className="text-success" />;
  if (name === 'Genelgeler')    return <Megaphone  size={18} className="text-purple-500" />;
  return <BookOpen size={18} className="text-slate-400" />;
}

function categoryColor(name: string) {
  if (name === 'Kanunlar')      return 'border-primary/20 bg-primary/5 text-primary';
  if (name === 'Yönetmelikler') return 'border-warning/20 bg-warning/5 text-warning';
  if (name === 'Tebliğler')     return 'border-success/20 bg-success/5 text-success';
  if (name === 'Genelgeler')    return 'border-purple-200 bg-purple-50 text-purple-700';
  return 'border-slate-200 bg-slate-50 text-slate-500';
}

// RAG-used PDFs match (our local corpus)
const RAG_SOURCES = ['yok', 'lisansustu', 'cap', 'yandal', 'yatay', 'ek-madde', 'yurt'];
function isRagUsed(title: string) {
  const t = title.toLowerCase();
  return RAG_SOURCES.some(k => t.includes(k) || t.includes('yükseköğretim kanunu') || t.includes('2547'));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function YokMevzuat() {
  const [data, setData]           = useState<MevzuatData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [activeTab, setActiveTab] = useState<string>('Tümü');
  const [error, setError]         = useState<string | null>(null);

  const token = localStorage.getItem('ca_token');

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const url    = forceRefresh ? `${BASE}/api/yok/mevzuat/refresh` : `${BASE}/api/yok/mevzuat`;
      const method = forceRefresh ? 'POST' : 'GET';
      const resp   = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json);
    } catch (e) {
      setError('Mevzuat listesi yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter items
  const filtered: MevzuatCategory[] = (data?.categories ?? []).map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat =>
    (activeTab === 'Tümü' || cat.name === activeTab) && cat.items.length > 0
  );

  const allTabs = ['Tümü', ...(data?.categories.map(c => c.name) ?? [])];

  const totalFiltered = filtered.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Scale size={20} className="text-primary" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight text-slate-900">YÖK Mevzuatı</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Türk yükseköğretim mevzuatının güncel listesi.{' '}
            <a href="https://idarimali.yok.gov.tr/tr/page/318" target="_blank" rel="noreferrer"
               className="text-primary font-semibold inline-flex items-center gap-1 hover:underline">
              Resmi YÖK Kaynağı <ExternalLink size={12} />
            </a>
          </p>
        </div>

        <div className="flex items-center gap-3 self-start flex-wrap">
          {data?.lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              {data.cached
                ? <CheckCircle2 size={14} className="text-success" />
                : <Globe size={14} className="text-primary" />}
              {data.cached ? 'Önbellekten' : 'Canlı veri'} ·{' '}
              {new Date(data.lastUpdated).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {data?.error && (
            <div className="flex items-center gap-2 text-xs text-warning bg-warning/5 px-3 py-2 rounded-xl border border-warning/20">
              <AlertCircle size={14} /> {data.error}
            </div>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Yenileniyor...' : 'Yenile'}
          </button>
          <a href="https://idarimali.yok.gov.tr/tr/page/318" target="_blank" rel="noreferrer"
             className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-primary hover:text-primary transition-all">
            <ExternalLink size={14} /> Resmi Site
          </a>
        </div>
      </div>

      {/* Stats */}
      {data && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Toplam', value: data.totalCount, color: 'text-slate-900' },
            ...data.categories.map(c => ({
              label: c.name, value: c.count,
              color: c.name === 'Kanunlar' ? 'text-primary' :
                     c.name === 'Yönetmelikler' ? 'text-warning' :
                     c.name === 'Tebliğler' ? 'text-success' : 'text-purple-600'
            }))
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Mevzuat ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {allTabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all
                ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-primary'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="text-sm font-medium">YÖK mevzuatı yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
          <AlertCircle size={40} className="text-danger opacity-50" />
          <p className="text-sm font-medium text-danger">{error}</p>
          <button onClick={() => fetchData()} className="btn-primary px-6 py-2 text-sm">Tekrar Dene</button>
        </div>
      ) : (
        <>
          {search && (
            <p className="text-xs text-slate-400 font-medium">
              "{search}" için {totalFiltered} sonuç
            </p>
          )}

          <div className="space-y-8">
            {filtered.map((cat, ci) => (
              <motion.div key={cat.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.07 }}>

                {/* Category Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${categoryColor(cat.name)}`}>
                    {categoryIcon(cat.name)}
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">{cat.name}</h2>
                  <span className="ml-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                    {cat.items.length}
                  </span>
                </div>

                {/* Grid of Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {cat.items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: ci * 0.07 + i * 0.02 }}
                      className={`relative bg-white border rounded-2xl p-5 transition-all group
                        ${item.hasLink ? 'hover:border-primary hover:shadow-lg hover:shadow-primary/5 cursor-pointer' : 'border-slate-100 opacity-70'}`}
                    >
                      {/* RAG badge */}
                      {isRagUsed(item.title) && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-full border border-primary/20">
                          RAG'da kullanılıyor
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${categoryColor(cat.name)}`}>
                          {categoryIcon(cat.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 leading-snug pr-8">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${categoryColor(cat.name)}`}>
                              {cat.name.replace(/ler$|lar$/, '').replace(/eler$|alar$/, '')}
                            </span>
                            {item.hasLink ? (
                              <a href={item.url!} target="_blank" rel="noreferrer"
                                 className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline ml-auto">
                                mevzuat.gov.tr <ExternalLink size={10} />
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 ml-auto">Bağlantı yok</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Hover arrow */}
                      {item.hasLink && (
                        <ChevronRight size={16}
                          className="absolute bottom-4 right-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Footer note */}
      {!loading && !error && (
        <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
          Veriler <a href="https://idarimali.yok.gov.tr/tr/page/318" target="_blank" rel="noreferrer"
            className="text-primary hover:underline font-semibold">idarimali.yok.gov.tr</a>'den
          canlı olarak çekilmektedir. Lisans ve yönetmelik metinleri için{' '}
          <a href="https://www.mevzuat.gov.tr" target="_blank" rel="noreferrer"
            className="text-primary hover:underline font-semibold">mevzuat.gov.tr</a>'yi ziyaret edin.
        </div>
      )}
    </div>
  );
}
