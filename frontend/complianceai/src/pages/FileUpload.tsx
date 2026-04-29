import React, { useState } from 'react';
import { Upload, File, Trash2, CheckCircle2, ArrowRight, Loader2, Info, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function FileUpload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).map((file: File) => ({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      status: 'Yüklendi',
      category: 'Lisansüstü'
    }));
    setFiles([...files, ...newFiles]);
  };

  const startAnalysis = () => {
    setIsUploading(true);
    // Simulate processing
    setTimeout(() => {
      setIsUploading(false);
      navigate('/analysis');
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="flex items-center gap-2">
           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${files.length > 0 ? 'bg-success text-white' : 'bg-primary text-white'}`}>
              {files.length > 0 ? <CheckCircle2 size={16} /> : '1'}
           </div>
           <span className="text-sm font-medium text-slate-700">Belge Yükleme</span>
        </div>
        <div className="w-12 h-px bg-slate-200" />
        <div className="flex items-center gap-2 opacity-50">
           <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">2</div>
           <span className="text-sm font-medium text-slate-500">AI Analizi</span>
        </div>
        <div className="w-12 h-px bg-slate-200" />
        <div className="flex items-center gap-2 opacity-30">
           <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">3</div>
           <span className="text-sm font-medium text-slate-500">Sonuç Raporu</span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-medium tracking-tight text-slate-900">Mevzuat Taslağınızı Yükleyin</h1>
        <p className="text-slate-500 max-w-lg mx-auto text-sm">
          Üniversite yönetmeliği, disiplin yönergesi veya akademik teşvik taslaklarınızı PDF formatında yükleyerek analizi başlatabilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-6">
          <div className="group relative border-2 border-dashed border-slate-200 rounded-[32px] p-12 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:border-primary transition-all duration-300">
            <input 
              type="file" 
              multiple 
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-500">
              <Upload size={32} />
            </div>
            <p className="text-lg font-medium text-slate-700">Dosyaları Buraya Sürükleyin</p>
            <p className="text-slate-400 text-sm mt-1">veya bilgisayarınızdan seçmek için tıklayın</p>
            <div className="mt-8 flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>PDF</span>
              <span>DOCX</span>
              <span>MAX 50MB</span>
            </div>
          </div>

          <AnimatePresence>
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Yüklenen Belgeler ({files.length})</h3>
                  <button onClick={() => setFiles([])} className="text-xs text-danger font-bold hover:underline">Tümünü Kaldır</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {files.map((file, i) => (
                    <div key={i} className="py-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center">
                          <File size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{file.name}</p>
                          <p className="text-xs text-slate-400">{file.size} • {file.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <select 
  defaultValue="Lisansüstü"
  className="bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg outline-none focus:border-primary border-none bg-transparent"
>
  <option>Akademik</option>
  <option>İdari</option>
  <option>Öğrenci</option>
  <option>Lisansüstü</option>
</select>
                         <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="p-2 text-slate-300 hover:text-danger invisible group-hover:visible transition-all">
                            <Trash2 size={18} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-6 shadow-2xl shadow-indigo-900/20">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
               <Info size={24} className="text-indigo-200" />
            </div>
            <div className="space-y-2">
               <h3 className="text-lg font-medium">Analiz Öncesi Hatırlatma</h3>
               <p className="text-slate-400 text-xs leading-relaxed">
                 AI modelimiz belgeyi analiz ederken, YÖK'ün 2025 yılına ait en güncel çerçeve yönetmeliklerini temel alır.
               </p>
            </div>
            <div className="space-y-3 pt-4">
               <div className="flex items-center gap-2 text-[10px] font-bold text-success">
                  <CheckCircle2 size={14} /> SEMANTİK KONTROL AKTİF
               </div>
               <div className="flex items-center gap-2 text-[10px] font-bold text-success">
                  <CheckCircle2 size={14} /> REFERANS TAKİBİ ETKİN
               </div>
            </div>
          </div>

          <button 
            disabled={files.length === 0 || isUploading}
            onClick={startAnalysis}
            className={`w-full py-5 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${files.length > 0 ? 'bg-primary text-white shadow-primary/20 hover:scale-[1.02]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            {isUploading ? (
              <>Analiz Başlatılıyor... <Loader2 className="animate-spin" size={20} /></>
            ) : (
              <>Analizi Başlat <ArrowRight size={22} /></>
            )}
          </button>

          {isUploading && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3"
            >
               <AlertCircle size={20} className="text-amber-500 shrink-0" />
               <p className="text-[10px] text-amber-700 font-medium leading-normal">
                  Belgeniz devasa bir hukuk veritabanında taranıyor. Bu işlem dosya boyutuna göre 1-2 dakika sürebilir.
               </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
