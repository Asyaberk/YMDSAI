import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  TrendingUp,
  FileSearch,
  PlusCircle,
  ShieldCheck,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { dashboard, DashboardMetrics } from '../lib/api';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard.metrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      name: 'Aktif Analizler',
      value: loading ? '—' : String(metrics?.stats.activeAnalyses ?? 0),
      icon: FileSearch,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      name: 'Tamamlanan',
      value: loading ? '—' : String(metrics?.stats.completed ?? 0),
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10'
    },
    {
      name: 'Kritik Risk',
      value: loading ? '—' : String(metrics?.stats.critical ?? 0),
      icon: AlertTriangle,
      color: 'text-danger',
      bg: 'bg-danger/10'
    },
    {
      name: 'Bekleyen',
      value: loading ? '—' : String(metrics?.stats.pending ?? 0),
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10'
    },
  ];

  const recentDocs = metrics?.recentDocuments ?? [];

  const systemHealth = metrics?.systemHealth ?? {
    ragModel: 'Yükleniyor...',
    embeddingApi: 'Yükleniyor...',
    database: 'Yükleniyor...',
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-medium tracking-tight text-slate-900">
            {isAdmin ? 'Sistem Yönetim Paneli' : `Hoş Geldiniz, ${user?.name.split(' ')[0]}`}
          </h1>
          <p className="text-slate-500 font-medium">Mevzuat denetim süreçleri ve güncel veri özeti.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/analysis')}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
          >
             Geçmiş Raporlar
          </button>
          <button 
            onClick={() => navigate('/upload')}
            className="btn-primary flex items-center gap-2"
          >
             <PlusCircle size={18} /> {isAdmin ? 'Yeni Mevzuat Yükle' : 'Yeni Analiz Başlat'}
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-default"
          >
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
            <p className={`text-3xl font-bold text-slate-900 mt-1 ${loading ? 'animate-pulse' : ''}`}>
              {stat.value}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-success bg-success/5 px-2 py-1 rounded-full w-fit">
               <TrendingUp size={12} /> Gerçek zamanlı
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card p-8 space-y-6 bg-white overflow-hidden relative border border-slate-100 shadow-sm rounded-[32px]">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">Son Analizler</h3>
            <button 
              onClick={() => navigate('/analysis')}
              className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:underline"
            >
               Tümünü Gör <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {loading ? (
              // Loading skeleton
              [1, 2, 3].map(i => (
                <div key={i} className="w-full p-4 rounded-2xl border border-slate-50 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                    <div className="h-2 bg-slate-50 rounded-full w-1/4" />
                  </div>
                </div>
              ))
            ) : recentDocs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Henüz analiz yok.</p>
                <button onClick={() => navigate('/upload')} className="mt-3 text-primary text-xs font-bold hover:underline">
                  İlk belgeyi yükle →
                </button>
              </div>
            ) : (
              recentDocs.map((doc) => (
                <button 
                  key={doc.id} 
                  onClick={() => navigate('/analysis')}
                  className="w-full group p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                        <FileText size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                        <p className="text-xs text-slate-400">
                          {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : ''}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-2">
                           <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${doc.complianceScore > 80 ? 'bg-success' : doc.complianceScore > 60 ? 'bg-warning' : 'bg-danger'}`}
                                style={{ width: `${doc.complianceScore}%` }}
                              />
                           </div>
                           <span className="text-xs font-bold text-slate-700">%{doc.complianceScore}</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{doc.status}</p>
                     </div>
                     <div className="p-2 text-slate-300 group-hover:text-primary transition-all">
                        <ArrowUpRight size={18} />
                     </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="bg-primary p-8 rounded-[40px] text-white space-y-6 shadow-2xl shadow-primary/20 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                 <Zap size={24} className="text-amber-300" />
              </div>
              <div className="space-y-2">
                 <h3 className="text-xl font-bold tracking-tight">YÖK Mevzuatı</h3>
                 <p className="text-primary-foreground/70 text-sm leading-relaxed">
                   Hibrit RAG pipeline aktif. BM25 + yoğun vektör arama ile en güncel YÖK mevzuatı taranıyor.
                 </p>
              </div>
              <button 
                onClick={() => navigate('/upload')}
                className="w-full py-4 bg-white text-primary rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-50 transition-all relative z-10"
              >
                 Analiz Başlat
              </button>
           </div>

           <div className="card p-8 border-slate-100 space-y-6">
              <div className="flex items-center gap-3">
                 <ShieldCheck size={20} className="text-success" />
                 <h3 className="font-bold text-slate-800">Sistem Sağlığı</h3>
              </div>
              <div className="space-y-4">
                 {[
                   { label: 'RAG Modeli', status: systemHealth.ragModel, color: 'text-success' },
                   { label: 'Embedding API', status: systemHealth.embeddingApi, color: 'text-success' },
                   { label: 'Mevzuat DB', status: systemHealth.database, color: 'text-primary' },
                 ].map((s, i) => (
                   <div key={i} className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-400 uppercase tracking-widest">{s.label}</span>
                      <span className={s.color}>{s.status}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
