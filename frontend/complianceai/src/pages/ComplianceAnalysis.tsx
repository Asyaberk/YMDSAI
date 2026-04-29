import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Download, 
  Share2,
  FileText,
  BrainCircuit,
  MessageSquare,
  ArrowUpRight,
  Filter,
  FileCode,
  BookOpen,
  PlusCircle,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mockArticles, missingArticles } from '../mockData';
import { cn } from '../lib/utils';

export default function ComplianceAnalysis() {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'document'>('analysis');
  const [filter, setFilter] = useState<'All' | 'Uyumlu' | 'Uyumsuz' | 'Kısmen Uyumlu'>('All');
  const [appliedCorrections, setAppliedCorrections] = useState<string[]>([]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredArticles = useMemo(() => {
    return mockArticles.filter(art => filter === 'All' || art.status === filter);
  }, [filter]);

  const handleApplyCorrection = (id: string) => {
    setAppliedCorrections(prev => [...prev, id]);
    showNotification('Düzeltme başarıyla uygulandı! Uyum skoru hesaplanıyor...');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 text-xs font-bold text-primary tracking-widest uppercase mb-2">
              <BrainCircuit size={14} /> AI Analiz Raporu
           </div>
           <h1 className="text-3xl font-medium tracking-tight text-slate-900">Lisansüstü_Yonetmelik_Taslagi.pdf</h1>
           <p className="text-slate-500 text-sm mt-1">Analiz Tamamlandı: 29 Nisan 2026, 14:22</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => showNotification('Paylaşma bağlantısı panoya kopyalandı!')}
             className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all"
           >
             <Share2 size={18} /> Paylaş
           </button>
           <button 
             onClick={() => showNotification('Analiz raporu PDF olarak hazırlanıyor...')}
             className="btn-primary flex items-center gap-2"
           >
             <Download size={18} /> PDF Raporu İndir
           </button>
        </div>
      </div>

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

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('analysis')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'analysis' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <BrainCircuit size={18} /> Analiz Raporu
        </button>
        <button 
          onClick={() => setActiveTab('document')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'document' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <FileText size={18} /> Kaynak Belge
        </button>
      </div>

      {activeTab === 'analysis' ? (
        <>
          {/* Summary Scoreboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="card border-l-4 border-primary">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Genel Uyum Skoru</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-bold text-slate-900">%{appliedCorrections.length > 0 ? (84 + appliedCorrections.length * 2) : 84}</span>
                   {appliedCorrections.length > 0 && <span className="text-xs text-success font-medium">▲ %{appliedCorrections.length * 2}</span>}
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4">
                   <div 
                     className="h-full bg-primary rounded-full transition-all duration-1000" 
                     style={{ width: `${84 + appliedCorrections.length * 2}%` }}
                   />
                </div>
             </div>
             <div className="card">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Uyumsuz Madde</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-bold text-danger">3</span>
                   <span className="text-xs text-slate-400 uppercase font-bold tracking-tighter">İvedi Düzeltme</span>
                </div>
             </div>
             <div className="card">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kısmen Uyumlu</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-bold text-warning">8</span>
                   <span className="text-xs text-slate-400 uppercase font-bold tracking-tighter">İyileştirme Önerisi</span>
                </div>
             </div>
             <div className="card">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Analiz Kapsamı</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-bold text-slate-900">{mockArticles.length}</span>
                   <span className="text-xs text-slate-400 uppercase font-bold tracking-tighter">Toplam Madde</span>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Main Issue List */}
             <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="font-medium text-slate-800">Mevzuat Maddeleri</h3>
                   <div className="flex gap-2">
                      {(['All', 'Uyumsuz', 'Kısmen Uyumlu', 'Uyumlu'] as const).map((f) => (
                        <button 
                          key={f}
                          onClick={() => setFilter(f)}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                            filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {f === 'All' ? 'HEPSİ' : f.toUpperCase()}
                        </button>
                      ))}
                   </div>
                </div>

                {filteredArticles.map((article) => (
                   <div 
                      key={article.id}
                      onClick={() => setSelectedIssue(selectedIssue === article.id ? null : article.id)}
                      className={cn(
                        "group relative overflow-hidden bg-white border rounded-[24px] cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1",
                        selectedIssue === article.id ? "border-primary ring-4 ring-primary/5 shadow-2xl" : "border-slate-100 shadow-sm",
                        appliedCorrections.includes(article.id) && "border-success/30 bg-success/[0.02]"
                      )}
                   >
                      <div className="p-6">
                         <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                               <div className="flex items-center gap-3">
                                  <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                                    appliedCorrections.includes(article.id) 
                                      ? "bg-success/10 text-success" 
                                      : article.status === 'Uyumsuz' ? 'bg-danger/10 text-danger' : article.status === 'Kısmen Uyumlu' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                                  )}>
                                     {appliedCorrections.includes(article.id) ? 'Düzeltildi' : article.status}
                                  </span>
                                  <h4 className="text-slate-900 font-medium">{article.number} - {article.title}</h4>
                               </div>
                               <p className="text-slate-500 text-sm leading-relaxed mt-2 pr-12 line-clamp-2">
                                  {article.text}
                               </p>
                            </div>
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                              selectedIssue === article.id ? "bg-primary text-white" : "bg-slate-50 text-slate-300 group-hover:bg-slate-100 group-hover:text-slate-600"
                            )}>
                               {selectedIssue === article.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </div>
                         </div>

                         <AnimatePresence>
                            {selectedIssue === article.id && (
                               <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                               >
                                  <div className="mt-8 pt-8 border-t border-slate-50 space-y-6">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 tracking-widest uppercase">
                                              <BookOpen size={14} /> Taslak Metin
                                           </div>
                                           <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                                              "{article.text}"
                                           </div>
                                        </div>
                                        <div className="space-y-4">
                                           <div className="flex items-center gap-2 text-xs font-bold text-academic tracking-widest uppercase">
                                              <FileCode size={14} /> YÖK Referansı
                                           </div>
                                           <div className="p-4 bg-academic/5 rounded-xl border border-academic/10 text-sm text-slate-700 leading-relaxed italic">
                                              "{article.yokText}"
                                           </div>
                                        </div>
                                     </div>

                                     <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                        <div className="flex items-center gap-2 text-xs font-bold text-primary tracking-widest uppercase mb-3">
                                           <BrainCircuit size={14} /> AI Analiz ve Gerekçe
                                        </div>
                                        <ul className="space-y-2">
                                          {article.reasoning.map((reason, idx) => (
                                            <li key={idx} className="flex gap-2 text-sm text-slate-600">
                                              <div className="w-1.5 h-1.5 bg-primary/30 rounded-full mt-1.5 flex-shrink-0" />
                                              {reason}
                                            </li>
                                          ))}
                                        </ul>
                                     </div>

                                     {(article.status !== 'Uyumlu' && !appliedCorrections.includes(article.id)) && (
                                       <div className="bg-success/5 border border-success/20 rounded-2xl p-6">
                                          <div className="flex items-center justify-between mb-4">
                                             <div className="flex items-center gap-2 text-xs font-bold text-success tracking-widest uppercase">
                                                <Wand2 size={14} /> Akıllı Düzeltme Önerisi
                                             </div>
                                             <button 
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleApplyCorrection(article.id);
                                               }}
                                               className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-xl text-xs font-bold hover:bg-success/90 transition-all shadow-lg shadow-success/20"
                                             >
                                                Düzeltmeyi Uygula
                                             </button>
                                          </div>
                                          <p className="text-sm text-slate-700 font-medium">
                                             {article.suggestion}
                                          </p>
                                       </div>
                                     )}

                                     {appliedCorrections.includes(article.id) && (
                                       <div className="bg-success/10 border border-success/20 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
                                          <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center text-white">
                                            <CheckCircle2 size={24} />
                                          </div>
                                          <div className="space-y-1">
                                            <h4 className="font-bold text-success">Madde Başarıyla Revize Edildi</h4>
                                            <p className="text-sm text-slate-600">YÖK mevzuatıyla tam uyum sağlandı. Belgeye işlemek için çıktı alabilirsiniz.</p>
                                          </div>
                                       </div>
                                     )}

                                     <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referans Document: {article.yokReference}</span>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            showNotification(`YÖK Mevzuat Belgesi açılıyor: ${article.yokReference}`);
                                          }}
                                          className="text-primary hover:underline text-[10px] font-bold flex items-center gap-1"
                                        >
                                           DETAYLI MEVZUATI AÇ <ArrowUpRight size={12} />
                                        </button>
                                     </div>
                                  </div>
                               </motion.div>
                            )}
                         </AnimatePresence>
                      </div>
                   </div>
                ))}

                {/* Missing Articles Section */}
                <div className="pt-12">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-danger/10 text-danger rounded-xl flex items-center justify-center">
                         <AlertTriangle size={20} />
                      </div>
                      <div>
                         <h3 className="font-bold text-slate-900">Eksik Mevzuat Tespitleri</h3>
                         <p className="text-sm text-slate-500">YÖK çerçeve yönetmeliğinde olup taslakta bulunmayan maddeler.</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      {missingArticles.map((missing) => (
                        <div key={missing.id} className="bg-white border border-danger/10 p-6 rounded-[28px] space-y-4 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4">
                              <span className="text-[10px] font-bold text-danger uppercase tracking-widest py-1 px-3 bg-danger/5 rounded-full border border-danger/10">ZORUNLU MADDE</span>
                           </div>
                           <div className="space-y-1">
                              <h4 className="font-bold text-slate-900">{missing.title}</h4>
                              <p className="text-xs text-slate-400 font-medium uppercase tracking-tight">{missing.yokReference}</p>
                           </div>
                           <p className="text-sm text-slate-600 leading-relaxed pr-24">{missing.description}</p>
                           <div className="p-4 bg-danger/[0.02] border border-danger/5 rounded-2xl flex items-start gap-4">
                              <Wand2 size={18} className="text-danger mt-0.5 flex-shrink-0" />
                              <div className="space-y-2">
                                 <p className="text-sm font-medium text-slate-800">{missing.suggestion}</p>
                                 <button 
                                   onClick={() => showNotification('Eksik madde taslağı oluşturuldu ve belgeye eklendi!')}
                                   className="flex items-center gap-2 text-xs font-bold text-danger hover:underline"
                                 >
                                    TASLAK MADDEYİ EKLE <PlusCircle size={14} />
                                 </button>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* Side Info Panel */}
             <div className="space-y-6">
                <div className="card bg-slate-900 text-white p-8 space-y-6">
                   <h3 className="text-xl font-medium">Uzman AI'ya Sorun</h3>
                   <p className="text-slate-400 text-sm leading-relaxed">
                     Bu analizdeki bulgular veya YÖK mevzuatı hakkında derinlemesine bilgi alabilirsiniz.
                   </p>
                   <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Mevzuat hakkında soru sor..." 
                        className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl outline-none focus:border-primary transition-all text-sm pr-12"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary rounded-lg text-white">
                         <MessageSquare size={16} />
                      </button>
                   </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-8 space-y-6">
                   <div className="flex items-center justify-between">
                     <h3 className="font-medium text-slate-900">Uyum Geçmişi</h3>
                     <button className="text-[10px] font-bold text-primary hover:underline">DETAYLAR</button>
                   </div>
                   <div className="space-y-4">
                      {[
                        { date: '12 Ocak 2025', score: '%78', status: 'Taslak-1' },
                        { date: '15 Mart 2025', score: '%82', status: 'Taslak-2' },
                        { date: 'Bugün', score: `%${84 + appliedCorrections.length * 2}`, status: 'Güncel' },
                      ].map((h, i) => (
                        <div key={i} className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                i === 2 ? "bg-primary animate-pulse" : "bg-slate-300"
                              )} />
                              <div>
                                 <p className="text-xs font-bold text-slate-700">{h.status}</p>
                                 <p className="text-[10px] text-slate-400">{h.date}</p>
                              </div>
                           </div>
                           <span className={cn(
                             "text-sm font-bold",
                             i === 2 ? "text-primary text-lg" : "text-slate-500"
                           )}>{h.score}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[700px]">
          <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden flex flex-col shadow-2xl shadow-slate-200/50">
            <div className="p-4 border-b border-slate-50 bg-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Taslak Belge</span>
               </div>
               <div className="flex items-center bg-white border border-slate-200 p-1 rounded-lg">
                  <button 
                    onClick={() => setAppliedCorrections([])}
                    className={cn(
                      "px-3 py-1 text-[9px] font-bold rounded-md transition-all",
                      appliedCorrections.length === 0 ? "bg-slate-900 text-white" : "text-slate-400"
                    )}
                  >ORİJİNAL</button>
                  <button 
                    onClick={() => setAppliedCorrections(mockArticles.map(a => a.id))}
                    className={cn(
                      "px-3 py-1 text-[9px] font-bold rounded-md transition-all",
                      appliedCorrections.length > 0 ? "bg-success text-white" : "text-slate-400"
                    )}
                  >DÜZELTİLMİŞ</button>
               </div>
               <div className="flex gap-2">
                  <button 
                    onClick={() => showNotification('Düzenlenmiş yeni belge PDF olarak oluşturuluyor...')}
                    className="p-2 bg-success/10 text-success hover:bg-success hover:text-white rounded-lg transition-all"
                    title="Düzeltilmiş Versiyonu İndir"
                  >
                    <Download size={16} />
                  </button>
               </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto space-y-8 font-serif leading-loose text-slate-800 bg-white">
               {mockArticles.map(art => (
                 <div key={art.id} className={cn(
                   "p-4 rounded-xl transition-all",
                   selectedIssue === art.id ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-slate-50"
                 )}>
                    <h5 className="font-bold mb-2 text-slate-900 underline decoration-primary/30 underline-offset-4">{art.number} - {art.title}</h5>
                    <p>{appliedCorrections.includes(art.id) ? art.suggestion : art.text}</p>
                 </div>
               ))}
               <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-300 text-sm italic">
                  Belgenin devamı yükleniyor...
               </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden flex flex-col text-white">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Referans YÖK Mevzuatı</span>
               </div>
               <div className="flex gap-2">
                  <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all"><Share2 size={16} /></button>
               </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto space-y-12 leading-loose text-slate-400 text-sm">
               {mockArticles.map(art => (
                 <div key={art.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h5 className="font-bold text-slate-200">{art.yokReference}</h5>
                       <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded">RESMİ GAZETE NO: 29718</span>
                    </div>
                    <p className="border-l-2 border-primary/30 pl-4 py-2 bg-white/[0.02]">
                       {art.yokText}
                    </p>
                 </div>
               ))}
               <div className="p-12 border-2 border-white/5 rounded-3xl flex flex-col items-center gap-4 text-slate-600 bg-white/[0.01]">
                  <ArrowUpRight size={40} className="text-slate-700" />
                  <p>YÖK Mevzuat Veritabanından Daha Fazla Veri Getir</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
