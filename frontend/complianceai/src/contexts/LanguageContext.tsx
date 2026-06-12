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
const uiTerms: Record<string, string> = {
  'Uyumlu': 'Compliant', 'Kısmen Uyumlu': 'Partially Compliant', 'Uyumsuz': 'Non-Compliant',
  'Kapsam Dışı': 'Out of Scope', 'Tümü': 'All', 'Önerilen': 'Recommended',
  'Yükleniyor...': 'Loading...', 'Şimdi': 'Now', 'İptal': 'Cancel', 'Sil': 'Delete',
  'Kapat': 'Close', 'Kaydet': 'Save', 'Geri': 'Back', 'Devam': 'Continue',
  'Giriş Yap': 'Sign In', 'Hesap Oluştur': 'Create Account', 'Kayıt Ol': 'Register',
  'E-posta': 'Email', 'Şifre': 'Password', 'Ad Soyad': 'Full Name',
  'Özellikler': 'Features', 'Nasıl Çalışır?': 'How It Works', 'Teknoloji': 'Technology',
  'Ücretsiz Deneyin': 'Try It Free', 'Yeni Standart': 'A New Standard',
  'Otomatik Mevzuat Analizi': 'Automated Regulatory Analysis',
  'İleri Seviye RAG Modelleri': 'Advanced RAG Models', 'Hukuki Karar Destek': 'Legal Decision Support',
  'Belge Yükleme': 'Document Upload', 'AI Analizi': 'AI Analysis', 'Sonuç Raporu': 'Results Report',
  'Mevzuat Taslağınızı Yükleyin': 'Upload Your Policy Draft', 'Analiz Tamamlandı': 'Analysis Complete',
  'Genel Uyum Skoru': 'Overall Compliance Score', 'Uyumsuz Maddeler': 'Non-Compliant Articles',
  'Detaylı Raporu Gör': 'View Detailed Report', 'Yeni Analiz': 'New Analysis',
  'PDF Dosyasını Sürükleyin': 'Drag and Drop a PDF', 'Yüklenen Belgeler': 'Uploaded Documents',
  'Tümünü Kaldır': 'Remove All', 'Analiz Öncesi': 'Before Analysis', 'Analizi Başlat': 'Start Analysis',
  'Analiz Yapılıyor...': 'Analyzing...', 'Pipeline Seçimi': 'Pipeline Selection', 'Model Seçimi': 'Model Selection',
  'Sistem Yönetim Paneli': 'System Administration Dashboard', 'Hoş Geldiniz': 'Welcome',
  'Geçmiş Raporlar': 'Previous Reports', 'Yeni Mevzuat Yükle': 'Upload New Regulation',
  'Yeni Analiz Başlat': 'Start New Analysis', 'Aktif Analizler': 'Active Analyses',
  'Tamamlanan': 'Completed', 'Kritik Risk': 'Critical Risk', 'Bekleyen': 'Pending',
  'Gerçek zamanlı': 'Real Time', 'Son Analizler': 'Recent Analyses', 'Tümünü Gör': 'View All',
  'Henüz analiz yok.': 'No analyses yet.', 'İlk belgeyi yükle': 'Upload the first document',
  'Sistem Sağlığı': 'System Health', 'Mevzuat Arşivi': 'Regulation Archive',
  'Toplam Belge': 'Total Documents', 'Belge Adı': 'Document Name', 'Kategori': 'Category',
  'Uyum Skoru': 'Compliance Score', 'Durum': 'Status', 'Tarih': 'Date', 'İşlem': 'Action',
  'Henüz belge yok': 'No documents yet', 'İlk Belgeyi Yükle': 'Upload First Document',
  'Arama sonucu bulunamadı': 'No search results found', 'Detayları Gör': 'View Details',
  'Yönetim Paneli': 'Admin Dashboard',
  'Kullanıcı Yönetimi': 'User Management', 'Kullanıcılar': 'Users', 'Yükleyen': 'Uploaded By',
  'Kullanıcı bulunamadı.': 'No users found.', 'Belgeyi sil': 'Delete document',
  'Kullanıcıyı sil': 'Delete user', 'Silmek istediğinize emin misiniz?': 'Are you sure you want to delete this item?',
  'Uyumluluk Analizi': 'Compliance Analysis', 'Uyumluluk Analizleri': 'Compliance Analyses',
  'Belgenizdeki Metin': 'Text in Your Document', 'YÖK Mevzuatı': 'YÖK Regulation',
  'Değerlendirme Gerekçesi': 'Assessment Reasoning', 'Düzeltme Önerisi': 'Suggested Correction',
  'Uyum Dağılımı': 'Compliance Distribution', 'Skor formülü:': 'Score formula:',
  "Belgeyi PDF'te İncele": 'Review Document as PDF', 'Tüm maddeleri gör': 'View all articles',
  'Tıklayarak detay görebilirsiniz': 'Click to view details', 'Düzeltilmesi Gereken': 'Requiring Revision',
  'Bu filtreyle eşleşen madde yok.': 'No articles match this filter.',
  'Yüksek örtüşme': 'High similarity', 'Orta örtüşme': 'Moderate similarity', 'Düşük örtüşme': 'Low similarity',
  'Bilgi Portalı': 'Knowledge Portal', 'YÖK Hukuki Danışman': 'YÖK Legal Assistant',
  'Nasıl yardımcı olabilirim?': 'How can I help?', 'Henüz sohbet yok': 'No conversations yet',
  'Yeni Sohbet': 'New Conversation', 'Gönder': 'Send', 'Kaynaklar': 'Sources',
  'YÖK Mevzuat Kataloğu': 'YÖK Regulation Catalogue', 'Mevzuat Ara': 'Search Regulations',
  'Sonuçları Yenile': 'Refresh Results', 'RAG Karşılaştırma Deneyleri': 'RAG Comparison Experiments',
  'Deney sonuçları yükleniyor...': 'Loading experiment results...', 'Deney Ayarları': 'Experiment Settings',
  'Önerilen Yapılandırma': 'Recommended Configuration', 'Model Açıklamaları': 'Model Descriptions',
  'Doğruluk': 'Accuracy', 'Güven Skoru': 'Confidence Score', 'Hız': 'Speed',
  'Açıklanabilirlik': 'Explainability', 'Maliyet Verimi': 'Cost Efficiency',
  'Çok Boyutlu Model Analizi': 'Multidimensional Model Analysis',
  'Hız–Doğruluk Dengesi (Trade-off)': 'Speed–Accuracy Trade-off',
  'Chunk Boyutu Ablasyon Analizi': 'Chunk Size Ablation Analysis',
  'Top-K Ablasyon Analizi': 'Top-K Ablation Analysis', 'Sonuçlar ve Raporlar': 'Results and Reports',
  'Başlangıç Tarihi': 'Start Date', 'Bitiş Tarihi': 'End Date', 'Rapor Oluştur': 'Generate Report',
  'PDF Görüntüleyici': 'PDF Viewer', 'Yakınlaştır': 'Zoom In', 'Uzaklaştır': 'Zoom Out',
  'Önceki Sayfa': 'Previous Page', 'Sonraki Sayfa': 'Next Page', 'Sayfa': 'Page',
  // FileUpload page
  'LLM Modeli': 'LLM Model',
  'Anahtar kelime tabanlı — hızlı, deterministik': 'Keyword-based — fast, deterministic',
  'Vektör arama — anlam odaklı': 'Vector search — semantics-focused',
  'BM25 + Dense birleşimi — en yüksek doğruluk': 'BM25 + Dense fusion — highest accuracy',
  '19× daha ucuz, neredeyse aynı doğruluk': '19× cheaper, nearly identical accuracy',
  'En yüksek kalite, yüksek maliyet': 'Highest quality, higher cost',
  'SEMANTİK KONTROL AKTİF': 'SEMANTIC CHECK ACTIVE',
  'REFERANS TAKİBİ ETKİN': 'REFERENCE TRACKING ACTIVE',
  'Seçilen pipeline ile YÖK mevzuatı taranır, GPT ile madde bazlı uyum analizi yapılır. Sonuçlar veritabanına kaydedilir.': 'The selected pipeline searches YÖK regulations; GPT performs article-level compliance analysis. Results are saved to the database.',
  // Dashboard
  'Sistem Durumu': 'System Status', 'Toplam Analiz': 'Total Analyses', 'Uyum Oranı': 'Compliance Rate',
  'Son 30 Gün': 'Last 30 Days', 'Analiz Trendi': 'Analysis Trend',
  'Kategori Dağılımı': 'Category Distribution', 'Hızlı Erişim': 'Quick Access',
  'Sisteme Hoş Geldiniz': 'Welcome to the System',
  // Admin
  'Tüm Belgeler': 'All Documents', 'Tüm Kullanıcılar': 'All Users',
  'Sistem İstatistikleri': 'System Statistics',
  // Reports
  'Filtrele': 'Filter', 'Dışa Aktar': 'Export', 'Rapor İndir': 'Download Report',
  'Seçili Dönem': 'Selected Period',
  // YOK
  'Mevzuat Listesi': 'Regulation List', 'Kaynak Görüntüle': 'View Source',
  'Güncelleniyor...': 'Updating...', 'Mevzuat bulunamadı': 'No regulations found',
  // Experiments
  'Gecikme (sn)': 'Latency (s)', 'Maliyet ($)': 'Cost ($)', 'En İyi Yapılandırma': 'Best Configuration',
  // Knowledge Portal
  'Yeni Konuşma': 'New Conversation', 'Konuşma Geçmişi': 'Conversation History',
  'Soru sor...': 'Ask a question...', 'Kaynak bulunamadı': 'No sources found',
  // ComplianceAnalysis
  'Analiz Detayı': 'Analysis Detail', 'Geri Dön': 'Go Back',
  'Filtreleme': 'Filtering', 'Referans': 'Reference',
  'Gereke': 'Reasoning', 'Öneri': 'Suggestion',
  // Landing (Landing.tsx now uses direct bilingual copy object, these are for other pages)
  'Hesabınızı Oluşturun': 'Create Your Account', 'Tekrar Hoş Geldiniz': 'Welcome Back',
  'Birim Üyesi': 'Staff Member', 'Yönetici': 'Administrator',
  'Kullanıcı Türü': 'Account Type', 'E-Posta Adresi': 'Email Address',
  'Lütfen bekleyin...': 'Please wait...', 'Hesabı Başlat': 'Create Account',
  'YÖK Uyumlu': 'YÖK Compliant', 'Hata Tespit': 'Issues Found',
  'YÖK Uyumu İçin Tek Platform': 'The Single Platform for YÖK Compliance',
};

