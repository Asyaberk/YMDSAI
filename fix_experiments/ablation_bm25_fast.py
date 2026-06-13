#!/usr/bin/env python3
"""
Ablation Studies — BM25 Only (Fast Version)
=============================================
SentenceTransformer gerektirmez. Sadece BM25 + GPT-4o-mini kullanır.

Paper'da şöyle yazılacak:
  "Chunk size ablation was performed using BM25 retrieval to isolate the
   effect of segmentation granularity independently of the dense encoder."
  "Top-K ablation was performed across BM25 retrieval depths."

ÇALIŞTIRILACAK DENEYLER:
  1) Chunk Size Ablation: 150 / 250 / 350 / 500 kelime
  2) Top-K Ablation    : K = 1 / 3 / 5 / 10

ÇIKTILAR:
  experiment_outputs/ablation_chunk_size_summary.csv
  experiment_outputs/ablation_chunk_size_detail.csv
  experiment_outputs/ablation_topk_summary.csv
  experiment_outputs/ablation_topk_detail.csv

TAHMINI SÜRE: ~10-15 dakika (sadece BM25, encoding yok)
TAHMINI MALİYET: ~$0.15 (GPT-4o-mini, 160+160 çağrı)

Çalıştırma:
    cd /Users/asyaberk/Desktop/SeniorDesignExperiments
    .venv/bin/python3.14 fix_experiments/ablation_bm25_fast.py
"""

import os
import re
import json
import time
import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Dict
from dataclasses import dataclass, field
from dotenv import load_dotenv

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent
DATA_DIR   = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "experiment_outputs"

load_dotenv(BASE_DIR / ".env")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY bulunamadı. .env dosyasını kontrol edin.")

import openai
_oa = openai.OpenAI(api_key=OPENAI_API_KEY)

# ── Sabit parametreler ─────────────────────────────────────────────────────
CHUNK_SIZES         = [150, 250, 350, 500]  # Chunk size ablation değerleri
TOP_K_VALUES        = [1, 3, 5, 10]         # Top-K ablation değerleri
CHUNK_SIZE_BASELINE = 350                   # Top-K için sabit chunk size
OVERLAP_RATIO       = 0.17                  # Overlap = chunk_size × 0.17
MODEL               = "gpt-4o-mini"         # Ucuz model, yeterince iyi
YOK_KEYWORDS        = ["yok", "lisansustu", "cap", "yandal",
                        "yatay", "ek-madde", "yurt"]
PRICING             = (0.15, 0.60)          # gpt-4o-mini: input/output per 1M token

# ── Metin işleme yardımcıları ──────────────────────────────────────────────
def clean_text(t: str) -> str:
    """Fazla boşlukları ve satır sonlarını temizle."""
    return re.sub(r"\s+", " ", t).strip()

def tokenize(text: str) -> List[str]:
    """BM25 için Unicode kelime sınırı tabanlı tokenizasyon."""
    return re.findall(r"\b\w+\b", text.lower())

def load_pdf_text(path) -> str:
    """PDF'den metin çıkar."""
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    return clean_text("\n".join(p.extract_text() or "" for p in reader.pages))

def chunk_text(text: str, size: int, overlap: int) -> List[str]:
    """Kayan pencere ile metin parçalama."""
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i: i + size]))
        i += max(1, size - overlap)
    return chunks

# ── YÖK chunk'larını oluştur ───────────────────────────────────────────────
def build_yok_chunks(chunk_size: int) -> List[Dict]:
    """Verilen chunk_size ile YÖK PDF'lerini parçala."""
    overlap  = max(1, int(chunk_size * OVERLAP_RATIO))
    all_pdfs = sorted(DATA_DIR.rglob("*.pdf"))
    yok_pdfs = [p for p in all_pdfs
                if any(k in p.name.lower() for k in YOK_KEYWORDS)]

    chunks: List[Dict] = []
    for doc in yok_pdfs:
        text = load_pdf_text(doc)
        for c in chunk_text(text, chunk_size, overlap):
            chunks.append({
                "chunk_id": len(chunks),
                "text":     c,
                "source":   doc.name
            })
    print(f"    YÖK chunks: {len(chunks)} "
          f"(chunk_size={chunk_size}, overlap={overlap})", flush=True)
    return chunks

