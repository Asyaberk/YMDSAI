#!/usr/bin/env python3
"""
Clean Benchmark Runner
=======================
v3.ipynb'deki tüm düzeltmeleri içeren temiz bir script versiyonu.

Özellikler:
- BM25 normalizasyon fix'i ✓
- Gold label'lar gerekli (generate_gold_labels.py'yi önce çalıştırın) ✓
- GPT-4o / GPT-4o-mini ile gerçek LLM değerlendirmesi ✓
- Anlamlı accuracy hesabı (label vs gold_label) ✓
- CSV özet çıktısı ✓

Çalıştırma:
    cd /Users/asyaberk/Desktop/SeniorDesignExperiments
    python fix_experiments/run_benchmark_clean.py
"""

import os
import re
import json
import time
import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass, field, asdict
from dotenv import load_dotenv

# ── Paths & Config ─────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent
DATA_DIR   = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "experiment_outputs"

load_dotenv(BASE_DIR / ".env")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY bulunamadı.")

CHUNK_SIZE    = 350
CHUNK_OVERLAP = 60
TOP_K         = 5
PASS_THRESHOLD= 70
YOK_KEYWORDS  = ["yok", "lisansustu", "cap", "yandal", "yatay", "ek-madde", "yurt"]

# ── PDF Loader ─────────────────────────────────────────────────────────────
def clean_text(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip()

def load_pdf_text(path) -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    return clean_text("\n".join(p.extract_text() or "" for p in reader.pages))

def chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += max(1, size - overlap)
    return chunks

def build_yok_chunks() -> List[Dict]:
    all_pdfs = sorted(DATA_DIR.rglob("*.pdf"))
    yok_pdfs = [p for p in all_pdfs if any(k in p.name.lower() for k in YOK_KEYWORDS)]
    chunks = []
    for doc in yok_pdfs:
        text = load_pdf_text(doc)
        for c in chunk_text(text):
            chunks.append({"chunk_id": len(chunks), "text": c})
    print(f"YÖK chunks: {len(chunks)}")
    return chunks

# ── Test Case ──────────────────────────────────────────────────────────────
@dataclass
class TestCase:
    case_id:       str
    process_text:  str
    query:         str
    gold_label:    str  = ""
    gold_score:    Optional[float] = None
    gold_chunk_ids: List[int] = field(default_factory=list)
    notes:         str  = ""

def load_cases(path: str) -> List[TestCase]:
    cases = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            gc = d.get("gold_chunk_ids") or []
            gs = d.get("gold_score")
            cases.append(TestCase(
                case_id=d["case_id"],
                process_text=d["process_text"],
                query=d["query"],
                gold_label=d.get("gold_label", ""),
                gold_score=float(gs) if gs is not None else None,
                gold_chunk_ids=[int(x) for x in gc],
                notes=d.get("notes", ""),
            ))
    return cases

# ── Retrieval ──────────────────────────────────────────────────────────────
_bm25       = None
_bm25_chunks= []
_faiss_idx  = None
_faiss_emb  = None
_faiss_chunks= []

def tokenize(text: str) -> List[str]:
    return re.findall(r"\b\w+\b", text.lower())

def build_bm25_index(chunks: List[Dict]) -> None:
    global _bm25, _bm25_chunks
    from rank_bm25 import BM25Okapi
    _bm25_chunks = chunks
    _bm25 = BM25Okapi([tokenize(c["text"]) for c in chunks])
    print(f"BM25 index: {len(chunks)} docs")

def retrieve_bm25(query: str, k: int = TOP_K) -> List[Dict]:
    """BM25 retrieval — skorlar [0,1] normalize edilmiş."""
    scores = _bm25.get_scores(tokenize(query))
    top    = np.argsort(scores)[::-1][:k]
    max_s  = float(scores.max()) if scores.max() > 0 else 1.0  # FIX
    return [{"chunk_id": int(i), "score": float(scores[i]) / max_s,
             "text": _bm25_chunks[i]["text"]} for i in top]

CACHE_VEC = OUTPUT_DIR / "faiss_vectors.npy"
CACHE_IDS = OUTPUT_DIR / "faiss_chunk_ids.npy"

def build_faiss_index(chunks: List[Dict]) -> None:
    global _faiss_idx, _faiss_emb, _faiss_chunks
    import faiss
    from sentence_transformers import SentenceTransformer

    _faiss_chunks = chunks

    # Cache'den yükle — yoksa encode et ve kaydet
    if CACHE_VEC.exists() and CACHE_IDS.exists():
        print("FAISS cache bulundu, yükleniyor...")
        vecs = np.load(str(CACHE_VEC))
        print(f"FAISS index: {len(chunks)} docs, dim={vecs.shape[1]} (cache)")
    else:
        print("Cache yok — encode ediliyor (5-15 dk)...")
        _faiss_emb = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        vecs = _faiss_emb.encode(
            [c["text"] for c in chunks],
            show_progress_bar=True,
            normalize_embeddings=True,
            batch_size=32,
        ).astype("float32")
        np.save(str(CACHE_VEC), vecs)
        np.save(str(CACHE_IDS), np.array([c["chunk_id"] for c in chunks]))
        print(f"FAISS index: {len(chunks)} docs, dim={vecs.shape[1]} (yeni)")

    # Emb modeli query için de lazım
    if _faiss_emb is None:
        _faiss_emb = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )

    idx = faiss.IndexFlatIP(vecs.shape[1])
    idx.add(vecs)
    _faiss_idx = idx

