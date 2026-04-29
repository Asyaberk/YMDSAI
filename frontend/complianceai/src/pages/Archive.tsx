import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertTriangle,
  History,
  X
} from 'lucide-react';
import { mockDocuments } from '../mockData';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function Archive() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredDocs = mockDocuments.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mevzuat Arşivi</h1>
          <p className="text-slate-500 text-sm">Üniversitenize ait tüm yönetmelikler ve güncel YÖK referansları.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Belge adı veya kategori ara..." 
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full md:w-80 outline-none focus:border-primary transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="card p-0 overflow-hidden border-slate-100 shadow-xl shadow-slate-200/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belge Künyesi</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategori</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uyum Durumu</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Son Güncelleme</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/analysis')}>
                            {doc.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">{doc.articleCount} Madde İncelendi</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-tight">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {doc.status === 'Uyumlu' ? (
                          <CheckCircle2 className="text-success" size={14} />
                        ) : (
                          <AlertTriangle className="text-warning" size={14} />
                        )}
                        <span className={cn(
                          "text-xs font-bold",
                          doc.status === 'Uyumlu' ? 'text-success' : 'text-warning'
                        )}>
                          {doc.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 font-medium">{doc.uploadDate}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate('/analysis')}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all"
                          title="Analizi Görüntüle"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => showNotification(`${doc.name} indirme işlemi başlatıldı.`)}
                          className="p-2 text-slate-400 hover:text-success hover:bg-white rounded-lg transition-all"
                          title="Orijinali İndir"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => showNotification(`${doc.name} arşivden silindi (Simülasyon).`)}
                          className="p-2 text-slate-400 hover:text-danger hover:bg-white rounded-lg transition-all"
                          title="Belgeyi Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
           <div className="card bg-slate-900 text-white p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <History size={120} />
              </div>
              <div className="relative z-10 space-y-4">
                 <h3 className="text-xl font-bold tracking-tight">Mevzuat Geçmişi ve Revizyonlar</h3>
                 <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                    Düzenlenen belgelerin eski versiyonlarını ve YÖK tarafından yapılan tarihsel değişiklikleri buradan takip edebilirsiniz.
                 </p>
                 <button className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest hover:underline">
                    REVİZYON TAKİBİNİ AÇ <ExternalLink size={14} />
                 </button>
              </div>
           </div>

           <div className="card p-8 bg-academic/5 border-academic/10 flex items-center justify-between">
              <div className="space-y-2">
                 <h3 className="text-xl font-bold text-slate-900">Resmi YÖK Kütüphanesi</h3>
                 <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                    Tüm yükseköğretim kurumlarını bağlayan güncel çerçeve yönetmelikler ve kanun metinleri.
                 </p>
                 <button className="btn-primary py-2 px-6 mt-4">Kütüphaneye Git</button>
              </div>
              <div className="hidden lg:block">
                 <div className="grid grid-cols-2 gap-2">
                    {[1,2,3,4].map(i => <div key={i} className="w-12 h-16 bg-white rounded shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 font-bold text-xs">PDF</div>)}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