# ── BM25 index oluştur ─────────────────────────────────────────────────────
def build_bm25(chunks: List[Dict]):
    """BM25Okapi index döndür."""
    from rank_bm25 import BM25Okapi
    return BM25Okapi([tokenize(c["text"]) for c in chunks])

# ── BM25 retrieval ─────────────────────────────────────────────────────────
def retrieve_bm25(bm25, chunks: List[Dict], query: str, k: int) -> List[Dict]:
    """Top-k BM25 sonuçları, [0,1] normalize edilmiş skor ile."""
    scores = bm25.get_scores(tokenize(query))
    top    = np.argsort(scores)[::-1][:k]
    max_s  = float(scores.max()) if scores.max() > 0 else 1.0
    return [{"chunk_id": int(i),
             "score":    float(scores[i]) / max_s,
             "text":     chunks[i]["text"]}
            for i in top]

# ── Test case yükle ────────────────────────────────────────────────────────
@dataclass
class TestCase:
    case_id:        str
    process_text:   str
    query:          str
    gold_label:     str = ""
    gold_chunk_ids: List[int] = field(default_factory=list)

def load_cases(path: str) -> List[TestCase]:
    """JSONL dosyasından gold label'lı test case'leri yükle."""
    cases = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            if not d.get("gold_label", ""):
                continue  # Gold label olmayanları atla
            cases.append(TestCase(
                case_id        = d["case_id"],
                process_text   = d["process_text"],
                query          = d["query"],
                gold_label     = d["gold_label"],
                gold_chunk_ids = [int(x) for x in (d.get("gold_chunk_ids") or [])]
            ))
    return cases

# ── Retrieval metrikleri ───────────────────────────────────────────────────
def recall_at_k(retrieved_ids: List[int], gold_ids: List[int], k: int) -> float:
    """Retrieve edilen ilk k chunk içinde gold chunk'ların oranı."""
    if not gold_ids:
        return float("nan")
    return len(set(retrieved_ids[:k]) & set(gold_ids)) / len(gold_ids)

def mrr_score(retrieved_ids: List[int], gold_ids: List[int]) -> float:
    """İlk doğru sonucun sıra reciprocal'ı (Mean Reciprocal Rank)."""
    if not gold_ids:
        return float("nan")
    gold_set = set(gold_ids)
    for rank, rid in enumerate(retrieved_ids, 1):
        if rid in gold_set:
            return 1.0 / rank
    return 0.0

# ── LLM çağrısı ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "Sen bir Türk yükseköğretim mevzuatı uyum uzmanısın. "
    "Sana bir üniversite süreci ve ilgili YÖK mevzuat parçaları verilecek. "
    "SADECE şu JSON formatında yanıt ver:\n"
    '{"compliance_score": <0-100>, '
    '"label": "<compliant|partial|non-compliant>", '
    '"explanation": "<Türkçe açıklama>"}'
)