def retrieve_dense(query: str, k: int = TOP_K) -> List[Dict]:
    qv = _faiss_emb.encode([query], normalize_embeddings=True).astype("float32")
    D, I = _faiss_idx.search(qv, k)
    return [{"chunk_id": int(I[0][r]), "score": float(D[0][r]),
             "text": _faiss_chunks[I[0][r]]["text"]} for r in range(k)]

def norm01(vals):
    lo, hi = min(vals), max(vals)
    if hi == lo:
        return [1.0] * len(vals)
    return [(v - lo) / (hi - lo) for v in vals]

def retrieve_hybrid(query: str, k: int = TOP_K, alpha: float = 0.5) -> List[Dict]:
    bm = retrieve_bm25(query, k * 2)
    dn = retrieve_dense(query, k * 2)
    bn = norm01([r["score"] for r in bm])
    dd = norm01([r["score"] for r in dn])
    scores: Dict[int, float] = {}
    for r, n in zip(bm, bn):
        scores[r["chunk_id"]] = scores.get(r["chunk_id"], 0) + (1 - alpha) * n
    for r, n in zip(dn, dd):
        scores[r["chunk_id"]] = scores.get(r["chunk_id"], 0) + alpha * n
    top  = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:k]
    cmap = {c["chunk_id"]: c for c in _bm25_chunks}
    return [{"chunk_id": cid, "score": sc, "text": cmap[cid]["text"]}
            for cid, sc in top if cid in cmap]

# ── Retrieval Metrics ──────────────────────────────────────────────────────
def recall_at_k(retrieved_ids, gold_ids, k):
    if not gold_ids:
        return float("nan")
    return len(set(retrieved_ids[:k]) & set(gold_ids)) / len(gold_ids)

def hit_at_k(retrieved_ids, gold_ids, k):
    if not gold_ids:
        return float("nan")
    return float(len(set(retrieved_ids[:k]) & set(gold_ids)) > 0)

def mrr(retrieved_ids, gold_ids):
    if not gold_ids:
        return float("nan")
    gold_set = set(gold_ids)
    for rank, rid in enumerate(retrieved_ids, 1):
        if rid in gold_set:
            return 1.0 / rank
    return 0.0

# ── LLM Backend ────────────────────────────────────────────────────────────
import openai
_oa = openai.OpenAI(api_key=OPENAI_API_KEY)

PRICING = {
    "gpt-4o":      (2.50, 10.00),
    "gpt-4o-mini": (0.15,  0.60),
}