const phraseTerms: Array<[string, string]> = [
  ['madde analiz edildi', 'articles analyzed'], ['madde düzetilmeli', 'articles require revision'],
  ['belge gösteriliyor', 'documents displayed'], ['En son güncelleme:', 'Last updated:'],
  ['belge · Üyelik:', 'documents · Joined:'], ['test vakası', 'test cases'],
  ['Analiz sırasında bir hata oluştu', 'An error occurred during analysis'],
  ['Belgeler yüklenemedi', 'Documents could not be loaded'], ['Bir hata oluştu', 'An error occurred'],
  ['kullanıcısı silindi.', 'user was deleted.'], ['Silme işlemi başarısız.', 'Delete operation failed.'],
  ['veya bilgisayarınızdan seçmek için tıklayın', 'or click to select from your computer'],
  ['Üniversite yönetmeliği taslaklarınızı PDF formatında yükleyerek RAG tabanlı uyum analizini başlatın.', 'Upload university policy drafts in PDF format to start the RAG-based compliance analysis.'],
  ['Mevzuat denetim süreçleri ve güncel veri özeti.', 'Regulatory review processes and current data summary.'],
  ['Yüklenen tüm yönetmelik analizleri.', 'All uploaded policy analyses.'],
  ['Belge adı ara...', 'Search document name...'], ['kullanıcı', 'users'],
  ['Belge YÖK mevzuat veritabanında taranıyor', 'Document is being scanned in the YÖK regulation database'],
  ['90–180 saniye sürebilir', 'may take 90–180 seconds'],
  ['Lütfen bekleyin...', 'Please wait...'],
  ['şimdiden kullanmaya başladı', 'are already using it'],
  ['Kredi kartı gerekmez', 'No credit card required'],
  ['Anında erişim', 'Instant access'],
  ['Türkçe destek', 'Turkish support'],
  ['YÜkSEKÖĞTİM KURULU mevzuatıyla uyum artık elle takip edilmiyor', 'Compliance with YÖK regulations is no longer tracked manually'],
  ['madde madde analiz edin', 'analyse article by article'],
  ['uyumsuzlukları anında görün, somut düzeltme önerileri alın', 'spot non-compliance instantly and receive concrete correction suggestions'],
  ['Belgenizi yükleyin, yapay zeka geri kalanını halleder', 'Upload your document, AI handles the rest'],
  ['Mevzuat değişikliklerini manuel takip etme zahmetinden kurtulun', 'Stop tracking regulatory changes manually'],
  ['Üniversitenizin yönetmelik süreçlerini dijitalleştirin', 'Digitise your university’s policy processes'],
  ['Hukuki riskler fark edilmeden önce gelin', 'Identify legal risks before they surface'],
];

export function localizeText(value: string, language: Language): string {
  if (language === 'tr' || !value) return value;
  const trimmed = value.trim();
  if (uiTerms[trimmed]) return value.replace(trimmed, uiTerms[trimmed]);
  let translated = value;
  phraseTerms.forEach(([tr, en]) => { translated = translated.replaceAll(tr, en); });
  return translated;
}

export function localizeStatus(value: string, language: Language) {
  return language === 'en' ? (uiTerms[value] ?? value) : value;
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  text: (value: string) => string;
  status: (value: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('ymds_language') === 'en' ? 'en' : 'tr');

  useEffect(() => {
    localStorage.setItem('ymds_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key: TranslationKey) => translations[language][key],
    text: (value: string) => localizeText(value, language),
    status: (value: string) => localizeStatus(value, language),
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