def llm_call(process_text: str, query: str, chunks: List[Dict]) -> Dict:
    """
    GPT-4o-mini ile uyum değerlendirmesi yap.
    Döndürür: label, compliance_score, explanation, latency, cost_usd
    """
    # Chunk'ları prompt için formatlı hale getir
    chunks_str = "\n\n".join(
        f"[chunk_id: {c['chunk_id']}]\n{c['text']}"
        for c in chunks
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": (
            f"## Üniversite Süreci\n{process_text[:800]}\n\n"
            f"## Soru\n{query}\n\n"
            f"## YÖK Mevzuat Parçaları\n{chunks_str[:3000]}\n\n"
            "JSON yanıtını ver."
        )},
    ]

    t0   = time.time()
    resp = _oa.chat.completions.create(
        model       = MODEL,
        messages    = messages,
        temperature = 0.0,      # Deterministik → tekrarlanabilir
        max_tokens  = 300,
    )
    latency = round(time.time() - t0, 3)
    raw     = resp.choices[0].message.content
    usage   = resp.usage

    # Maliyet hesabı (per token)
    pin, pout = PRICING
    cost = (usage.prompt_tokens * pin + usage.completion_tokens * pout) / 1_000_000

    # JSON parse
    m   = re.search(r"\{.*\}", raw, re.DOTALL)
    ans = {}
    if m:
        try:
            ans = json.loads(m.group())
        except json.JSONDecodeError:
            pass  # Fallback aşağıda

    # Parse başarısız olursa güvenli varsayılan
    if not ans:
        ans = {"compliance_score": 50,
               "label":            "partial",
               "explanation":      "JSON parse hatası — heuristic fallback."}

    ans["latency"]  = latency
    ans["cost_usd"] = cost
    return ans


# ══════════════════════════════════════════════════════════════════════════════
# ABLASYON 1: CHUNK SIZE
# ══════════════════════════════════════════════════════════════════════════════
def run_chunk_size_ablation(cases: List[TestCase]) -> pd.DataFrame:
    """
    Chunk size'ı değiştirerek BM25 retrieval + GPT-4o-mini accuracy'yi ölç.
    4 chunk size × 40 test case = 160 LLM çağrısı.
    """
    print("\n" + "=" * 60)
    print("ABLASYON 1: CHUNK SIZE  (150 / 250 / 350 / 500 kelime)")
    print("Pipeline: BM25  |  Model: gpt-4o-mini")
    print("=" * 60, flush=True)

    all_records = []

    for chunk_size in CHUNK_SIZES:
        print(f"\n→ chunk_size = {chunk_size}", flush=True)

        # 1. Bu chunk size için YÖK corpus'unu yeniden parçala
        yok_chunks = build_yok_chunks(chunk_size)

        # 2. BM25 index oluştur (hızlı, encoding yok)
        bm25 = build_bm25(yok_chunks)
        print(f"    BM25 index hazır.", flush=True)

        # 3. Her test case için retrieve + LLM
        for i, tc in enumerate(cases, 1):
            print(f"    [{i:02d}/{len(cases)}] {tc.case_id} ...",
                  end="", flush=True)

            # BM25 ile TOP_K=5 retrieve (sabit)
            retrieved = retrieve_bm25(bm25, yok_chunks, tc.query, k=5)

            # GPT-4o-mini ile değerlendirme
            ans = llm_call(tc.process_text, tc.query, retrieved)

            # Metrikler
            rids  = [r["chunk_id"] for r in retrieved]
            rec   = recall_at_k(rids, tc.gold_chunk_ids, 5)
            mrr   = mrr_score(rids, tc.gold_chunk_ids)
            is_ok = (ans.get("label") == tc.gold_label)

            status = "✓" if is_ok else "✗"
            print(f" {ans.get('label')} (gold: {tc.gold_label}) {status}",
                  flush=True)

            all_records.append({
                "experiment":   "chunk_size",
                "chunk_size":   chunk_size,
                "overlap":      max(1, int(chunk_size * OVERLAP_RATIO)),
                "top_k":        5,
                "case_id":      tc.case_id,
                "gold_label":   tc.gold_label,
                "pred_label":   ans.get("label", ""),
                "pred_score":   ans.get("compliance_score"),
                "correct":      is_ok,
                "recall_at_k":  rec,
                "mrr":          mrr,
                "latency_sec":  ans.get("latency", 0),
                "cost_usd":     ans.get("cost_usd", 0),
            })

    df = pd.DataFrame(all_records)

    # Detay CSV
    detail_path = OUTPUT_DIR / "ablation_chunk_size_detail.csv"
    df.to_csv(detail_path, index=False)
    print(f"\n  Detay kaydedildi: {detail_path}", flush=True)

    # Özet CSV — paper'daki tablo bu olacak
    summary_rows = []
    for cs, grp in df.groupby("chunk_size"):
        summary_rows.append({
            "chunk_size":      cs,
            "overlap":         grp["overlap"].iloc[0],
            "n":               len(grp),
            "accuracy":        round(grp["correct"].mean(), 3),
            "mean_pred_score": round(grp["pred_score"].mean(), 1),
            "recall_at_k":     round(grp["recall_at_k"].mean(), 3),
            "mrr":             round(grp["mrr"].mean(), 3),
            "mean_latency":    round(grp["latency_sec"].mean(), 3),
            "total_cost_usd":  round(grp["cost_usd"].sum(), 4),
        })
    summary = pd.DataFrame(summary_rows)
    summary_path = OUTPUT_DIR / "ablation_chunk_size_summary.csv"
    summary.to_csv(summary_path, index=False)

    print("\n  ── CHUNK SIZE ABLATION ÖZET ──")
    print(summary.to_string(index=False), flush=True)
    return df


