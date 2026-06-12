import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'tr' | 'en';

const translations = {
  tr: {
    loading: 'Yükleniyor...',
    mainMenu: 'Ana Menü', management: 'Yönetim', dashboard: 'Dashboard',
    overview: 'Genel Bakış', upload: 'Belge Yükle', analyses: 'Uyumluluk Analizleri',
    portal: 'Bilgi Portalı', regulations: 'YÖK Mevzuatı', adminPanel: 'Yönetim Paneli',
    experiments: 'RAG Karşılaştırma', help: 'Kullanım Yardımı', admin: 'Yönetici', user: 'Kullanıcı',
    logout: 'Çıkış Yap', regulationsCurrent: 'Mevzuat Güncel', adminAccess: 'Yönetici Erişimi',
    pageInfo: 'Sayfa Bilgisi', howTo: 'Nasıl Kullanılır?', close: 'Anladım, Kapat',
    helpAnalysisTitle: 'Belge Analiz Süreci', helpResultsTitle: 'Analiz Sonuçlarını Okuma',
    helpBotTitle: 'Akıllı Mevzuat Botu',
    helpAnalysis: 'Sistem üniversite yönetmelik taslaklarınızı güncel YÖK mevzuatıyla karşılaştırır. Belge Yükle sayfasından PDF dosyanızı yükleyip Analizi Başlat düğmesiyle incelemeyi başlatabilirsiniz.',
    helpResults: 'Uyumluluk Analizleri sayfasında her maddeye ait sonucu, dayanak mevzuatı, değerlendirme gerekçesini ve düzeltme önerilerini inceleyebilirsiniz.',
    helpBot: 'Bilgi Portalı üzerinden mevzuat hakkında doğal dilde sorular sorabilir ve kaynak metinlere dayalı yanıtlar alabilirsiniz.',
    overviewDesc: 'Sistem genelindeki uyum verilerini ve özet istatistikleri takip edin.',
    uploadDesc: 'Analiz edilmesini istediğiniz üniversite yönetmelik taslaklarını sisteme yükleyin.',
    analysesDesc: 'Belgelerinizi yönetin ve madde bazlı YÖK uyum analizlerini inceleyin.',
    portalDesc: 'Mevzuat sorularınızı yapay zekâya sorun ve kaynaklı yanıtlar alın.',
    regulationsDesc: 'Türk yükseköğretim mevzuatının güncel listesini ve kaynaklarını inceleyin.',
    adminDesc: 'YÖK mevzuatlarını, belgeleri ve kullanıcıları yönetin.',
    experimentsDesc: 'RAG pipeline ve dil modeli performanslarını karşılaştırın.',
    logoSubtitle: 'YÖK Mevzuatı Denetim Sistemi',
  },
  en: {
    loading: 'Loading...',
    mainMenu: 'Main Menu', management: 'Management', dashboard: 'Dashboard',
    overview: 'Overview', upload: 'Upload Document', analyses: 'Compliance Analyses',
    portal: 'Knowledge Portal', regulations: 'YÖK Regulations', adminPanel: 'Admin Dashboard',
    experiments: 'RAG Comparison', help: 'User Guide', admin: 'Administrator', user: 'User',
    logout: 'Sign Out', regulationsCurrent: 'Regulations Up to Date', adminAccess: 'Administrator Access',
    pageInfo: 'Page Information', howTo: 'How Does It Work?', close: 'Got It, Close',
    helpAnalysisTitle: 'Document Analysis Process', helpResultsTitle: 'Reading Analysis Results',
    helpBotTitle: 'Regulatory Assistant',
    helpAnalysis: 'The system compares university policy drafts with current YÖK regulations. Upload a PDF on the Upload Document page and start the review with the Start Analysis button.',
    helpResults: 'On the Compliance Analyses page, you can inspect each article’s result, regulatory basis, assessment reasoning, and suggested corrections.',
    helpBot: 'Use the Knowledge Portal to ask natural-language questions about regulations and receive answers grounded in source passages.',
    overviewDesc: 'Track system-wide compliance data and summary statistics.',
    uploadDesc: 'Upload university policy drafts for regulatory compliance analysis.',
    analysesDesc: 'Manage documents and inspect article-level YÖK compliance analyses.',
    portalDesc: 'Ask the AI regulatory questions and receive source-grounded answers.',
    regulationsDesc: 'Browse the current Turkish higher education regulations and sources.',
    adminDesc: 'Manage YÖK regulations, documents, and user accounts.',
    experimentsDesc: 'Compare RAG pipeline and language model performance.',
    logoSubtitle: 'Higher Education Regulatory Compliance System',
  },
} as const;

type TranslationKey = keyof typeof translations.tr;
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string };

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('ymds_language') === 'en' ? 'en' : 'tr');

  useEffect(() => {
    localStorage.setItem('ymds_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t: (key: TranslationKey) => translations[language][key] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
