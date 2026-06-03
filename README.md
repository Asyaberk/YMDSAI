<div align="center">
  <br />
  <h1>⚖️ YMDS AI</h1>
  <p><strong>YÖK Mevzuatı Denetim Sistemi — Retrieval-Augmented Generation ile Uyumluluk Analizi</strong></p>

  [![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=white)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
  [![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991.svg?logo=openai&logoColor=white)](https://openai.com/)

  <br />
  <p><i>Senior Design Project — Bilgi Üniversitesi Bilgisayar Mühendisliği</i></p>
</div>

---

## 📖 Proje Hakkında

**YMDS AI** (*YÖK Mevzuatı Denetim Sistemi*), Türk üniversitelerinin iç yönetmeliklerinin **YÖK (Yükseköğretim Kurulu)** mevzuatına uyumluluğunu otomatik olarak denetleyen, **Retrieval-Augmented Generation (RAG)** mimarisi üzerine kurulu bir yapay zeka platformudur.

Sistem, bir üniversite yönetmeliği PDF'i yüklendiğinde belgeyi **madde madde** analiz eder; her madde için ilgili YÖK mevzuatını otomatik olarak çeker, LLM ile karşılaştırır ve 4 kategorili bir uyumluluk kararı üretir. Tüm bu süreç, manuel hukuki incelemenin yerine geçmek için değil, idari personelin analizini hızlandırmak ve odaklanmasını sağlamak amacıyla tasarlanmıştır.

Proje aynı zamanda akademik bir araştırma altyapısı olarak 5 farklı RAG pipeline varyantını (No-RAG, BM25, Dense, Hybrid, Multi-Query) 40 soruluk bir benchmark üzerinde karşılaştırır.

---

## ✨ Temel Özellikler

| Özellik | Açıklama |
|---|---|
| 📄 **Madde Bazlı Analiz** | PDF yönetmeliği otomatik olarak `Madde N` başlıklarına göre ayrıştırılır; her madde bağımsız RAG çağrısıyla analiz edilir |
| ⚖️ **4 Kategorili Karar** | Her madde için: **Uyumlu / Kısmen Uyumlu / Uyumsuz / Kapsam Dışı** kararı + YÖK alıntısı + Türkçe gerekçe + düzeltme önerisi |
| 🔍 **5 RAG Pipeline** | No-RAG · BM25 · Dense (FAISS) · Hybrid (BM25+Dense linear fusion) · Multi-Query |
| 📚 **Canlı YÖK Mevzuat Tarayıcı** | `idarimali.yok.gov.tr` portalından güncel mevzuat listesi saatlik önbellekle çekilir |
| 📊 **Deney Sayfası** | Benchmark sonuçları (doğruluk, gecikme, maliyet, sınıf bazlı recall) doğrudan web arayüzünde görselleştirilir |
| 👩‍💼 **Admin Dashboard** | Tüm kullanıcıların yüklediği belgeler, uyumluluk istatistikleri, PDF görüntüleme ve silme |
| 🔐 **JWT Kimlik Doğrulama** | Kullanıcı / Admin rol ayrımı, token tabanlı güvenlik |
| 🐳 **Docker Compose** | Tek komutla tüm sistem ayağa kalkar (FastAPI + React + PostgreSQL + pgAdmin) |

---

## 🏗️ Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────────┐
│                        YMDS AI                                  │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │  Knowledge   │    │  Inference       │    │  Web          │ │
│  │  Base Layer  │───▶│  Backend         │◀──▶│  Interface    │ │
│  │              │    │  (FastAPI)       │    │  (React)      │ │
│  │ • 9 YÖK PDF  │    │                  │    │               │ │
│  │ • BM25 Index │    │ • No-RAG         │    │ • Analiz      │ │
│  │ • FAISS Index│    │ • BM25           │    │ • Madde detay │ │
│  │ • 248 chunk  │    │ • Dense (FAISS)  │    │ • Admin panel │ │
│  │              │    │ • Hybrid         │    │ • Deneyler    │ │
│  └──────────────┘    │ • Multi-Query    │    └───────────────┘ │
│                      │                  │                       │
│                      │ GPT-4o / mini    │    ┌───────────────┐ │
│                      └──────────────────┘    │  PostgreSQL   │ │
│                                              │  (Belgeler,   │ │
│  ┌──────────────────────────────────────┐    │   Sonuçlar)   │ │
│  │  Live YÖK Mevzuat Browser           │    └───────────────┘ │
│  │  idarimali.yok.gov.tr (1h cache)    │                       │
│  └──────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Katmanlar

| Katman | Teknoloji | Açıklama |
|---|---|---|
| **Knowledge Base** | `rank-bm25`, `faiss-cpu`, `openai` | 9 YÖK PDF → 248 chunk (350 kelime / 59 kelime overlap) → BM25 + FAISS index |
| **Inference Backend** | FastAPI, Python 3.11, OpenAI API | 5 retrieval pipeline, madde ayrıştırıcı, JSON uyumluluk kararı |
| **Web Interface** | React 19, Vite 6, TailwindCSS 4 | Analiz, detay, admin dashboard, deney görselleştirme |
| **Veritabanı** | PostgreSQL 15, SQLAlchemy, Alembic | Belgeler, per-madde analiz sonuçları, kullanıcılar |

---

## 🔬 RAG Pipeline Varyantları

| Pipeline | Yöntem | Açıklama |
|---|---|---|
| **No-RAG** | Sıfır-shot | Hiç retrieval yok; LLM'e yalnızca madde metni verilir (baseline) |
| **BM25** | Sparse | Madde metni BM25 indeksine sorgulanır; top-K chunk getirilir |
| **Dense** | FAISS | `text-embedding-3-small` ile embed edilmiş sorgu, FAISS flat inner-product indeksine verilir |
| **Hybrid** | Lineer fusion | BM25 + Dense her ikisi 2K derinlikte çalışır, min-max normalize edilir, `0.5×BM25 + 0.5×Dense` birleştirilir |
| **Multi-Query** | Query expansion | LLM ile 2 alternatif sorgu üretilir; 3 BM25 çağrısının sonuçları birleştirilir |

---

## 📊 Araştırma Sonuçları (Özet)

40 soruluk RAG-aware benchmark üzerinde:

| Pipeline | Model | Doğruluk |
|---|---|---|
| **Hybrid** | GPT-4o | **%47.5** ← en iyi |
| BM25 | GPT-4o | %45.0 |
| Dense | GPT-4o | %40.0 |
| Multi-Query | GPT-4o | %37.5 |
| No-RAG | GPT-4o | %37.5 |
| Hybrid | GPT-4o-mini | %47.5 |

> 💡 **Anahtar bulgu:** GPT-4o-mini, GPT-4o ile eşdeğer doğruluğa ~18× daha düşük maliyetle ulaşıyor. Optimal hiperparametreler: 350 kelimelik chunk, Top-5 retrieval derinliği.

Detaylı sonuçlar ve ablasyon çalışmaları (chunk boyutu, Top-K ablasyonu, sınıf bazlı recall) için uygulamanın **RAG Experiments** sayfasını ya da `experiment_outputs/` klasörünü inceleyin.

---

## 📁 Proje Yapısı

```
YMDSAI/
│
├── backend/                      # FastAPI backend
│   ├── api/
│   │   └── routes.py             # Tüm API endpoint'leri (analiz, auth, yök mevzuat, admin)
│   ├── services/
│   │   └── rag_service.py        # 5 pipeline, madde ayrıştırıcı, LLM prompts
│   ├── models/
│   │   ├── domain.py             # SQLAlchemy ORM modelleri
│   │   └── schemas.py            # Pydantic şemaları
│   ├── db/                       # Veritabanı bağlantısı ve session
│   ├── core/                     # Konfigürasyon, güvenlik, bağımlılıklar
│   ├── main.py                   # FastAPI app başlangıcı
│   └── Dockerfile
│
├── frontend/complianceai/        # React + Vite frontend
│   ├── src/
│   │   ├── pages/                # Analiz, Admin, Deneyler, Login sayfaları
│   │   ├── components/           # Yeniden kullanılabilir UI bileşenleri
│   │   └── api/                  # Backend istek fonksiyonları
│   └── Dockerfile
│
├── fix_experiments/              # Araştırma & benchmark betikleri
│   ├── run_benchmark_balanced.py # Ana benchmark (5 pipeline × 2 model)
│   ├── ablation_bm25_fast.py     # Chunk boyutu ve Top-K ablasyonu
│   ├── prebuild_faiss.py         # FAISS index ön inşası
│   ├── generate_rag_testset.py   # Gold label üretimi
│   └── generate_paper_figures.py # Makale görseli üretimi
│
├── data/                         # 9 YÖK PDF mevzuat belgesi
├── experiment_outputs/           # Benchmark CSV çıktıları ve grafikler
├── uploads/                      # Kullanıcıların yüklediği PDF'ler
├── docker-compose.yml            # Tüm servisler için Docker Compose
├── requirements.txt              # Python bağımlılıkları
└── README.md
```

---

## 🚀 Kurulum ve Çalıştırma

### Ön Gereksinimler

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (önerilen)
- **veya** Python 3.11+ · Node.js 20+ · PostgreSQL 15

### `.env` Dosyasını Oluştur

Proje kök dizininde `.env` dosyası oluşturun:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Veritabanı
DB_HOST=db
DB_PORT=5432
DB_USERNAME=asya
DB_PASSWORD=Asya1234
DB_DATABASE=dbcomplianceai

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# pgAdmin (opsiyonel)
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=123
```

---

### 🐳 Yöntem 1: Docker Compose (Önerilen)

```bash
# Tüm servisleri başlat (ilk çalıştırmada image build edilir)
docker compose up --build

# Arka planda çalıştırmak için
docker compose up --build -d
```

| Servis | URL |
|---|---|
| 🌐 Web Arayüzü | http://localhost:3000 |
| ⚙️ API (Swagger) | http://localhost:8001/docs |
| 🗄️ pgAdmin | http://localhost:5051 |

---

### 🛠️ Yöntem 2: Manuel Kurulum

**Backend:**

```bash
# Sanal ortam oluştur ve aktifleştir
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# Veritabanı tablolarını oluştur
python -c "from backend.db.database import engine; from backend.models.domain import Base; Base.metadata.create_all(engine)"

# Sunucuyu başlat
uvicorn backend.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend/complianceai
npm install
npm run dev
```

> 🌐 Arayüz: http://localhost:3000 | ⚙️ API: http://localhost:8000/docs

---

## 🧪 Araştırma Deneylerini Çalıştırma

Benchmark betiklerini proje kök dizininde sanal ortam aktifken çalıştırın:

```bash
# 1. FAISS vektör indeksini önceden inşa et (tek seferlik)
python fix_experiments/prebuild_faiss.py

# 2. Gold label test seti üret
python fix_experiments/generate_rag_testset.py

# 3. Ana benchmark (5 pipeline × 2 model = 400 LLM çağrısı)
python fix_experiments/run_benchmark_balanced.py

# 4. Chunk boyutu ve Top-K ablasyon çalışması
python fix_experiments/ablation_bm25_fast.py

# 5. Makale görselleri üret (grafik, tablo, ısı haritası)
python fix_experiments/generate_paper_figures.py
```

> 📈 Tüm çıktılar (CSV, PNG grafikleri) otomatik olarak `experiment_outputs/` klasörüne kaydedilir.
> Bu sonuçlar web uygulamasının **RAG Experiments** sayfasında canlı olarak görselleştirilir.

---

## 🔑 API Endpoints (Özet)

| Metod | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/auth/register` | Kullanıcı kaydı |
| `POST` | `/auth/login` | JWT token alma |
| `POST` | `/analyze` | PDF yükle → madde bazlı uyumluluk analizi |
| `GET` | `/documents` | Kullanıcının belgelerini listele |
| `GET` | `/documents/{id}` | Belge detayı + tüm madde sonuçları |
| `GET` | `/admin/documents` | Admin: tüm kullanıcıların belgeleri |
| `GET` | `/yok/mevzuat` | Canlı YÖK mevzuat listesi (1s önbellek) |
| `GET` | `/experiments/results` | Benchmark CSV sonuçları |

Tüm endpoint detayları için: **http://localhost:8001/docs** (Swagger UI)

---

## 🤖 LLM Prompt ve Karar Mekanizması

Her madde için LLM şu 4 kategoriden birini döndürür:

| Karar | Açıklama |
|---|---|
| ✅ **Uyumlu** | Madde, YÖK hükmünü karşılıyor (ifade farklı olsa da) |
| 🟡 **Kısmen Uyumlu** | Genel doğrultuda ama zorunlu bir unsur eksik ya da belirsiz |
| ❌ **Uyumsuz** | Sayısal eşik/süre farklı, zorunlu makam eksik veya YÖK'ün yasakladığı bir uygulama var |
| ⚫ **Kapsam Dışı** | YÖK bu konuyu düzenlemiyor (kampüs güvenliği, yemekhane vb.) |

JSON çıktısı: `status` · `similarity` · `yok_reference` · `yok_text` · `reasoning` · `suggestion`

Tam sistem prompt'u `backend/services/rag_service.py` içindeki `ARTICLE_SYSTEM` değişkeninde bulunur.

---

## 📦 Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| **Frontend** | React 19, Vite 6, TailwindCSS 4, Recharts |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **AI / RAG** | OpenAI API (GPT-4o, GPT-4o-mini, text-embedding-3-small), FAISS, rank-bm25 |
| **Veritabanı** | PostgreSQL 15, SQLAlchemy 2.0, Alembic |
| **PDF işleme** | pypdf, regex madde ayrıştırıcı |
| **HTTP / Scraping** | httpx, BeautifulSoup4 |
| **Kimlik Doğrulama** | JWT (python-jose), bcrypt |
| **Deployment** | Docker Compose (4 servis: db · backend · frontend · pgadmin) |
| **Deneyler** | Pandas, NumPy, Matplotlib, Seaborn |

---

## 📄 Akademik Makale

Bu proje, *Expert Systems with Applications* dergisine gönderilen aşağıdaki makaleye dayanmaktadır:

> **YMDS AI: A Retrieval-Augmented Generation Framework for Automated Regulatory Compliance Checking in Turkish Higher Education**  
> *Asya Berk, Utku ...*  
> Bilgi Üniversitesi, 2026

Makale `paper/` klasöründe LaTeX kaynak dosyaları olarak mevcuttur.

---

## 👥 Katkıda Bulunanlar

| İsim | Rol |
|---|---|
| **Asya Berk** | Proje sahibi, backend, RAG pipeline, araştırma |
| **Utku ...** | Frontend, sistem entegrasyonu |

**Danışman:** Prof. Dr. Tuğba Yıldız

---

<div align="center">
  <p>Bilgi Üniversitesi — Bilgisayar Mühendisliği Senior Design, 2025–2026</p>
</div>
