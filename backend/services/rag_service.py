"""
Real RAG Service — ComplianceAI
================================
Gerçek FAISS (dense) + BM25 + Hybrid retrieval pipeline.
YÖK PDF'lerinden oluşturulan chunk'ları kullanarak compliance analizi yapar.

Desteklenen pipeline'lar: bm25 | dense | hybrid (varsayılan: hybrid)
"""

import os
import re
import json
import time
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional

import openai
from backend.core.config import settings

# ── Paths ──────────────────────────────────────────────────────────────────
# Docker: WORKDIR=/app → BASE_DIR=/app. Local: project root.
BASE_DIR   = Path(os.environ.get("APP_BASE_DIR", str(Path(__file__).parent.parent.parent)))
DATA_DIR   = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "experiment_outputs"

# Use OpenAI-cached vectors (renamed from faiss_vectors.npy)
CACHE_VEC  = OUTPUT_DIR / "faiss_vectors_oai.npy"
CACHE_IDS  = OUTPUT_DIR / "faiss_chunk_ids_oai.npy"

# ── Config ──────────────────────────────────────────────────────────────────
CHUNK_SIZE    = 350
CHUNK_OVERLAP = 60
TOP_K         = 7
YOK_KEYWORDS  = ["yok", "lisansustu", "cap", "yandal", "yatay", "ek-madde", "yurt"]

openai.api_key = settings.OPENAI_API_KEY
_oa_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

# ── Text Utilities ──────────────────────────────────────────────────────────

def clean_text(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip()


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i : i + size]))
        i += max(1, size - overlap)
    return chunks


def tokenize(text: str) -> List[str]:
    return re.findall(r"\b\w+\b", text.lower())


def load_pdf_text(path) -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    return clean_text("\n".join(p.extract_text() or "" for p in reader.pages))


# ── YÖK Knowledge Base ──────────────────────────────────────────────────────

def _build_yok_chunks() -> List[Dict]:
    all_pdfs  = sorted(DATA_DIR.rglob("*.pdf"))
    yok_pdfs  = [p for p in all_pdfs if any(k in p.name.lower() for k in YOK_KEYWORDS)]
    chunks: List[Dict] = []
    for doc in yok_pdfs:
        text = load_pdf_text(doc)
        for c in chunk_text(text):
            chunks.append({"chunk_id": len(chunks), "text": c, "source": doc.name})
    return chunks


# ── Singleton Indexes (lazy, loaded once) ───────────────────────────────────

class _IndexStore:
    _initialized: bool = False
    yok_chunks: List[Dict] = []
    bm25       = None
    faiss_idx  = None
    faiss_emb  = None

    @classmethod
    def ensure_loaded(cls):
        if cls._initialized:
            return
        cls._initialize()

    @classmethod
    def _initialize(cls):
        # ── Build YÖK chunk list ────────────────────────────────────
        cls.yok_chunks = _build_yok_chunks()
        if not cls.yok_chunks:
            raise RuntimeError(
                f"YÖK PDF'leri bulunamadı: {DATA_DIR}. "
                "data/ dizininde yok.pdf vb. dosyaların bulunduğundan emin olun."
            )

        # ── BM25 ──────────────────────────────────────────────────────────
        from rank_bm25 import BM25Okapi
        cls.bm25 = BM25Okapi([tokenize(c["text"]) for c in cls.yok_chunks])

        # ── FAISS (OpenAI embeddings, no sentence-transformers) ─────────────
        import faiss

        if CACHE_VEC.exists() and CACHE_IDS.exists():
            # Cache hit — load pre-built OpenAI vectors
            vecs = np.load(str(CACHE_VEC)).astype("float32")
            print(f"[IndexStore] Loaded FAISS cache: {vecs.shape}")
        else:
            # Cache miss — embed all chunks via OpenAI API
            print("[IndexStore] Building FAISS index via OpenAI embeddings...")
            texts = [c["text"] for c in cls.yok_chunks]
            vecs  = _embed_openai(texts)
            np.save(str(CACHE_VEC), vecs)
            np.save(str(CACHE_IDS), np.array([c["chunk_id"] for c in cls.yok_chunks]))
            print(f"[IndexStore] FAISS index saved: {vecs.shape}")

        idx = faiss.IndexFlatIP(vecs.shape[1])
        idx.add(vecs)
        cls.faiss_idx = idx

        cls._initialized = True


def _embed_openai(texts: List[str], batch_size: int = 100) -> np.ndarray:
    """Embed texts using OpenAI text-embedding-3-small (384-dim projection)."""
    all_vecs = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        resp  = _oa_client.embeddings.create(
            input=batch,
            model="text-embedding-3-small",
            dimensions=384,
        )
        all_vecs.extend([d.embedding for d in resp.data])
    arr = np.array(all_vecs, dtype="float32")
    # L2 normalize for cosine similarity via inner product
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return arr / norms