SYSTEM_PROMPT = """Sen bir Türk yükseköğretim mevzuatı uyum uzmanısın.
Sana bir üniversite süreci ve ilgili YÖK mevzuat parçaları verilecek.
Her iddia için chunk_id atıfı yap.

JSON formatında yanıt ver:
{
  "compliance_score": <0-100>,
  "label": "<compliant|partial|non-compliant>",
  "explanation": "<Türkçe açıklama, chunk atıfları ile>",
  "cited_chunk_ids": [<tamsayı listesi>]
}"""

USER_TMPL = """## Süreç Metni
{process_text}

## Soru
{query}

## YÖK Mevzuat Parçaları
{chunks}

JSON yanıtını ver."""

def format_chunks(chunks: List[Dict]) -> str:
    return "\n\n".join(f"[chunk_id: {c['chunk_id']}]\n{c['text']}" for c in chunks)

def parse_json(raw: str) -> Optional[Dict]:
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group())
    except json.JSONDecodeError:
        return None

def llm_generate(model: str, process_text: str, query: str, chunks: List[Dict]) -> Dict:
    msgs = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": USER_TMPL.format(
            process_text=process_text[:800],
            query=query,
            chunks=format_chunks(chunks)[:3000],
        )},
    ]
    t0   = time.time()
    resp = _oa.chat.completions.create(
        model=model,
        messages=msgs,
        temperature=0.0,
        max_tokens=600,
    )
    latency = round(time.time() - t0, 3)
    raw     = resp.choices[0].message.content
    usage   = resp.usage
    pin, pout = PRICING.get(model, (0.15, 0.60))
    cost    = (usage.prompt_tokens * pin + usage.completion_tokens * pout) / 1_000_000

    ans = parse_json(raw)
    if not ans:
        avg = float(np.mean([c.get("score", 0.5) for c in chunks])) if chunks else 0.3
        s   = int(np.clip(avg * 100, 1, 100))
        ans = {"compliance_score": s,
               "label": "compliant" if s >= 70 else ("partial" if s >= 40 else "non-compliant"),
               "explanation": "Parse hatası — heuristic fallback.",
               "cited_chunk_ids": [c["chunk_id"] for c in chunks[:2]]}

    ans["latency"]           = latency
    ans["prompt_tokens"]     = usage.prompt_tokens
    ans["completion_tokens"] = usage.completion_tokens
    ans["cost_usd"]          = cost
    ans["model"]             = model
    return ans

# ── Benchmark Runner ───────────────────────────────────────────────────────
PIPELINES = ["no-rag", "bm25", "dense", "hybrid"]
MODELS    = ["gpt-4o-mini", "gpt-4o"]

def run_benchmark(cases: List[TestCase], max_cases: Optional[int] = None) -> pd.DataFrame:
    if max_cases:
        import random
        cases = random.sample(cases, min(max_cases, len(cases)))

    records = []
    n = len(cases)

    for pipeline in PIPELINES:
        for model in MODELS:
            tag = f"{pipeline}|{model}"
            print(f"\n{'='*50}\n{tag}\n{'='*50}")

            for idx, tc in enumerate(cases, 1):
                print(f"  [{idx}/{n}] {tc.case_id}", end="", flush=True)

                # Retrieve
                if   pipeline == "no-rag":
                    retrieved = []
                elif pipeline == "bm25":
                    retrieved = retrieve_bm25(tc.query, TOP_K)
                elif pipeline == "dense":
                    retrieved = retrieve_dense(tc.query, TOP_K)
                elif pipeline == "hybrid":
                    retrieved = retrieve_hybrid(tc.query, TOP_K)

                # LLM
                ans = llm_generate(model, tc.query, tc.process_text, retrieved)

                # Retrieval metrics (only if gold_chunk_ids available)
                rids  = [r["chunk_id"] for r in retrieved]
                gids  = tc.gold_chunk_ids or []
                rec_k = recall_at_k(rids, gids, TOP_K) if gids else None
                hit_k = hit_at_k(rids, gids, TOP_K)    if gids else None
                mrr_v = mrr(rids, gids)                 if gids else None

                # Accuracy: model_label vs gold_label
                model_label = ans.get("label", "")
                is_correct  = (model_label == tc.gold_label) if tc.gold_label else None

                records.append({
                    "case_id":         tc.case_id,
                    "pipeline":        pipeline,
                    "model":           model,
                    "gold_label":      tc.gold_label,
                    "gold_score":      tc.gold_score,
                    "pred_label":      model_label,
                    "pred_score":      ans.get("compliance_score"),
                    "correct":         is_correct,
                    "recall_at_k":     rec_k,
                    "hit_at_k":        hit_k,
                    "mrr":             mrr_v,
                    "latency_sec":     ans.get("latency", 0),
                    "cost_usd":        ans.get("cost_usd", 0),
                    "prompt_tokens":   ans.get("prompt_tokens", 0),
                    "completion_tokens": ans.get("completion_tokens", 0),
                    "explanation":     ans.get("explanation", "")[:300],
                })
                print(f"  → {model_label} (gold: {tc.gold_label or '?'})")

    df = pd.DataFrame(records)
    out = OUTPUT_DIR / "benchmark_results_clean.csv"
    df.to_csv(out, index=False)
    print(f"\n✅ {len(df)} rows → {out}")
    return df