# ══════════════════════════════════════════════════════════════════════════════
# ABLASYON 2: TOP-K
# ══════════════════════════════════════════════════════════════════════════════
def run_topk_ablation(cases: List[TestCase]) -> pd.DataFrame:
    """
    Top-K'yı değiştirerek BM25 retrieval depth'in etkisini ölç.
    Chunk size = 350 (baseline) sabit tutulur.
    4 K değeri × 40 test case = 160 LLM çağrısı.
    """
    print("\n" + "=" * 60)
    print("ABLASYON 2: TOP-K  (K = 1 / 3 / 5 / 10)")
    print(f"Pipeline: BM25  |  Chunk size: {CHUNK_SIZE_BASELINE}  |  Model: gpt-4o-mini")
    print("=" * 60, flush=True)

    # Baseline chunk size ile YÖK corpus'unu bir kez yükle
    yok_chunks = build_yok_chunks(CHUNK_SIZE_BASELINE)
    bm25       = build_bm25(yok_chunks)
    print(f"    BM25 index hazır.", flush=True)

    all_records = []

    for k in TOP_K_VALUES:
        print(f"\n→ Top-K = {k}", flush=True)

        for i, tc in enumerate(cases, 1):
            print(f"    [{i:02d}/{len(cases)}] {tc.case_id} ...",
                  end="", flush=True)

            # BM25 ile k chunk retrieve
            retrieved = retrieve_bm25(bm25, yok_chunks, tc.query, k=k)

            # GPT-4o-mini değerlendirmesi
            ans = llm_call(tc.process_text, tc.query, retrieved)

            # Metrikler
            rids  = [r["chunk_id"] for r in retrieved]
            rec   = recall_at_k(rids, tc.gold_chunk_ids, k)
            mrr   = mrr_score(rids, tc.gold_chunk_ids)
            is_ok = (ans.get("label") == tc.gold_label)

            status = "✓" if is_ok else "✗"
            print(f" {ans.get('label')} (gold: {tc.gold_label}) {status}",
                  flush=True)

            all_records.append({
                "experiment":   "topk",
                "chunk_size":   CHUNK_SIZE_BASELINE,
                "top_k":        k,
                "case_id":      tc.case_id,
                "gold_label":   tc.gold_label,
                "pred_label":   ans.get("label", ""),
                "pred_score":   ans.get("compliance_score"),
                "correct":      is_ok,
                "recall_at_k":  rec,
                "mrr":          mrr,
                "latency_sec":  ans.get("latency", 0),
                "cost_usd":     ans.get("cost_usd", 0),
            })

    df = pd.DataFrame(all_records)

    # Detay CSV
    detail_path = OUTPUT_DIR / "ablation_topk_detail.csv"
    df.to_csv(detail_path, index=False)
    print(f"\n  Detay kaydedildi: {detail_path}", flush=True)

    # Özet CSV
    summary_rows = []
    for k_val, grp in df.groupby("top_k"):
        summary_rows.append({
            "top_k":           k_val,
            "n":               len(grp),
            "accuracy":        round(grp["correct"].mean(), 3),
            "mean_pred_score": round(grp["pred_score"].mean(), 1),
            "recall_at_k":     round(grp["recall_at_k"].mean(), 3),
            "mrr":             round(grp["mrr"].mean(), 3),
            "mean_latency":    round(grp["latency_sec"].mean(), 3),
            "total_cost_usd":  round(grp["cost_usd"].sum(), 4),
        })
    summary = pd.DataFrame(summary_rows)
    summary_path = OUTPUT_DIR / "ablation_topk_summary.csv"
    summary.to_csv(summary_path, index=False)

    print("\n  ── TOP-K ABLATION ÖZET ──")
    print(summary.to_string(index=False), flush=True)
    return df


