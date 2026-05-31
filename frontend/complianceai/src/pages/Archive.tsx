import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Eye, CheckCircle2, AlertTriangle,
  History, X, FolderOpen, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { documents, DocumentSummary } from '../lib/api';

function statusStyle(s: string) {
  if (s === 'Uyumlu')        return 'bg-success/10 text-success border-success/20';
  if (s === 'Kısmen Uyumlu') return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-danger/10 text-danger border-danger/20';
}

function statusIcon(s: string, size = 14) {
  if (s === 'Uyumlu') return <CheckCircle2 size={size} className="text-success" />;
  return <AlertTriangle size={size} className={s === 'Kısmen Uyumlu' ? 'text-warning' : 'text-danger'} />;
}

export default function Archive() {
  const navigate = useNavigate();

  const [docList, setDocList]         = useState<DocumentSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Tümü');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    documents.list()
      .then(setDocList)
      .catch(() => showNotification('Belgeler yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = docList.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'Tümü' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total:    docList.length,
    uyumlu:   docList.filter(d => d.status === 'Uyumlu').length,
    kismen:   docList.filter(d => d.status === 'Kısmen Uyumlu').length,
    uyumsuz:  docList.filter(d => d.status === 'Uyumsuz').length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[100] px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium"
          >
            <CheckCircle2 size={18} className="text-success" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-slate-900">Mevzuat Arşivi</h1>
          <p className="text-slate-500 text-sm mt-1">Yüklenen tüm yönetmelik analizleri.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Belge adı ara..."
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-72 outline-none focus:border-primary transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* İstatistik Kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Belge', value: stats.total, color: 'text-slate-900', bg: 'bg-slate-100', icon: FileText },
          { label: 'Uyumlu', value: stats.uyumlu, color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
          { label: 'Kısmen Uyumlu', value: stats.kismen, color: 'text-warning', bg: 'bg-warning/10', icon: AlertTriangle },
          { label: 'Uyumsuz', value: stats.uyumsuz, color: 'text-danger', bg: 'bg-danger/10', icon: AlertTriangle },
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

      {/* Filtreler */}
      <div className="flex gap-2 flex-wrap">
        {['Tümü', 'Uyumlu', 'Kısmen Uyumlu', 'Uyumsuz'].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all
              ${filterStatus === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-primary'}`}>
            {f} {f !== 'Tümü' && `(${docList.filter(d => d.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Tablo */}
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
                <p className="text-sm font-medium">Henüz belge yok</p>
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
            {/* Tablo başlıkları */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-50 bg-slate-50/50">
              {['', 'Belge Adı', 'Kategori', 'Uyum Skoru', 'Durum', 'Tarih', 'İşlem'].map((h, i) => (
                <div key={i} className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest
                  ${i === 0 ? 'col-span-1' : i === 1 ? 'col-span-3' : i === 2 ? 'col-span-2' : i === 3 ? 'col-span-2' : i === 4 ? 'col-span-2' : i === 5 ? 'col-span-1' : 'col-span-1 text-right'}`}>
                  {h}
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-50">
              {filtered.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors group"
                >
                  {/* İkon */}
                  <div className="col-span-1">
                    <div className="w-9 h-9 bg-primary/5 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <FileText size={16} />
                    </div>
                  </div>

                  {/* Ad */}
                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{doc.pipeline?.toUpperCase() ?? 'HYBRID'} · {doc.model ?? 'gpt-4o-mini'}</p>
                  </div>

                  {/* Kategori */}
                  <div className="col-span-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg">
                      {doc.category}
                    </span>
                  </div>

                  {/* Uyum Skoru */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${doc.complianceScore > 80 ? 'bg-success' : doc.complianceScore > 60 ? 'bg-warning' : 'bg-danger'}`}
                          style={{ width: `${doc.complianceScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 shrink-0">%{doc.complianceScore}</span>
                    </div>
                  </div>

                  {/* Durum */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusStyle(doc.status)}`}>
                      {statusIcon(doc.status)} {doc.status}
                    </span>
                  </div>

                  {/* Tarih */}
                  <div className="col-span-1">
                    <p className="text-xs text-slate-400">
                      {new Date(doc.uploadDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  {/* Aksiyon */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => navigate('/analysis')}
                      title="Detayları Gör"
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
          <span>{filtered.length} belge gösteriliyor</span>
          <div className="flex items-center gap-2">
            <History size={14} />
            <span>En son güncelleme: {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
