import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  FileSearch, 
  FlaskConical, 
  MessageSquare, 
  CheckCircle2,
  User as UserIcon,
  BookOpen,
  Settings,
  Mail,
  Lock,
  ChevronRight,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';

export default function Landing() {
  const { login, register, user, error: authError } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'none' | 'login' | 'register'>('none');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'USER' as 'USER' | 'ADMIN' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);
    try {
      if (authMode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name || 'Yeni Kullanıcı', formData.email, formData.password, formData.role);
      }
    } catch (e: any) {
      setApiError(e.message ?? 'Bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset error when switching modes
  const switchMode = (mode: 'login' | 'register' | 'none') => {
    setApiError(null);
    setAuthMode(mode);
  };

  const features = [
    {
      icon: FileSearch,
      title: "Otomatik Mevzuat Analizi",
      description: "Üniversite yönetmelik taslaklarını YÖK çerçeve kanunlarıyla saniyeler içinde karşılaştırın ve riskleri görün."
    },
    {
      icon: FlaskConical,
      title: "İleri Seviye RAG Modelleri",
      description: "Graph-RAG ve CRAG teknolojileri ile metinler arası hiyerarşik bağları ve atıfları kusursuz takip edin."
    },
    {
      icon: MessageSquare,
      title: "Hukuki Karar Destek",
      description: "Karmaşık sorularda yasal dayanaklı yanıtlar alın, hukuki süreçlerinizi veriye dayalı yönetin."
    }
  ];

  return (
    <div className="min-h-screen bg-white selection:bg-primary selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 px-8 py-6 flex justify-between items-center bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <Logo />
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a href="#ozellikler" className="hover:text-primary transition-colors">Özellikler</a>
          <a href="#nasil-calisir" className="hover:text-primary transition-colors">Nasıl Çalışır?</a>
          <a href="#teknoloji" className="hover:text-primary transition-colors">Teknoloji</a>
        </div>
        <div className="flex items-center gap-4">
          <button           onClick={() => switchMode('login')}
            className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
          >
            Giriş Yap
          </button>
          <button                   onClick={() => switchMode('register')}
            className="btn-primary"
          >
            Hesap Oluştur
          </button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 px-8 overflow-hidden">
          {/* Background Decor */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%] bg-radial from-primary/5 via-transparent to-transparent -z-10 pointer-events-none" />
          
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Üniversiteler İçin AI Denetim
              </div>
              <h1 className="text-6xl lg:text-8xl font-medium tracking-tight leading-[0.95] text-slate-900">
                Mevzuat Denetiminde <br/>
                <span className="text-primary italic relative">
                  Yeni Standart
                  <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0,5 Q50,10 100,5" stroke="currentColor" fill="none" strokeWidth="2" />
                  </svg>
                </span>
              </h1>
              <p className="text-xl text-slate-500 max-w-lg leading-relaxed">
                Üniversite yönetmelik taslaklarını YÖK çerçeve kanunlarıyla saniyeler içinde analiz edin, riskleri raporlayın ve düzeltme önerileri alın.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <button 
                onClick={() => switchMode('register')}
                  className="px-8 py-5 rounded-2xl bg-primary text-white font-bold text-lg flex items-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all"
                >
                  Ücretsiz Deneyin <ArrowRight size={22} />
                </button>
              </div>

              <div className="flex items-center gap-6 pt-8">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-400">
                  <span className="font-bold text-slate-900">12+ Üniversite</span> şimdiden kullanmaya başladı.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 bg-white p-2 rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.1)] border border-slate-100">
                <div className="bg-slate-950 rounded-[28px] overflow-hidden aspect-[4/3] relative group">
                  {/* Mock UI */}
                  <div className="absolute inset-0 p-8 flex flex-col gap-6">
                    <div className="flex justify-between items-center opacity-40">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      </div>
                      <div className="w-32 h-2 bg-white/20 rounded-full" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="h-4 w-1/2 bg-white/10 rounded-full" />
                      <div className="h-8 w-3/4 bg-white/20 rounded-lg animate-pulse" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-40 bg-primary/20 rounded-2xl border border-primary/30 flex flex-col items-center justify-center gap-4 text-primary">
                        <CheckCircle2 size={40} />
                        <div className="text-center">
                          <p className="text-2xl font-bold">%87</p>
                          <p className="text-[10px] uppercase tracking-widest font-bold">Uyum Skoru</p>
                        </div>
                      </div>
                      <div className="h-40 bg-red-500/10 rounded-2xl border border-red-500/20 flex flex-col items-center justify-center gap-4 text-red-400">
                        <ShieldAlert size={40} />
                        <div className="text-center">
                          <p className="text-2xl font-bold">11</p>
                          <p className="text-[10px] uppercase tracking-widest font-bold">Hata Tespit</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 bg-white/5 rounded-2xl border border-white/5 p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10" />
                        <div className="flex-1 space-y-2">
                          <div className="h-2 w-full bg-white/5 rounded" />
                          <div className="h-2 w-2/3 bg-white/5 rounded" />
                        </div>
                      </div>
                      <div className="h-0.5 w-full bg-white/5" />
                      <div className="flex justify-between items-center">
                         <div className="w-24 h-6 bg-primary rounded-full shadow-lg shadow-primary/20" />
                         <div className="w-16 h-2 bg-white/10 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Cards */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-10 -right-10 z-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-success/10 text-success rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Durum</p>
                   <p className="text-xs font-bold text-slate-900">YÖK Uyumlu</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="ozellikler" className="py-32 px-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-24">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <h2 className="text-4xl font-medium tracking-tight text-slate-900">Hukuki Süreçleriniz İçin Tek Platform</h2>
              <p className="text-lg text-slate-500">Mevzuat değişikliklerini manuel takip etme zahmetinden kurtulun. ComplianceAI her şeyi sizin için analiz eder.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 text-center">
               {features.map((f, i) => (
                 <div key={i} className="space-y-6 group">
                    <div className="w-20 h-20 bg-white rounded-[32px] shadow-xl shadow-slate-200/50 mx-auto flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                      <f.icon size={32} />
                    </div>
                    <h3 className="text-2xl font-medium text-slate-900">{f.title}</h3>
                    <p className="text-slate-500 leading-relaxed">{f.description}</p>
                 </div>
               ))}
            </div>
          </div>
        </section>
      </main>

      {/* Auth Overlays */}
      <AnimatePresence>
        {authMode !== 'none' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative"
            >
              <button               onClick={() => switchMode('none')}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                id="close-auth"
              >
                <X size={24} />
              </button>

              <div className="p-10 space-y-8">
                <div className="text-center space-y-2">
                  <Logo showText={false} size={64} className="mx-auto mb-4" />
                  <h2 className="text-3xl font-medium tracking-tight text-slate-900">
                    {authMode === 'login' ? 'Tekrar Hoş Geldiniz' : 'Hesabınızı Oluşturun'}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {authMode === 'login' 
                      ? 'Üniversite mevzuat denetim sistemine giriş yapın.' 
                      : 'Hukuki analiz süreçlerinizi bugün dijitalleştirin.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Error message */}
                  {(apiError || authError) && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
                      <AlertTriangle size={14} />
                      {apiError || authError}
                    </div>
                  )}

                  {authMode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ad Soyad</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-sm"
                          placeholder="Örn: Dr. Ahmet Öz"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-Posta Adresi</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-sm"
                        placeholder="isim@universite.edu.tr"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Şifre</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-sm"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Kullanıcı Türü</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, role: 'USER'})}
                        className={`py-3 rounded-xl border text-xs font-bold transition-all ${formData.role === 'USER' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                        id="role-user"
                      >
                        Birim Üyesi
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, role: 'ADMIN'})}
                        className={`py-3 rounded-xl border text-xs font-bold transition-all ${formData.role === 'ADMIN' ? 'bg-academic border-academic text-white shadow-lg shadow-academic/20' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                        id="role-admin"
                      >
                        Yönetici
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-primary py-5 text-lg shadow-xl shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    id="submit-auth"
                  >
                    {isSubmitting ? 'Lütfen bekleyin...' : authMode === 'login' ? 'Giriş Yap' : 'Hesabı Başlat'}
                  </button>
                </form>

                <div className="text-center text-sm text-slate-400">
                  {authMode === 'login' ? (
                    <p>Hesabınız yok mu? <button onClick={() => switchMode('register')} className="text-primary font-bold hover:underline">Hemen Oluşturun</button></p>
                  ) : (
                    <p>Zaten hesabınız var mı? <button onClick={() => switchMode('login')} className="text-primary font-bold hover:underline">Giriş Yapın</button></p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
