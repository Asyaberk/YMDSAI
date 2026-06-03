import React, { useState } from 'react';
import {
  Upload, File, Trash2, CheckCircle2, ArrowRight,
  Loader2, AlertCircle, Info, FlaskConical, Cpu,
  ShieldCheck, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { documents, DocumentDetail } from '../lib/api';

type Pipeline = 'bm25' | 'dense' | 'hybrid';
type Model    = 'gpt-4o-mini' | 'gpt-4o';

interface UploadedFile { file: File; name: string; size: string; }

const PIPELINES: { id: Pipeline; label: string; desc: string; badge?: string }[] = [
  { id: 'bm25',   label: 'BM25',   desc: 'Anahtar kelime tabanlı — hızlı, deterministik' },
  { id: 'dense',  label: 'Dense',  desc: 'Vektör arama — anlam odaklı' },
  { id: 'hybrid', label: 'Hybrid', desc: 'BM25 + Dense birleşimi — en yüksek doğruluk', badge: 'Önerilen' },
];

const MODELS: { id: Model; label: string; desc: string; badge?: string }[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', desc: '19× daha ucuz, neredeyse aynı doğruluk', badge: 'Önerilen' },
  { id: 'gpt-4o',      label: 'GPT-4o',      desc: 'En yüksek kalite, yüksek maliyet' },
];

export default function FileUpload() {
  const navigate = useNavigate();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pipeline, setPipeline]     = useState<Pipeline>('hybrid');
  const [model, setModel]           = useState<Model>('gpt-4o-mini');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult]         = useState<DocumentDetail | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [step, setStep]             = useState<1 | 2 | 3>(1);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).map(f => ({
      file: f,
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const newFiles = Array.from(e.dataTransfer.files)
      .filter(f => f.type === 'application/pdf')
      .map(f => ({ file: f, name: f.name, size: (f.size / 1024 / 1024).toFixed(2) + ' MB' }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setStep(2);

    try {
      // Analyze the first file (one at a time)
      const res = await documents.upload(uploadedFiles[0].file, pipeline, model);
      setResult(res);
      setStep(3);
    } catch (e: any) {
      setError(e.message ?? 'Analiz sırasında bir hata oluştu');
      setStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const statusColor = (s: string) =>
    s === 'Uyumlu' ? 'text-success bg-success/10' :
    s === 'Kısmen Uyumlu' ? 'text-warning bg-warning/10' :
    'text-danger bg-danger/10';

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4">
        {[
          { n: 1, label: 'Belge Yükleme' },
          { n: 2, label: 'AI Analizi' },
          { n: 3, label: 'Sonuç Raporu' },
        ].map(({ n, label }, i) => (
          <React.Fragment key={n}>
            {i > 0 && <div className="w-12 h-px bg-slate-200" />}
            <div className={`flex items-center gap-2 ${step < n ? 'opacity-40' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${step > n ? 'bg-success text-white' : step === n ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                {step > n ? <CheckCircle2 size={16} /> : n}
              </div>
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-medium tracking-tight text-slate-900">Mevzuat Taslağınızı Yükleyin</h1>
        <p className="text-slate-500 max-w-lg mx-auto text-sm">
          Üniversite yönetmeliği taslaklarınızı PDF formatında yükleyerek RAG tabanlı uyum analizini başlatın.
        </p>
      </div>

      {/* Sonuç Ekranı */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 space-y-6 border border-slate-100 rounded-[32px]"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Analiz Tamamlandı</h2>
                <p className="text-sm text-slate-400 mt-1">{result.name}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${statusColor(result.status)}`}>
                {result.status}
              </span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={result.complianceScore > 80 ? '#22c55e' : result.complianceScore > 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${result.complianceScore} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900">%{result.complianceScore}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-bold text-slate-700">Genel Uyum Skoru</p>
                <div className="flex gap-4 text-xs font-medium text-slate-500">
                  <span>Pipeline: <strong className="text-primary">{result.pipeline?.toUpperCase()}</strong></span>
                  <span>Model: <strong className="text-primary">{result.model}</strong></span>
                  <span>{result.articleCount} madde analiz edildi</span>
                </div>
              </div>
            </div>

            {/* Uyumsuz maddeler */}
            {result.nonCompliantArticles && result.nonCompliantArticles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Uyumsuz Maddeler</p>
                <div className="space-y-2">
                  {result.nonCompliantArticles.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-danger/5 border border-danger/10 rounded-xl">
                      <AlertTriangle size={14} className="text-danger shrink-0" />
                      <span className="text-sm text-slate-700">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/analysis')}
                className="flex-1 btn-primary py-4 flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} /> Detaylı Raporu Gör
              </button>
              <button
                onClick={() => { setResult(null); setUploadedFiles([]); setStep(1); }}
                className="px-6 py-4 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Yeni Analiz
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-2 space-y-6">

            {/* Drop Zone */}
            <div
              className="group relative border-2 border-dashed border-slate-200 rounded-[32px] p-12 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:border-primary transition-all duration-300"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileSelect}
              />
              <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-500">
                <Upload size={32} />
              </div>
              <p className="text-lg font-medium text-slate-700">PDF Dosyasını Sürükleyin</p>
              <p className="text-slate-400 text-sm mt-1">veya bilgisayarınızdan seçmek için tıklayın</p>
              <div className="mt-6 flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>PDF</span><span>•</span><span>Max 50MB</span>
              </div>
            </div>

            {/* Dosya listesi */}
            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">Yüklenen Belgeler ({uploadedFiles.length})</h3>
                    <button onClick={() => setUploadedFiles([])} className="text-xs text-danger font-bold hover:underline">Tümünü Kaldır</button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center">
                            <File size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{f.name}</p>
                            <p className="text-xs text-slate-400">{f.size}</p>
                          </div>
                        </div>
                        <button onClick={() => setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== i))}
                          className="p-2 text-slate-300 hover:text-danger invisible group-hover:visible transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pipeline Seçici */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <FlaskConical size={16} className="text-primary" />
                <h3 className="font-bold text-sm text-slate-800">Retrieval Pipeline</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {PIPELINES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPipeline(p.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all space-y-1 relative
                      ${pipeline === p.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    {p.badge && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
                        {p.badge}
                      </span>
                    )}
                    <p className={`text-sm font-bold ${pipeline === p.id ? 'text-primary' : 'text-slate-700'}`}>{p.label}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Seçici */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-primary" />
                <h3 className="font-bold text-sm text-slate-800">LLM Modeli</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all space-y-1 relative
                      ${model === m.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    {m.badge && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
                        {m.badge}
                      </span>
                    )}
                    <p className={`text-sm font-bold ${model === m.id ? 'text-primary' : 'text-slate-700'}`}>{m.label}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sağ panel */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-6 shadow-2xl shadow-indigo-900/20">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Info size={24} className="text-indigo-200" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Analiz Öncesi</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Seçilen pipeline ile YÖK mevzuatı taranır, GPT ile madde bazlı uyum analizi yapılır. Sonuçlar veritabanına kaydedilir.
                </p>
              </div>
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-[10px] font-bold text-success">
                  <CheckCircle2 size={14} /> SEMANTİK KONTROL AKTİF
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-success">
                  <CheckCircle2 size={14} /> REFERANS TAKİBİ ETKİN
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <FlaskConical size={14} /> Pipeline: <span className="text-white ml-1">{pipeline.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <button
              disabled={uploadedFiles.length === 0 || isAnalyzing}
              onClick={startAnalysis}
              className={`w-full py-5 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl
                ${uploadedFiles.length > 0 && !isAnalyzing
                  ? 'bg-primary text-white shadow-primary/20 hover:scale-[1.02]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {isAnalyzing ? (
                <><Loader2 className="animate-spin" size={20} /> Analiz Yapılıyor...</>
              ) : (
                <>Analizi Başlat <ArrowRight size={22} /></>
              )}
            </button>

            {isAnalyzing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Belge YÖK mevzuat veritabanında taranıyor. Pipeline: <strong>{pipeline.toUpperCase()}</strong>, Model: <strong>{model}</strong>. 90–180 saniye sürebilir.
                </p>
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0" />
                <p className="text-[11px] text-red-700 font-medium">{error}</p>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
