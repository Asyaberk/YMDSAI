import { Document, RAGModel, Article, CategoryScore, TrendData } from './types';

export const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Akademik Teşvik Ödeneği Uygulama Esasları',
    category: 'Akademik',
    status: 'Uyumlu',
    articleCount: 24,
    nonCompliantArticles: [],
    uploadDate: '2025-03-15'
  },
  {
    id: '2',
    name: 'Öğrenci Disiplin Yönetmeliği Taslağı',
    category: 'Disiplin',
    status: 'Uyumsuz',
    articleCount: 42,
    nonCompliantArticles: ['Madde 12: Savunma Hakkı', 'Madde 15: Uzaklaştırma Süresi'],
    uploadDate: '2025-04-01'
  },
  {
    id: '3',
    name: 'Lisansüstü Eğitim ve Öğretim Yönetmeliği',
    category: 'Lisansüstü',
    status: 'Kısmen Uyumlu',
    articleCount: 56,
    nonCompliantArticles: ['Madde 8: Tez İzleme Komitesi Oluşumu'],
    uploadDate: '2025-03-28'
  },
  {
    id: '4',
    name: 'Döner Sermaye İşletmesi Yönetmeliği',
    category: 'Mali',
    status: 'Uyumsuz',
    articleCount: 18,
    nonCompliantArticles: ['Madde 5: Pay Dağıtım Oranları', 'Madde 9: Harcama Yetkisi'],
    uploadDate: '2025-04-05'
  },
  {
    id: '5',
    name: 'Yurt Dışı Öğrenci Kabul Yönergesi',
    category: 'Yurt Dışı',
    status: 'Uyumlu',
    articleCount: 12,
    nonCompliantArticles: [],
    uploadDate: '2025-02-20'
  }
];

export const ragModels: RAGModel[] = [
  {
    id: 'vanilla',
    name: 'Vanilla RAG',
    f1: 0.81,
    precision: 0.79,
    recall: 0.83,
    latency: 0.8,
    explainability: 3,
    category: 'Simple',
    description: 'Standart vektör tabanlı arama ve üretim döngüsü. Hızlı ancak karmaşık hukuk metinlerinde bağlamı kaçırabilir.',
    pros: ['Düşük gecikme süresi', 'Kolay kurulum'],
    cons: ['Sınırlı bağlam anlama', 'Halüsinasyon riski yüksek']
  },
  {
    id: 'graph',
    name: 'Graph-RAG',
    f1: 0.88,
    precision: 0.87,
    recall: 0.89,
    latency: 2.1,
    explainability: 5,
    category: 'Complex',
    description: 'Bilgi grafiği kullanarak kavramlar arası ilişkileri analiz eder. Mevzuat maddeleri arasındaki atıfları en iyi takip eden modeldir.',
    pros: ['Yüksek doğruluk', 'Mükemmel açıklanabilirlik'],
    cons: ['Yüksek hesaplama maliyeti', 'Yavaş yanıt süresi']
  },
  {
    id: 'prompt',
    name: 'Prompt-Enhanced RAG',
    f1: 0.85,
    precision: 0.84,
    recall: 0.86,
    latency: 1.2,
    explainability: 4,
    category: 'Medium',
    description: 'Gelişmiş prompt mühendisliği ve çok adımlı sorgulama teknikleri ile standart RAG performansını artırır.',
    pros: ['Dengeli performans', 'Esnek yapı'],
    cons: ['Prompt hassasiyeti', 'Orta seviye gecikme']
  },
  {
    id: 'hyde',
    name: 'HyDE RAG',
    f1: 0.84,
    precision: 0.86,
    recall: 0.82,
    latency: 1.5,
    explainability: 3,
    category: 'Medium',
    description: 'Hypothetical Document Embeddings kullanarak arama kalitesini artırır. Eksik veya kapalı soruları daha iyi anlar.',
    pros: ['Zayıf sorularda başarı', 'Geniş kapsam'],
    cons: ['Yanlış varsayım riski', 'Vektör uzayı karmaşıklığı']
  },
  {
    id: 'self',
    name: 'Self-RAG',
    f1: 0.87,
    precision: 0.88,
    recall: 0.86,
    latency: 2.8,
    explainability: 4,
    category: 'Complex',
    description: 'Kendi ürettiği yanıtları eleştirel bir süzgeçten geçirerek doğruluğu kontrol eder. Hukuki kesinlik için idealdir.',
    pros: ['Kendi kendini düzeltme', 'Düşük hata payı'],
    cons: ['Çok yavaş', 'Karmaşık mimari']
  },
  {
    id: 'crag',
    name: 'CRAG (Corrective RAG)',
    f1: 0.91,
    precision: 0.92,
    recall: 0.90,
    latency: 3.2,
    explainability: 4,
    category: 'Complex',
    description: 'Arama sonuçlarının kalitesini dinamik olarak değerlendirir ve gerekirse harici kaynaklardan doğrulama yapar.',
    pros: ['En yüksek F1 skoru', 'Güvenilir referanslar'],
    cons: ['En yüksek gecikme', 'Yüksek token kullanımı']
  },
  {
    id: 'fusion',
    name: 'RAG-Fusion',
    f1: 0.89,
    precision: 0.88,
    recall: 0.90,
    latency: 2.5,
    explainability: 3,
    category: 'Medium',
    description: 'Sorguyu farklı açılardan yeniden oluşturarak birden fazla arama yapar ve sonuçları birleştirir.',
    pros: ['Geniş kapsama alanı', 'Zengin içerik'],
    cons: ['Tekrarlayan bilgi riski', 'Orta-yüksek gecikme']
  }
];

