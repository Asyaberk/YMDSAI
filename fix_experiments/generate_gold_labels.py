#!/usr/bin/env python3
"""
Gold Label Generator — Compliance Benchmark
============================================
Bu script, test case'lerdeki boş gold_label alanlarını GPT-4o kullanarak
gerçek ground truth ile doldurur.

Çalıştırma:
    cd /Users/asyaberk/Desktop/SeniorDesignExperiments
    python fix_experiments/generate_gold_labels.py

JSON'da güven skoru ve chunk ID'leri de üretir.
"""

import os
import re
import json
import time
from pathlib import Path
from collections import Counter
from dotenv import load_dotenv

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent
DATA_DIR   = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "experiment_outputs"
JSONL_PATH = OUTPUT_DIR / "test_cases.jsonl"

load_dotenv(BASE_DIR / ".env")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY bulunamadı. .env dosyasını kontrol edin.")

import openai
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# ── PDF Loading & Chunking ─────────────────────────────────────────────────
CHUNK_SIZE    = 350
CHUNK_OVERLAP = 60
YOK_KEYWORDS  = ["yok", "lisansustu", "cap", "yandal", "yatay", "ek-madde", "yurt"]

def clean_text(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip()

def load_pdf_text(path) -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    return clean_text("\n".join(p.extract_text() or "" for p in reader.pages))

def chunk_text(text: str, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += max(1, size - overlap)
    return chunks

def build_yok_chunks():
    all_pdfs = sorted(DATA_DIR.rglob("*.pdf"))
    yok_pdfs = [p for p in all_pdfs if any(k in p.name.lower() for k in YOK_KEYWORDS)]
    if not yok_pdfs:
        raise RuntimeError(f"YÖK PDF'i bulunamadı: {DATA_DIR}")

    chunks = []
    for doc in yok_pdfs:
        print(f"  Loading: {doc.name}")
        text = load_pdf_text(doc)
        for c in chunk_text(text):
            chunks.append({"chunk_id": len(chunks), "text": c})
    print(f"  {len(chunks)} YÖK chunk yüklendi.\n")
    return chunks

# ── BM25 Retrieval ─────────────────────────────────────────────────────────
def build_bm25_index(chunks):
    from rank_bm25 import BM25Okapi
    tokenized = [re.findall(r"\b\w+\b", c["text"].lower()) for c in chunks]
    return BM25Okapi(tokenized)

def retrieve_top_chunks(bm25, yok_chunks, query: str, k=10):
    import numpy as np
    tokens = re.findall(r"\b\w+\b", query.lower())
    scores = bm25.get_scores(tokens)
    top    = scores.argsort()[::-1][:k]
    return [{"chunk_id": int(i), "score": float(scores[i]), "text": yok_chunks[i]["text"]}
            for i in top]

# ── GPT-4o Gold Label Prompt ───────────────────────────────────────────────
GOLD_PROMPT = """Sen bir Türk yükseköğretim hukuku uzmanısın.
Aşağıda bir İstanbul Bilgi Üniversitesi yönetmelik metni ve ilgili YÖK mevzuat parçaları verilmiştir.

## Üniversite Metni:
{process_text}

## İlgili YÖK Mevzuat Parçaları:
{chunks}

## Görev:
Bu üniversite metnini YÖK mevzuatı açısından dikkatlice değerlendir.

Şu JSON formatında SADECE JSON döndür (başka hiçbir şey ekleme):
{{
  "gold_label": "<compliant|partial|non-compliant>",
  "gold_score": <0-100 arası uyum yüzdesi>,
  "confidence": <0.0-1.0 arası değerlendirme güveni>,
  "explanation": "<Türkçe, 2-3 cümle açıklama>",
  "gold_chunk_ids": [<en ilgili chunk_id'leri, maksimum 3 tane>]
}}

Etiket tanımları:
- "compliant": YÖK mevzuatıyla tamamen veya büyük ölçüde uyumlu (≥80 puan)
- "partial": Kısmen uyumlu, önemli eksiklikler var (40-79 puan)
- "non-compliant": YÖK mevzuatıyla belirgin biçimde uyumsuz (<40 puan)"""


def parse_json_safe(raw: str):
    """JSON'u güvenli şekilde parse eder."""
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group())
    except json.JSONDecodeError:
        return None


def generate_gold_label(process_text: str, chunks: list):
    """GPT-4o ile gold label üretir."""
    chunks_str = "\n\n".join(
        f"[chunk_id: {c['chunk_id']}]\n{c['text'][:500]}" for c in chunks[:8]
    )
    prompt = GOLD_PROMPT.format(
        process_text=process_text[:1000],
        chunks=chunks_str
    )
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=600,
    )
    raw = response.choices[0].message.content
    return parse_json_safe(raw)