# ── Retrieval ────────────────────────────────────────────────────────────────

def _retrieve_bm25(query: str, k: int = TOP_K) -> List[Dict]:
    _IndexStore.ensure_loaded()
    scores = _IndexStore.bm25.get_scores(tokenize(query))
    top    = np.argsort(scores)[::-1][:k]
    max_s  = float(scores.max()) if scores.max() > 0 else 1.0
    return [
        {
            "chunk_id": int(i),
            "score": float(scores[i]) / max_s,
            "text": _IndexStore.yok_chunks[i]["text"],
            "source": _IndexStore.yok_chunks[i]["source"],
        }
        for i in top
    ]


def _retrieve_dense(query: str, k: int = TOP_K) -> List[Dict]:
    _IndexStore.ensure_loaded()
    qv    = _embed_openai([query])          # (1, 384)
    D, I  = _IndexStore.faiss_idx.search(qv, k)
    return [
        {
            "chunk_id": int(I[0][r]),
            "score":    float(D[0][r]),
            "text":     _IndexStore.yok_chunks[I[0][r]]["text"],
            "source":   _IndexStore.yok_chunks[I[0][r]]["source"],
        }
        for r in range(k)
    ]


def _norm01(vals: List[float]) -> List[float]:
    lo, hi = min(vals), max(vals)
    if hi == lo:
        return [1.0] * len(vals)
    return [(v - lo) / (hi - lo) for v in vals]


def _retrieve_hybrid(query: str, k: int = TOP_K, alpha: float = 0.5) -> List[Dict]:
    bm   = _retrieve_bm25(query, k * 2)
    dn   = _retrieve_dense(query, k * 2)
    bn   = _norm01([r["score"] for r in bm])
    dd   = _norm01([r["score"] for r in dn])

    scores: Dict[int, float] = {}
    for r, n in zip(bm, bn):
        scores[r["chunk_id"]] = scores.get(r["chunk_id"], 0) + (1 - alpha) * n
    for r, n in zip(dn, dd):
        scores[r["chunk_id"]] = scores.get(r["chunk_id"], 0) + alpha * n

    top  = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:k]
    cmap = {c["chunk_id"]: c for c in _IndexStore.yok_chunks}
    return [
        {"chunk_id": cid, "score": sc, "text": cmap[cid]["text"], "source": cmap[cid]["source"]}
        for cid, sc in top
        if cid in cmap
    ]


# ── LLM Analysis ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a strict expert auditor in Turkish higher education law and university regulatory compliance.
You are given a university document/process and relevant YÖK (Higher Education Council) regulation excerpts.

CRITICAL RULES:
1. If the document is NOT a university regulation (e.g. homework assignment, research paper, CV, lecture notes, code), you MUST:
   - Set compliance_score to a value between 5 and 25
   - Set label to "non-compliant"
   - Explain clearly in Turkish that this is not a regulatory document
   - Still identify what was found in the document as articles

2. For REAL university regulations, evaluate each article strictly:
   - Uyumlu: The article directly maps to and satisfies YÖK requirements
   - Kısmen Uyumlu: The article partially satisfies or is ambiguous
   - Uyumsuz: The article contradicts or is missing from YÖK requirements

3. The "similarity" field must reflect how closely the article text matches YÖK excerpts (0.0 = no match, 1.0 = perfect match). Use 0.1-0.3 for irrelevant content.

Respond ONLY with valid JSON in this exact format:
{
  "compliance_score": <integer 0-100>,
  "label": "<compliant|partial|non-compliant>",
  "explanation": "<Turkish explanation, 3-4 sentences>",
  "articles": [
    {
      "number": "<Article reference, e.g. Madde 1>",
      "title": "<Short descriptive title in Turkish>",
      "status": "<Uyumlu|Kısmen Uyumlu|Uyumsuz>",
      "similarity": <float 0.0-1.0>,
      "text": "<Exact text from the submitted document (max 300 chars)>",
      "yok_reference": "<YÖK regulation name and article>",
      "yok_text": "<Exact relevant YÖK excerpt (max 300 chars)>",
      "reasoning": ["<specific reason 1>", "<specific reason 2>"],
      "suggestion": "<Concrete improvement suggestion in Turkish if non-compliant, else empty string>"
    }
  ]
}

Label thresholds: compliant >= 80, partial 40-79, non-compliant < 40."""

USER_TEMPLATE = """## University Document
{process_text}