def summarize(df: pd.DataFrame) -> pd.DataFrame:
    has_gold = df["gold_label"].notna() & (df["gold_label"] != "")

    rows = []
    for (pipeline, model), grp in df.groupby(["pipeline", "model"]):
        n = len(grp)
        acc = grp.loc[has_gold.reindex(grp.index, fill_value=False), "correct"].mean() \
              if has_gold.any() else float("nan")
        rows.append({
            "pipeline":       pipeline,
            "model":          model,
            "n":              n,
            "accuracy":       round(acc, 3)     if acc == acc else None,
            "mean_pred_score":round(grp["pred_score"].mean(), 1),
            "recall_at_k":   round(grp["recall_at_k"].mean(), 3),
            "mrr":           round(grp["mrr"].mean(), 3),
            "mean_latency":  round(grp["latency_sec"].mean(), 3),
            "total_cost":    round(grp["cost_usd"].sum(), 4),
        })

    summary = pd.DataFrame(rows)
    out = OUTPUT_DIR / "summary_clean.csv"
    summary.to_csv(out, index=False)
    print(f"\n📊 Özet → {out}")
    print(summary.to_string(index=False))
    return summary


# ── Entry Point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    JSONL_PATH = OUTPUT_DIR / "test_cases.jsonl"
    if not JSONL_PATH.exists():
        raise RuntimeError(f"test_cases.jsonl bulunamadı: {JSONL_PATH}")

    cases = load_cases(str(JSONL_PATH))
    print(f"\n{len(cases)} test case yüklendi.")

    gold_labeled = [tc for tc in cases if tc.gold_label]
    if not gold_labeled:
        print("\n⚠️  UYARI: Hiçbir test case'in gold_label'ı yok!")
        print("   Önce: python fix_experiments/generate_gold_labels.py")
        print("   Devam etmek için --force kullanın (accuracy hesaplanamaz).")
        if "--force" not in sys.argv:
            sys.exit(1)
    else:
        print(f"Gold label'lı: {len(gold_labeled)}/{len(cases)} case")

    # max_cases argümanı
    max_cases = None
    for arg in sys.argv[1:]:
        if arg.startswith("--max="):
            max_cases = int(arg.split("=")[1])

    print("\nYÖK PDF'leri yükleniyor...")
    yok_chunks = build_yok_chunks()

    print("BM25 index oluşturuluyor...")
    build_bm25_index(yok_chunks)

    print("FAISS index oluşturuluyor...")
    build_faiss_index(yok_chunks)

    print("\nBenchmark başlıyor...")
    df = run_benchmark(cases, max_cases=max_cases)

    print("\nÖzet hesaplanıyor...")
    summarize(df)

    print("\n✅ Tamamlandı!")
