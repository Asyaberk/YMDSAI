# ComplianceAI — YÖK Mevzuat Denetim Sistemi

## Proje Yapısı

```
SeniorDesignExperiments/
├── frontend/                  # React + Vite + Tailwind UI
│   └── complianceai/
│       ├── src/
│       │   ├── pages/         # Dashboard, FileUpload, ComplianceAnalysis, ...
│       │   ├── components/    # Layout, Logo
│       │   ├── contexts/      # AuthContext
│       │   ├── lib/           # utils
│       │   ├── types.ts
│       │   ├── mockData.ts
│       │   └── App.tsx
│       ├── index.html
│       ├── package.json
│       └── vite.config.ts
│
├── backend/                   # FastAPI backend (yapım aşamasında)
│
├── data/                      # YÖK PDF kaynak belgeleri
│   ├── yok.pdf
│   ├── cap.pdf
│   ├── lisansustu.pdf
│   └── ...
│
├── experiment_outputs/        # Benchmark sonuçları ve grafikler
│   ├── benchmark_results_clean.csv
│   ├── summary_clean.csv
│   ├── test_cases.jsonl
│   ├── faiss_vectors.npy
│   └── charts/
│
├── fix_experiments/           # RAG pipeline araştırma scriptleri
│   ├── run_benchmark_clean.py
│   ├── generate_gold_labels.py
│   ├── visualize_results.py
│   ├── prebuild_faiss.py
│   └── fix_bm25_normalization.py
│
├── .env                       # OPENAI_API_KEY (backend için)
└── .venv/                     # Python sanal ortamı
```

## Frontend Başlatma

```bash
cd frontend/complianceai
npm install
npm run dev
# → http://localhost:3000
```

## Backend Başlatma (yakında)

```bash
cd /Users/asyaberk/Desktop/SeniorDesignExperiments
.venv/bin/uvicorn backend.main:app --reload --port 8000
```

## Araştırma Scriptleri

```bash
# Benchmark çalıştır
.venv/bin/python fix_experiments/run_benchmark_clean.py

# Gold label üret
.venv/bin/python fix_experiments/generate_gold_labels.py

# Grafikleri oluştur
.venv/bin/python fix_experiments/visualize_results.py

# FAISS index ön oluşturma
.venv/bin/python fix_experiments/prebuild_faiss.py
```