## Relevant YÖK Regulation Excerpts
{chunks}

Provide your JSON compliance analysis."""


def _format_chunks(chunks: List[Dict]) -> str:
    return "\n\n".join(
        f"[chunk_id: {c['chunk_id']} | source: {c.get('source', 'unknown')}]\n{c['text']}"
        for c in chunks
    )


def _parse_json(raw: str) -> Optional[Dict]:
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group())
    except json.JSONDecodeError:
        return None


# ── Public API ────────────────────────────────────────────────────────────────

def _assign_real_similarities(articles: list, retrieved: list) -> list:
    """Override LLM-guessed similarity (often 1.0) with real retrieval scores."""
    if not retrieved:
        return articles
    # Normalize BM25/FAISS scores to 0-1 range
    raw_scores = [c.get("score", 0) for c in retrieved]
    max_s = max(raw_scores) if raw_scores else 1.0
    min_s = min(raw_scores) if raw_scores else 0.0
    rng   = max_s - min_s if max_s != min_s else 1.0
    norm_scores = [(s - min_s) / rng for s in raw_scores]
    avg_norm = sum(norm_scores) / len(norm_scores) if norm_scores else 0.5

    for i, art in enumerate(articles):
        llm_sim = art.get("similarity", 1.0)
        # If LLM says 1.0 exactly, it's a guess — replace with real score
        if llm_sim >= 0.99:
            art["similarity"] = round(avg_norm, 3)
    return articles


class RagService:
    """
    Real RAG-based compliance analysis service.
    Uses hybrid retrieval (BM25 + FAISS dense) + GPT for generation.
    """

    def __init__(self, pipeline: str = "hybrid", model: str = "gpt-4o-mini"):
        self.pipeline = pipeline
        self.model    = model

    def _retrieve(self, query: str, k: int = TOP_K) -> List[Dict]:
        if self.pipeline == "bm25":
            return _retrieve_bm25(query, k)
        elif self.pipeline == "dense":
            return _retrieve_dense(query, k)
        else:
            return _retrieve_hybrid(query, k)

    def generate_embeddings(self, text: str):
        response = _oa_client.embeddings.create(
            input=[text],
            model="text-embedding-3-small"
        )
        return response.data[0].embedding

    def analyze_document(self, process_text: str, filename: str) -> dict:
        """
        Full RAG compliance analysis.
        Returns status, compliance_score, articles, retrieved_chunks, pipeline, model.
        """
        query = process_text[:500]

        # 1. Retrieve relevant YÖK chunks
        try:
            retrieved = self._retrieve(query, TOP_K)
        except Exception as e:
            print(f"[RagService] Retrieval error: {e}")
            retrieved = []

        # 2. LLM analysis
        chunks_str = _format_chunks(retrieved) if retrieved else "Hiçbir mevzuat parçası bulunamadı."

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": USER_TEMPLATE.format(
                    process_text=process_text[:4000],
                    chunks=chunks_str[:8000],
                ),
            },
        ]

        try:
            resp   = _oa_client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.0,
                max_tokens=3000,
                response_format={"type": "json_object"},
            )
            raw    = resp.choices[0].message.content
            result = _parse_json(raw)
        except Exception as e:
            print(f"[RagService] LLM error: {e}")
            result = None

        # 3. Fallback
        if not result:
            avg_score = int(np.mean([c.get("score", 0.5) for c in retrieved]) * 100) if retrieved else 50
            result = {
                "compliance_score": avg_score,
                "label": "partial",
                "explanation": "Analiz tamamlanamadı, lütfen tekrar deneyin.",
                "articles": [],
            }

        # 4. Fix similarity scores (replace LLM-guessed 1.0 with real scores)
        articles = result.get("articles", [])
        articles = _assign_real_similarities(articles, retrieved)

        # 5. Map label to Turkish
        label_map = {
            "compliant":     "Uyumlu",
            "partial":       "Kısmen Uyumlu",
            "non-compliant": "Uyumsuz",
        }
        turkish_status = label_map.get(result.get("label", "partial"), "Kısmen Uyumlu")

        return {
            "status":           turkish_status,
            "compliance_score": result.get("compliance_score", 50),
            "articles":         articles,
            "retrieved_chunks": [
                {
                    "chunk_id": c["chunk_id"],
                    "score":    round(c["score"], 4),
                    "source":   c.get("source", ""),
                    "text":     c.get("text", "")[:400],
                }
                for c in retrieved
            ],
            "pipeline": self.pipeline,
            "model":    self.model,
        }


# Module-level singleton
rag_service = RagService(pipeline="hybrid", model="gpt-4o-mini")
