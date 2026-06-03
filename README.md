<div align="center">
  <br />
  <h1>YMDS AI</h1>
  <p><strong>YOK Regulatory Compliance Analysis System powered by Retrieval-Augmented Generation</strong></p>

  [![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=white)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
  [![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991.svg?logo=openai&logoColor=white)](https://openai.com/)

  <br />
  <p><i>Senior Design Project — Istanbul Bilgi University, Computer Engineering, 2025–2026</i></p>
</div>

---

## About

**YMDS AI** (*YOK Mevzuati Denetim Sistemi* — Higher Education Regulatory Compliance System) is an AI-powered platform that automatically checks whether Turkish university internal policy documents comply with regulations set by **YOK (Yuksekogretim Kurulu — the Higher Education Council of Turkey)**.

When a university policy PDF is uploaded, the system splits it into individual articles, retrieves the most relevant YOK regulation passages for each article using one of five RAG pipeline variants, and uses a large language model to produce a four-class compliance verdict. The goal is not to replace human legal review, but to accelerate it by surfacing relevant regulation text and flagging articles that require attention.

The project also serves as a research platform: five retrieval strategies (No-RAG, BM25, Dense, Hybrid, Multi-Query) are benchmarked against a 40-case evaluation set, with results rendered live in the web interface.

---

## Key Features

| Feature | Description |
|---|---|
| Article-level analysis | Policy PDFs are automatically parsed into individual articles using a multi-pattern regex splitter; each article is analyzed independently |
| Four-class compliance verdict | Each article receives one of: **Compliant / Partially Compliant / Non-Compliant / Out-of-Scope**, with a YOK citation, Turkish-language reasoning, and a corrective suggestion |
| Five RAG pipelines | No-RAG, BM25 (sparse), Dense (FAISS), Hybrid (linear score fusion), Multi-Query (LLM query expansion + BM25) |
| Live YOK regulation browser | Regulation catalogue scraped in real time from the official YOK administrative law portal with hourly caching |
| Experiment dashboard | Benchmark accuracy, latency, cost, and per-class recall charts rendered directly from experiment output files |
| Admin dashboard | View all uploaded documents across all users, inspect compliance statistics, open original PDFs, delete records |
| JWT authentication | Role-based access control: regular user and administrator roles |
| Docker Compose deployment | Single command brings up the full stack: FastAPI backend + React frontend + PostgreSQL + pgAdmin |

---

## System Architecture

```
+------------------------------------------------------------------+
|                           YMDS AI                                |
|                                                                  |
|  +----------------+    +------------------+    +-------------+  |
|  | Knowledge Base |    | Inference Backend|    | Web         |  |
|  |                |--->| (FastAPI)        |<-->| Interface   |  |
|  | - 9 YOK PDFs   |    |                  |    | (React)     |  |
|  | - BM25 Index   |    | - No-RAG         |    |             |  |
|  | - FAISS Index  |    | - BM25           |    | - Analysis  |  |
|  | - 248 chunks   |    | - Dense (FAISS)  |    | - Detail    |  |
|  |                |    | - Hybrid         |    | - Admin     |  |
|  +----------------+    | - Multi-Query    |    | - Experiments|  |
|                        |                  |    +-------------+  |
|                        | GPT-4o / mini    |                      |
|                        +------------------+    +-------------+  |
|                                                | PostgreSQL  |  |
|  +------------------------------------------+ | (Documents, |  |
|  | Live YOK Regulation Browser              | |  Results)   |  |
|  | idarimali.yok.gov.tr  (1h cache)         | +-------------+  |
|  +------------------------------------------+                   |
+------------------------------------------------------------------+
```

### Layer Overview

| Layer | Technology | Description |
|---|---|---|
| Knowledge Base | `rank-bm25`, `faiss-cpu`, OpenAI embeddings | 9 YOK PDFs chunked into 248 segments (350 words / 59-word overlap), indexed as BM25 and FAISS flat inner-product |
| Inference Backend | FastAPI, Python 3.11, OpenAI API | Article boundary detection, retrieval pipeline routing, LLM compliance reasoning |
| Web Interface | React 19, Vite 6, TailwindCSS 4, Recharts | Analysis, article detail, admin dashboard, experiment visualization |
| Database | PostgreSQL 15, SQLAlchemy 2.0, Alembic | Documents, per-article analysis results, user accounts |

---

## RAG Pipeline Variants

| Pipeline | Method | Description |
|---|---|---|
| No-RAG | Zero-shot | No retrieval; article text is passed directly to the LLM (baseline) |
| BM25 | Sparse | Article text is scored against the BM25 index; top-K chunks retrieved |
| Dense | FAISS | Query embedded with `text-embedding-3-small` (384-dim projection); top-K nearest chunks from FAISS flat index |
| Hybrid | Linear score fusion | BM25 and Dense each run at depth 2K; scores min-max normalized independently; final score = 0.5 x BM25 + 0.5 x Dense |
| Multi-Query | Query expansion | LLM generates 2 alternative query phrasings at temperature 0.7; all 3 BM25 results merged by union, re-ranked by score |

---

## Research Results (Summary)

Evaluated on a 40-case RAG-aware benchmark:

| Pipeline | Model | Accuracy |
|---|---|---|
| Hybrid | GPT-4o | **47.5%** (best) |
| BM25 | GPT-4o | 45.0% |
| Hybrid | GPT-4o-mini | 47.5% |
| Dense | GPT-4o | 40.0% |
| No-RAG | GPT-4o | 37.5% |

Key findings:
- RAG improves accuracy by 10 percentage points over the no-RAG baseline
- GPT-4o-mini matches GPT-4o performance at approximately 18x lower cost
- Optimal hyperparameters: 350-word chunks, Top-5 retrieval depth
- All models systematically under-predict the non-compliant class; the system is best used as a risk filter rather than a standalone auditor

Full ablation results (chunk size, Top-K depth, per-class recall, latency) are available in `experiment_outputs/` and rendered on the application's Experiments page.

---

## Project Structure

```
YMDSAI/
|
+-- backend/                        # FastAPI backend
|   +-- api/
|   |   +-- routes.py               # All API endpoints (analysis, auth, YOK browser, admin)
|   +-- services/
|   |   +-- rag_service.py          # 5 pipelines, article splitter, LLM prompts
|   +-- models/
|   |   +-- domain.py               # SQLAlchemy ORM models
|   |   +-- schemas.py              # Pydantic schemas
|   +-- db/                         # Database connection and session management
|   +-- core/                       # Config, security, dependency injection
|   +-- main.py                     # FastAPI app entry point
|   +-- Dockerfile
|
+-- frontend/complianceai/          # React + Vite frontend
|   +-- src/
|   |   +-- pages/                  # Analysis, Admin, Experiments, Login pages
|   |   +-- components/             # Reusable UI components
|   |   +-- api/                    # Backend request functions
|   +-- Dockerfile
|
+-- fix_experiments/                # Research and benchmarking scripts
|   +-- run_benchmark_balanced.py   # Main benchmark (5 pipelines x 2 models)
|   +-- ablation_bm25_fast.py       # Chunk size and Top-K ablation study
|   +-- prebuild_faiss.py           # FAISS index pre-build
|   +-- generate_rag_testset.py     # Gold label test set generation
|   +-- generate_paper_figures.py   # Figure generation for publication
|
+-- data/                           # 9 YOK regulatory PDF documents
+-- experiment_outputs/             # Benchmark CSV outputs and charts
+-- uploads/                        # User-uploaded policy PDFs
+-- docker-compose.yml              # Full stack Docker Compose config
+-- requirements.txt                # Python dependencies
+-- README.md
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- or Python 3.11+ / Node.js 20+ / PostgreSQL 15 (manual setup)

### Step 1 — Create the `.env` file

Create a `.env` file in the project root:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Database
DB_HOST=db
DB_PORT=5432
DB_USERNAME=asya
DB_PASSWORD=Asya1234
DB_DATABASE=dbcomplianceai

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# pgAdmin (optional)
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=123
```

---

### Option 1 — Docker Compose (Recommended)

```bash
# Build and start all services
docker compose up --build

# Run in detached mode
docker compose up --build -d
```

| Service | URL |
|---|---|
| Web Application | http://localhost:3000 |
| API (Swagger UI) | http://localhost:8001/docs |
| pgAdmin | http://localhost:5051 |

---

### Option 2 — Manual Setup

**Backend:**

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create database tables
python -c "from backend.db.database import engine; from backend.models.domain import Base; Base.metadata.create_all(engine)"

# Start server
uvicorn backend.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend/complianceai
npm install
npm run dev
```

Application: http://localhost:3000 | API docs: http://localhost:8000/docs

---

## Running Experiments

Run all benchmark scripts from the project root with the virtual environment active:

```bash
# Step 1 — Pre-build the FAISS vector index (one-time)
python fix_experiments/prebuild_faiss.py

# Step 2 — Generate the gold label test set
python fix_experiments/generate_rag_testset.py

# Step 3 — Run the main benchmark (5 pipelines x 2 models, ~400 LLM calls)
python fix_experiments/run_benchmark_balanced.py

# Step 4 — Run chunk size and Top-K ablation study
python fix_experiments/ablation_bm25_fast.py

# Step 5 — Generate publication-ready figures and charts
python fix_experiments/generate_paper_figures.py
```

All outputs (CSVs, PNG charts, heatmaps) are saved automatically to `experiment_outputs/`. These results are also displayed live on the application's **Experiments** page.

---

## API Reference (Summary)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Obtain a JWT token |
| `POST` | `/analyze` | Upload a policy PDF and run article-level compliance analysis |
| `GET` | `/documents` | List the current user's documents |
| `GET` | `/documents/{id}` | Get document detail with all article results |
| `GET` | `/admin/documents` | Admin: list all documents across all users |
| `GET` | `/yok/mevzuat` | Live YOK regulation catalogue (1-hour cache) |
| `GET` | `/experiments/results` | Benchmark CSV results for the Experiments page |

Full interactive API documentation: **http://localhost:8001/docs**

---

## LLM Compliance Decision Logic

Each article is independently classified into one of four categories:

| Decision | Criteria |
|---|---|
| Compliant | Article satisfies the YOK regulation's intent, even if phrased differently |
| Partially Compliant | Correct direction but a required element is missing or wording is ambiguous |
| Non-Compliant | Numeric threshold differs, a mandatory authority or procedure is absent, or a prohibited practice is present |
| Out-of-Scope | Topic is not regulated by YOK at all (e.g., campus security, cafeteria management) |

JSON output per article: `status` · `similarity` · `yok_reference` · `yok_text` · `reasoning` · `suggestion`

The full system prompt is in `backend/services/rag_service.py` (`ARTICLE_SYSTEM` variable).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, TailwindCSS 4, Recharts |
| Backend | Python 3.11, FastAPI, Uvicorn |
| AI / RAG | OpenAI API (GPT-4o, GPT-4o-mini, text-embedding-3-small), FAISS, rank-bm25 |
| Database | PostgreSQL 15, SQLAlchemy 2.0, Alembic |
| PDF Processing | pypdf, regex-based article boundary detection |
| HTTP / Scraping | httpx, BeautifulSoup4 |
| Authentication | JWT (python-jose), bcrypt |
| Deployment | Docker Compose (4 services: db, backend, frontend, pgadmin) |
| Experiments | Pandas, NumPy, Matplotlib, Seaborn |

---

## Contributors

| Name | Role |
|---|---|
| **Asya Berk** | Project lead, backend, RAG pipeline, research |
| **Utku Akgül** | Frontend, system integration |

**Advisor:** Doç. Dr. Tuğba Dalyan — Istanbul Bilgi University

---

<div align="center">
  <p>Istanbul Bilgi University — Computer Engineering Senior Design, 2025–2026</p>
</div>
