"""
FastAPI Backend — Compliance RAG Experiment API
================================================
Endpoint'ler:
  GET /api/health        → sunucu kontrolü
  GET /api/summary       → pipeline×model özet metrikleri (Dashboard)
  GET /api/experiments   → ham benchmark satırları (RAGExperiments)
  GET /api/cases         → test case'lerin gold label'ları

Çalıştırma:
  cd /Users/asyaberk/Desktop/SeniorDesignExperiments
  .venv/bin/uvicorn backend.main:app --reload --port 8000
"""

import json
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
OUTPUT_DIR  = BASE_DIR / "experiment_outputs"
SUMMARY_CSV = OUTPUT_DIR / "summary_clean.csv"
RESULTS_CSV = OUTPUT_DIR / "benchmark_results_clean.csv"
CASES_JSONL = OUTPUT_DIR / "test_cases.jsonl"

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Compliance RAG API",
    description="YÖK Uyumluluk RAG Benchmark sonuçlarını sunar.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # local dev — tüm originlere izin ver
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

# ── Label Maps ──────────────────────────────────────────────────────────────
PIPELINE_LABELS = {
    "no-rag": "No-RAG (Baseline)",
    "bm25":   "BM25 (Sparse)",
    "dense":  "Dense (FAISS)",
    "hybrid": "Hybrid (BM25+Dense)",
}
PIPELINE_COLORS = {
    "no-rag": "#6B7280",
    "bm25":   "#3B82F6",
    "dense":  "#10B981",
    "hybrid": "#F59E0B",
}


def safe_float(val, decimals=3):
    try:
        v = float(val)
        return round(v, decimals) if v == v else None
    except (TypeError, ValueError):
        return None


# ── Routes ──────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "summary_exists": SUMMARY_CSV.exists(),
        "results_exists": RESULTS_CSV.exists(),
    }


@app.get("/api/summary")
def get_summary():
    df = pd.read_csv(SUMMARY_CSV)
    rows = []
    for _, r in df.iterrows():
        pipeline = str(r["pipeline"])
        model    = str(r["model"])
        rows.append({
            "pipeline":        pipeline,
            "pipeline_label":  PIPELINE_LABELS.get(pipeline, pipeline),
            "pipeline_color":  PIPELINE_COLORS.get(pipeline, "#64748B"),
            "model":           model,
            "n":               int(r.get("n", 40)),
            "accuracy":        safe_float(r.get("accuracy")),
            "recall_at_k":     safe_float(r.get("recall_at_k")),
            "mrr":             safe_float(r.get("mrr")),
            "mean_pred_score": safe_float(r.get("mean_pred_score"), 1),
            "mean_latency":    safe_float(r.get("mean_latency"), 2),
            "total_cost":      safe_float(r.get("total_cost"), 4),
        })

    best_by_recall = max(rows, key=lambda x: x["recall_at_k"] or 0)
    total_cost_all = round(sum(r["total_cost"] or 0 for r in rows), 3)
    mean_accuracy  = round(sum(r["accuracy"] or 0 for r in rows) / len(rows), 3)

    return {
        "rows": rows,
        "meta": {
            "best_pipeline":    best_by_recall["pipeline_label"],
            "best_recall_at_k": best_by_recall["recall_at_k"],
            "best_model":       best_by_recall["model"],
            "total_cost_usd":   total_cost_all,
            "mean_accuracy":    mean_accuracy,
            "n_cases":          int(df["n"].max()),
            "n_pipelines":      int(df["pipeline"].nunique()),
        },
    }


@app.get("/api/experiments")
def get_experiments():
    df = pd.read_csv(RESULTS_CSV)
    grp = df.groupby(["pipeline", "model"])

    agg_rows = []
    for (pipeline, model), g in grp:
        agg_rows.append({
            "pipeline":        pipeline,
            "pipeline_label":  PIPELINE_LABELS.get(pipeline, pipeline),
            "pipeline_color":  PIPELINE_COLORS.get(pipeline, "#64748B"),
            "model":           model,
            "n":               len(g),
            "accuracy":        safe_float(g["correct"].mean()),
            "recall_at_k":     safe_float(g["recall_at_k"].mean()),
            "mrr":             safe_float(g["mrr"].mean()),
            "mean_pred_score": safe_float(g["pred_score"].mean(), 1),
            "mean_latency":    safe_float(g["latency_sec"].mean(), 2),
            "total_cost":      safe_float(g["cost_usd"].sum(), 4),
        })

    raw_rows = []
    for _, row in df.iterrows():
        raw_rows.append({
            "case_id":     str(row.get("case_id", "")),
            "pipeline":    str(row.get("pipeline", "")),
            "model":       str(row.get("model", "")),
            "gold_label":  str(row.get("gold_label", "")),
            "pred_label":  str(row.get("pred_label", "")),
            "pred_score":  safe_float(row.get("pred_score")),
            "correct":     bool(row["correct"]) if pd.notna(row.get("correct")) else None,
            "recall_at_k": safe_float(row.get("recall_at_k")),
            "mrr":         safe_float(row.get("mrr")),
            "latency_sec": safe_float(row.get("latency_sec"), 2),
            "cost_usd":    safe_float(row.get("cost_usd"), 5),
        })

    return {"aggregated": agg_rows, "raw": raw_rows}


@app.get("/api/cases")
def get_cases():
    cases = []
    with open(CASES_JSONL, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                d = json.loads(line)
                cases.append({
                    "case_id":        d.get("case_id"),
                    "query":          d.get("query", ""),
                    "gold_label":     d.get("gold_label", ""),
                    "gold_score":     safe_float(d.get("gold_score")),
                    "gold_chunk_ids": d.get("gold_chunk_ids", []),
                    "process_text":   d.get("process_text", "")[:300],
                })
    return {"cases": cases, "total": len(cases)}
