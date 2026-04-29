import React, { useState } from 'react';
import { Search, Send, ThumbsUp, ThumbsDown, ExternalLink, Clock, Bot, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function KnowledgePortal() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [history, setHistory] = useState([
    { q: 'Yatay geçiş kontenjanları nasıl belirlenir?', a: 'Yükseköğretim kurumlarında yatay geçiş kontenjanları, her yıl YÖK tarafından belirlenen çerçeve yönetmelik uyarınca, ilgili üniversitenin senatosu tarafından karara bağlanır. Genellikle her bir diploma programı için o yılki öğrenci kontenjanının %15\'i ile %30\'u arasında bir oran belirlenir.' },
    { q: 'Azami öğrenim süresi dolan öğrenciler ne yapmalı?', a: '2547 sayılı Kanun\'un 44. maddesi uyarınca, azami öğrenim süresini tamamlayan öğrencilere başarısız oldukları dersler için iki ek sınav hakkı verilir. Bu sınavlar sonunda mezuniyet için gereken ders sayısını beşe indirenlere üç yarıyıl ek süre tanınır.' }
  ]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSearch = (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const finalQuery = customQuery || query;
    if (!finalQuery.trim()) return;
    
    setIsSearching(true);
    setShowResult(false);
    
    if (customQuery) setQuery(customQuery);

    setTimeout(() => {
      setIsSearching(false);
      setShowResult(true);
      setHistory(prev => [...prev, { q: finalQuery, a: 'YÖK 2547 sayılı kanun ve ilgili yönetmelikler uyarınca, sorduğunuz konu hakkında üniversite senatosunun belirlediği esaslar geçerlisi. Mevcut mevzuat, akademik özgürlük ve idari özerklik çerçevesinde bu durumu düzenlemektedir.' }]);
    }, 1500);
  };

  const suggestions = [
    "Yatay geçiş için şartlar nelerdir?",
    "Azami öğrenim süresi kaç yıldır?",
    "Disiplin cezaları nelerdir?",
    "Doktora programına kabul koşulları?"
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
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

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-medium">YÖK Mevzuatı Bilgi Portalı</h1>
        <p className="text-slate-500">RAG destekli yapay zeka, sorularınızı ilgili yasa maddelerine dayandırarak yanıtlar.</p>
      </div>

      {/* Chat History */}
      <div className="space-y-6 mb-8">
        {history.map((chat, i) => (
          <div key={i} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-end">
              <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-sm">
                {chat.q}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-academic/10 text-academic rounded-full flex items-center justify-center flex-shrink-0">
                <Bot size={18} />
              </div>
              <div className="bg-white border border-gray-200 text-slate-700 px-4 py-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm shadow-md leading-relaxed">
                {chat.a}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Input */}
      <div className="sticky bottom-8 bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-gray-200 shadow-xl z-20">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            placeholder="Mevzuat hakkında bir soru sorun..." 
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 pr-32 outline-none focus:border-primary focus:bg-white transition-all text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-primary text-white px-6 rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
            disabled={isSearching}
          >
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={18} />
            )}
            Sorgula
          </button>
        </form>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button 
              key={s}
              className="text-[10px] bg-white border border-gray-200 text-slate-500 px-3 py-1.5 rounded-full hover:border-primary hover:text-primary transition-all shadow-sm"
              onClick={() => handleSearch(undefined, s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Search Result (CRAG View) */}
      {showResult && (
        <div className="card border-primary/20 bg-primary/5 animate-in zoom-in-95 duration-300 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="status-pill bg-academic text-white text-[10px] font-bold">CRAG MODEL</span>
              <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium">
                <span className="flex items-center gap-1"><Clock size={12} /> 1.4s</span>
                <span className="flex items-center gap-1"><Search size={12} /> 0.91 Cosine Sim</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => showNotification('Geri bildiriminiz için teşekkürler!')}
                className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-success transition-all"
              >
                <ThumbsUp size={16} />
              </button>
              <button 
                onClick={() => showNotification('Geri bildiriminiz için teşekkürler!')}
                className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-danger transition-all"
              >
                <ThumbsDown size={16} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-primary/5 mb-6">
            <p className="text-sm text-slate-700 leading-relaxed">
              {history[history.length - 1].a}
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kaynak Referansları</p>
            <div className="flex flex-wrap gap-3">
              {['YÖK 2547 s.k. Md.44', 'Lisansüstü Yön. Md.12', 'Senato Kararı 2024/12'].map(ref => (
                <button 
                  key={ref} 
                  onClick={() => showNotification(`Kaynak belge açılıyor: ${ref}`)}
                  className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs text-primary font-medium hover:border-primary hover:shadow-md transition-all"
                >
                  {ref}
                  <ExternalLink size={12} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Erişilen Metin Parçası 1</p>
              <p className="text-[11px] text-slate-600 italic">"Yükseköğretim kurumlarında öğrenim gören öğrencilere tanınacak haklar ve yükümlülükler..."</p>
            </div>
            <div className="p-4 bg-white/50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Erişilen Metin Parçası 2</p>
              <p className="text-[11px] text-slate-600 italic">"Azami sürelerin hesaplanmasında kayıt dondurulan süreler dikkate alınmaz..."</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