# ══════════════════════════════════════════════════════════════════════════════
# ANA PROGRAM
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("ComplianceAI — BM25 Ablation Studies (Fast Version)")
    print("SentenceTransformer kullanılmaz — sadece BM25 + GPT-4o-mini")
    print("=" * 60, flush=True)

    # Test case'leri yükle — RAG-aware > dengeli > orijinal
    rag_aware = OUTPUT_DIR / "test_cases_rag_aware.jsonl"
    balanced  = OUTPUT_DIR / "test_cases_balanced.jsonl"
    original  = OUTPUT_DIR / "test_cases.jsonl"
    if rag_aware.exists():
        jsonl_path = rag_aware
        print(f"RAG-aware test seti kullanılıyor: {jsonl_path}")
    elif balanced.exists():
        jsonl_path = balanced
        print(f"Dengeli test seti kullanılıyor: {jsonl_path}")
    else:
        jsonl_path = original
        print(f"Orijinal test seti kullanılıyor: {jsonl_path}")

    cases = load_cases(str(jsonl_path))
    print(f"\n{len(cases)} gold-labeled test case yüklendi.", flush=True)

    if not cases:
        raise RuntimeError("Gold label'lı test case yok. "
                           "generate_gold_labels.py çalıştırın.")

    total_calls = len(CHUNK_SIZES) * len(cases) + len(TOP_K_VALUES) * len(cases)
    print(f"Toplam LLM çağrısı: {total_calls} × gpt-4o-mini", flush=True)
    print(f"Tahmini maliyet:    ~${total_calls * 0.0003:.2f}", flush=True)
    print(f"Tahmini süre:       ~{total_calls * 3 // 60} dakika", flush=True)

    # ── Ablasyon 1: Chunk Size ─────────────────────────────────────────────
    df_chunk = run_chunk_size_ablation(cases)

    # ── Ablasyon 2: Top-K ──────────────────────────────────────────────────
    df_topk = run_topk_ablation(cases)

    # ── Figürleri güncelle ────────────────────────────────────────────────
    print("\n📊 Figürler güncelleniyor...", flush=True)
    try:
        import sys, subprocess
        result = subprocess.run(
            [sys.executable,
             "fix_experiments/generate_paper_figures.py"],
            capture_output=True, text=True,
            cwd=str(BASE_DIR)
        )
        if result.returncode == 0:
            print("  ✅ Figürler güncellendi: paper/figures/", flush=True)
        else:
            print(f"  ⚠ Figür güncellemesi başarısız: {result.stderr[:200]}", flush=True)
    except Exception as e:
        print(f"  ⚠ Figür güncellemesi atlandı: {e}", flush=True)

    print("\n" + "=" * 60)
    print("✅ Tüm ablasyon deneyleri tamamlandı!")
    print(f"   Chunk size → {OUTPUT_DIR}/ablation_chunk_size_summary.csv")
    print(f"   Top-K      → {OUTPUT_DIR}/ablation_topk_summary.csv")
    print("=" * 60, flush=True)
