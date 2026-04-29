#!/usr/bin/env python3
"""
FAISS Index Pre-builder
=======================
FAISS embedding'i numpy dosyasına kaydeder.
Sonraki çalıştırmalarda tekrar hesaplanmaz.

Çalıştırma:
    python fix_experiments/prebuild_faiss.py
"""

import re
import numpy as np
from pathlib import Path
from pypdf import PdfReader

BASE_DIR  = Path(__file__).parent.parent
DATA_DIR  = BASE_DIR / "data"
CACHE_DIR = BASE_DIR / "experiment_outputs"
CACHE_VEC = CACHE_DIR / "faiss_vectors.npy"
CACHE_IDS = CACHE_DIR / "faiss_chunk_ids.npy"

CHUNK_SIZE    = 350
CHUNK_OVERLAP = 60
YOK_KEYWORDS  = ["yok", "lisansustu", "cap", "yandal", "yatay", "ek-madde", "yurt"]
MODEL_NAME    = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def clean_text(t):
    return re.sub(r"\s+", " ", t).strip()


def load_pdf_text(path):
    reader = PdfReader(str(path))
    return clean_text("\n".join(p.extract_text() or "" for p in reader.pages))


def chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += max(1, size - overlap)
    return chunks


def build_yok_chunks():
    all_pdfs = sorted(DATA_DIR.rglob("*.pdf"))
    yok_pdfs = [p for p in all_pdfs if any(k in p.name.lower() for k in YOK_KEYWORDS)]
    chunks = []
    for doc in yok_pdfs:
        print(f"  Loading: {doc.name}")
        text = load_pdf_text(doc)
        for c in chunk_text(text):
            chunks.append({"chunk_id": len(chunks), "text": c})
    return chunks


if __name__ == "__main__":
    print("=== FAISS Index Pre-builder ===")
    print("\nYÖK PDF'leri yükleniyor...")
    chunks = build_yok_chunks()
    print(f"  {len(chunks)} chunk yüklendi.")

    print(f"\nSentenceTransformer modeli yükleniyor: {MODEL_NAME}")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)

    print("\n248 chunk encode ediliyor... (bu 5-15 dakika sürebilir)")
    texts = [c["text"] for c in chunks]
    vecs  = model.encode(
        texts,
        show_progress_bar=True,
        normalize_embeddings=True,
        batch_size=32,
    ).astype("float32")

    np.save(str(CACHE_VEC), vecs)
    np.save(str(CACHE_IDS), np.array([c["chunk_id"] for c in chunks]))

    print(f"\n✅ Kaydedildi:")
    print(f"  {CACHE_VEC}  (shape={vecs.shape})")
    print(f"  {CACHE_IDS}")
    print("\nArtık run_benchmark_clean.py hızlı çalışacak.")
