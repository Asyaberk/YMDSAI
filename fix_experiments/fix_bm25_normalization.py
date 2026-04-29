#!/usr/bin/env python3
"""
BM25 Normalization Fix — Sanity Check
======================================
v3.ipynb'deki score_similarity() fonksiyonu BM25 ham skorlarını
clip(0,1) yapıyor. BM25 skorları 5-10+ olabileceğinden hepsi 1.0
oluyor → mean_sim = 100.

Bu script:
1. Hatayı gösterir
2. Düzeltilmiş retrieve_bm25() çıktısını gösterir

v3.ipynb'de uygulanacak düzeltme aşağıda belirtilmiştir.
"""

import re
import numpy as np
from pathlib import Path
from pypdf import PdfReader
from rank_bm25 import BM25Okapi

BASE_DIR  = Path(__file__).parent.parent
DATA_DIR  = BASE_DIR / "data"

# ── PDF & Chunking Helpers ─────────────────────────────────────────────────
def clean_text(t):
    return re.sub(r"\s+", " ", t).strip()

def load_pdf_text(path):
    reader = PdfReader(str(path))
    return clean_text("\n".join(p.extract_text() or "" for p in reader.pages))

def chunk_text(text, size=350, overlap=60):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += max(1, size - overlap)
    return chunks

# Load one YÖK PDF to test
YOK_KEYWORDS = ["yok", "lisansustu", "cap", "yandal", "yatay", "ek-madde", "yurt"]
all_pdfs = sorted(DATA_DIR.rglob("*.pdf"))
yok_pdfs = [p for p in all_pdfs if any(k in p.name.lower() for k in YOK_KEYWORDS)]

chunks = []
for doc in yok_pdfs[:2]:   # just first 2 for speed
    text = load_pdf_text(doc)
    for c in chunk_text(text):
        chunks.append({"chunk_id": len(chunks), "text": c})

# Build BM25
tokenize = lambda t: re.findall(r"\b\w+\b", t.lower())
bm25 = BM25Okapi([tokenize(c["text"]) for c in chunks])

# ── BUGGY version (current v3.ipynb) ──────────────────────────────────────
def retrieve_bm25_buggy(query: str, k=5):
    scores = bm25.get_scores(tokenize(query))
    top    = np.argsort(scores)[::-1][:k]
    return [{"chunk_id": int(i), "score": float(scores[i]), "text": chunks[i]["text"]}
            for i in top]

def score_similarity_buggy(chunks_list):
    scores = [c.get("score", 0.0) for c in chunks_list]
    if not scores:
        return 0.0
    w = np.linspace(1.0, 0.5, len(scores))
    return round(1 + 99 * float(np.average(np.clip(scores, 0, 1), weights=w)), 2)

# ── FIXED version ──────────────────────────────────────────────────────────
def retrieve_bm25_fixed(query: str, k=5):
    """
    FIX: BM25 skorlarını [0,1] aralığına normalize eder.
    Bu değişikliği v3.ipynb'deki retrieve_bm25() fonksiyonuna uygulayın.
    """
    scores  = bm25.get_scores(tokenize(query))
    top     = np.argsort(scores)[::-1][:k]
    max_s   = float(scores.max()) if scores.max() > 0 else 1.0
    return [{"chunk_id": int(i), "score": float(scores[i]) / max_s, "text": chunks[i]["text"]}
            for i in top]

def score_similarity_fixed(chunks_list):
    """score_similarity() aynı kalabilir — sadece BM25 retrieve düzeltilmeli."""
    scores = [c.get("score", 0.0) for c in chunks_list]
    if not scores:
        return 0.0
    w = np.linspace(1.0, 0.5, len(scores))
    return round(1 + 99 * float(np.average(np.clip(scores, 0, 1), weights=w)), 2)

# ── Demonstrate ────────────────────────────────────────────────────────────
query = "Lisans programında kredi yükü sınırı nedir?"

res_buggy = retrieve_bm25_buggy(query)
res_fixed = retrieve_bm25_fixed(query)

print("=" * 60)
print("BUG: Mevcut BM25 ham skorlar (clip(0,1) sonrası hepsi 1.0)")
print("=" * 60)
print("Ham BM25 skorları:", [round(r["score"], 3) for r in res_buggy])
print("score_similarity():", score_similarity_buggy(res_buggy), "← YANLIŞ! (hep 100)")

print()
print("=" * 60)
print("FIX: Normalize edilmiş BM25 skorlar")
print("=" * 60)
print("Normalize skorlar:", [round(r["score"], 3) for r in res_fixed])
print("score_similarity():", score_similarity_fixed(res_fixed), "← DOĞRU")

print()
print("=" * 60)
print("v3.ipynb'de uygulanacak değişiklik:")
print("=" * 60)
print("""
### retrieve_bm25() fonksiyonunu şu şekilde güncelleyin:

def retrieve_bm25(query: str, k: int = TOP_K) -> List[Dict]:
    scores  = _bm25.get_scores(tokenize(query))
    top     = np.argsort(scores)[::-1][:k]
    max_s   = float(scores.max()) if scores.max() > 0 else 1.0   # ← YENİ SATIR
    return [{"chunk_id": int(i), "score": float(scores[i]) / max_s,  # ← BÖLME EKLENDİ
             "text": _bm25_chunks[i]["text"]} for i in top]

### score_similarity() DEĞİŞMESİNE GEREK YOK.
""")