# ── Main ───────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("Gold Label Generator — Compliance Benchmark")
    print("=" * 60)

    # Load test cases
    if not JSONL_PATH.exists():
        raise RuntimeError(f"Test case dosyası bulunamadı: {JSONL_PATH}")

    test_cases = []
    with open(JSONL_PATH, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                test_cases.append(json.loads(line))

    total = len(test_cases)
    print(f"\n{total} test case yüklendi.")

    # Mevcut gold_label dağılımı
    existing = Counter(tc.get("gold_label", "") for tc in test_cases)
    print(f"Mevcut gold_label dağılımı: {dict(existing)}")

    # Sadece boş gold_label'ları işle (--all ile override edilebilir)
    import sys
    process_all = "--all" in sys.argv
    to_process  = test_cases if process_all else [
        tc for tc in test_cases if not tc.get("gold_label", "")
    ]
    print(f"\nİşlenecek: {len(to_process)} test case {'(tümü)' if process_all else '(sadece boş)'}")

    if not to_process:
        print("Tüm test case'lerin zaten gold_label'ı var. --all kullanın.")
        return

    # Build index
    print("\nYÖK PDF'leri yükleniyor...")
    yok_chunks = build_yok_chunks()
    bm25       = build_bm25_index(yok_chunks)

    # Process
    errors    = 0
    processed = 0

    # tc_map: case_id → tc (mevcut tüm case'leri tutar)
    tc_map = {tc["case_id"]: tc for tc in test_cases}

    for i, tc in enumerate(to_process):
        case_id = tc["case_id"]
        print(f"\n[{i+1}/{len(to_process)}] {case_id}")

        try:
            # Retrieve candidate chunks
            chunks  = retrieve_top_chunks(bm25, yok_chunks, tc["query"], k=10)

            # GPT-4o gold label
            result  = generate_gold_label(tc["process_text"], chunks)

            if result:
                gold_label = result.get("gold_label", "")
                gold_score = result.get("gold_score")
                confidence = result.get("confidence", 0)
                chunk_ids  = result.get("gold_chunk_ids", [])
                explanation= result.get("explanation", "")

                # Validate label
                valid_labels = {"compliant", "partial", "non-compliant"}
                if gold_label not in valid_labels:
                    print(f"  ⚠ Geçersiz etiket: '{gold_label}' — atlanıyor")
                    errors += 1
                    continue

                tc_map[case_id]["gold_label"]     = gold_label
                tc_map[case_id]["gold_score"]     = gold_score
                tc_map[case_id]["gold_chunk_ids"] = chunk_ids
                tc_map[case_id]["notes"]          = (
                    f"GPT-4o gold [conf={confidence:.2f}]: {explanation[:120]}"
                )

                print(f"  ✅ label={gold_label}, score={gold_score}, "
                      f"conf={confidence:.2f}, chunks={chunk_ids}")
                processed += 1
            else:
                print(f"  ❌ JSON parse hatası — ham yanıt loglandı")
                errors += 1

        except Exception as e:
            print(f"  ❌ HATA: {e}")
            errors += 1

        time.sleep(0.8)   # Rate limiting

    # Save
    updated = list(tc_map.values())
    with open(JSONL_PATH, "w", encoding="utf-8") as f:
        for tc in updated:
            f.write(json.dumps(tc, ensure_ascii=False) + "\n")

    print("\n" + "=" * 60)
    print(f"Tamamlandı! İşlenen: {processed}, Hata: {errors}")
    labels = Counter(tc.get("gold_label", "") for tc in updated)
    print(f"Gold label dağılımı: {dict(labels)}")
    print(f"Dosya kaydedildi: {JSONL_PATH}")


if __name__ == "__main__":
    main()