export const categoryScores: CategoryScore[] = [
  { name: 'Akademik Yönetim', score: 94 },
  { name: 'Öğrenci İşleri', score: 89 },
  { name: 'Disiplin Hükümleri', score: 76 },
  { name: 'Mali Düzenlemeler', score: 61 },
  { name: 'Lisansüstü Esaslar', score: 91 },
  { name: 'Yurt Dışı Öğrenci', score: 83 }
];

export const trendData: TrendData[] = [
  { month: 'Kasım', uyumlu: 72, kismen: 18, uyumsuz: 10 },
  { month: 'Aralık', uyumlu: 75, kismen: 16, uyumsuz: 9 },
  { month: 'Ocak', uyumlu: 78, kismen: 15, uyumsuz: 7 },
  { month: 'Şubat', uyumlu: 82, kismen: 12, uyumsuz: 6 },
  { month: 'Mart', uyumlu: 85, kismen: 10, uyumsuz: 5 },
  { month: 'Nisan', uyumlu: 87, kismen: 9, uyumsuz: 4 }
];

export const mockArticles: Article[] = [
  {
    id: 'a1',
    number: 'Madde 12',
    title: 'Savunma Hakkı ve Süreler',
    status: 'Uyumsuz',
    similarity: 0.62,
    text: 'Disiplin soruşturmalarında ilgiliye savunmasını yapması için 3 iş günü süre verilir. Bu süre içinde savunma yapılmazsa hak kaybedilir.',
    yokReference: 'YÖK Öğrenci Disiplin Yönetmeliği Madde 15',
    yokText: 'Savunma için verilen süre yedi günden az olamaz. Savunma davetiyesinde, yedi günden az olmamak üzere bir süre verilir.',
    reasoning: [
      'Üniversite yönetmeliği 3 gün süre tanırken, YÖK çerçeve yönetmeliği minimum 7 gün şartı koşmaktadır.',
      'Sürenin yetersizliği, savunma hakkının kısıtlanması anlamına gelmektedir.',
      'Hukuki hiyerarşi gereği üst norm olan YÖK yönetmeliğine uyum zorunludur.'
    ],
    suggestion: 'Savunma süresinin "en az yedi gün" olacak şekilde güncellenmesi gerekmektedir.'
  },
  {
    id: 'a2',
    number: 'Madde 8',
    title: 'Tez İzleme Komitesi Oluşumu',
    status: 'Kısmen Uyumlu',
    similarity: 0.84,
    text: 'Tez izleme komitesi, biri tez danışmanı olmak üzere üç öğretim üyesinden oluşur. Komite üyeleri enstitü yönetim kurulu tarafından atanır.',
    yokReference: 'Lisansüstü Eğitim ve Öğretim Yönetmeliği Madde 18',
    yokText: 'Komite, biri tez danışmanı, biri enstitü ana bilim dalı içinden ve biri dışından olmak üzere üç öğretim üyesinden oluşur.',
    reasoning: [
      'Üye sayısı uyumludur (3 kişi).',
      'Ancak üyelerin dağılımı (iç/dış üye dengesi) üniversite metninde belirtilmemiştir.',
      'YÖK yönetmeliği spesifik olarak bir üyenin ana bilim dalı dışından olmasını şart koşmaktadır.'
    ],
    suggestion: 'Komite üyelerinin dağılımına ilişkin "bir üye ana bilim dalı dışından" ibaresinin eklenmesi önerilir.'
  },
  {
    id: 'a3',
    number: 'Madde 5',
    title: 'Pay Dağıtım Oranları',
    status: 'Uyumsuz',
    similarity: 0.45,
    text: 'Döner sermaye gelirlerinden öğretim üyelerine yapılacak ek ödeme oranı, birim gelirinin %60\'ını geçemez.',
    yokReference: '2547 Sayılı Kanun, Madde 58',
    yokText: 'Döner sermaye gelirlerinden yapılacak ek ödemelerin toplamı, ilgili birimin bir önceki yıl gelirinin %45\'ini aşamaz.',
    reasoning: [
      'Üniversite tarafından belirlenen %60 oranı, kanuni sınır olan %45\'in üzerindedir.',
      'Mali mevzuat açısından bu durum usulsüz ödeme riski taşımaktadır.',
      'Oranın ivedilikle kanuni sınıra çekilmesi gerekmektedir.'
    ],
    suggestion: 'Ek ödeme tavan oranının %45 olarak revize edilmesi zorunludur.'
  },
  {
    id: 'a4',
    number: 'Madde 1',
    title: 'Amaç ve Kapsam',
    status: 'Uyumlu',
    similarity: 0.98,
    text: 'Bu yönetmeliğin amacı, lisansüstü eğitim-öğretim ve sınavlara ilişkin usul ve esasları düzenlemektir.',
    yokReference: 'Lisansüstü Eğitim Yönetmeliği Madde 1',
    yokText: 'Bu Yönetmeliğin amacı; lisansüstü eğitim, öğretim ve sınavlarda uygulanacak usul ve esasları belirlemektir.',
    reasoning: ['Amaç ve kapsam ifadeleri YÖK çerçeve yönetmeliği ile tam uyumludur.'],
    suggestion: ''
  },
  {
    id: 'a5',
    number: 'Madde 2',
    title: 'Öğrenci Kabulü',
    status: 'Uyumlu',
    similarity: 0.95,
    text: 'Lisansüstü programlara başvurabilmek için adayların lisans diplomasına ve ALES puanına sahip olmaları gerekir.',
    yokReference: 'Lisansüstü Eğitim Yönetmeliği Madde 5',
    yokText: 'Lisansüstü programlara öğrenci kabulü; lisans diploması ve ALES puanı ile yapılır.',
    reasoning: ['Giriş şartları standart prosedürlere uygundur.'],
    suggestion: ''
  }
];

export const missingArticles = [
  {
    id: 'm1',
    title: 'Engelli Öğrencilere İlişkin Düzenlemeler',
    yokReference: 'YÖK Engelli Öğrenci Birimi Yönetmeliği',
    description: 'Yönetmelikte engelli öğrencilerin eğitim ve sınav süreçlerine dair kolaylaştırıcı hükümler bulunmamaktadır.',
    suggestion: 'Eğitimde fırsat eşitliği kapsamında "Engelli Öğrenciler" başlıklı bir maddenin eklenmesi zorunludur.'
  }
];
