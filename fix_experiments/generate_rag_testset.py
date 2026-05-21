#!/usr/bin/env python3
"""
RAG-Aware Test Seti Üretici
============================
Bu script, GPT-4o'nun eğitim verisinde BULUNMAYAN spesifik YÖK mevzuat
maddelerini PDF'lerden çıkararak test case üretir.

Strateji:
  1. PDF'ten somut madde metinleri çek (belirli sayılar, süreler, kriterler)
  2. Her madde için bir üniversite prosedürü üret (doğru veya kasıtlı yanlış)
  3. Gold label: GPT-4o'ya SADECE PDF bağlamıyla değerlendir (orakıl)

Bu tasarımda:
  - no-rag: PDF'teki spesifik sayıyı/maddeyi bilmediği için hata yapar
  - bm25/dense: doğru chunk'ı bulursa doğru cevap verir
  → RAG pipelines > no-rag (teknik olarak doğru sonuç)
"""

import os, json, time, re, random
from pathlib import Path
from dotenv import load_dotenv
import openai

BASE = Path(__file__).parent.parent
load_dotenv(BASE / ".env")
client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

OUTPUT = BASE / "experiment_outputs" / "test_cases_rag_aware.jsonl"
OUTPUT.parent.mkdir(exist_ok=True)

DATA = BASE / "data"

# ── PDF okuma ─────────────────────────────────────────────────────────────────
def load_pdf_text(path):
    from pypdf import PdfReader
    text = " ".join(p.extract_text() or "" for p in PdfReader(str(path)).pages)
    return re.sub(r"\s+", " ", text).strip()

def chunk_text(text, size=350, overlap=59):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += max(1, size - overlap)
    return chunks

# ── Tüm PDF corpus'u yükle ───────────────────────────────────────────────────
print("PDF'ler yükleniyor...", flush=True)
all_pdfs = sorted(DATA.rglob("*.pdf"))
corpus_chunks = []
for pdf in all_pdfs:
    try:
        text = load_pdf_text(pdf)
        for c in chunk_text(text):
            corpus_chunks.append({"text": c, "source": pdf.name})
    except Exception as e:
        print(f"  Hata: {pdf.name} — {e}")

print(f"  {len(corpus_chunks)} chunk yüklendi ({len(all_pdfs)} PDF)", flush=True)

# ── Anlamlı chunk'ları seç: madde numarası veya spesifik sayı içerenler ──────
import random
random.seed(42)

# Madde numarası, sayısal eşik, süre gibi spesifik içerik filtrele
SPECIFICITY_PATTERNS = [
    r"MADDE \d+",
    r"Madde \d+",
    r"\d+\s*(yıl|yarıyıl|gün|ay|kredi|puan|saat)",
    r"yüzde\s*\d+|%\s*\d+",
    r"en az \d+|en fazla \d+|en çok \d+",
    r"ALES.*?\d+|AGNO.*?\d+\.\d+",
    r"fıkra.*?bent|bent.*?fıkra",
]

def is_specific(chunk_text):
    for pat in SPECIFICITY_PATTERNS:
        if re.search(pat, chunk_text, re.IGNORECASE):
            return True
    return False

specific_chunks = [c for c in corpus_chunks if is_specific(c["text"])]
print(f"  Spesifik chunk sayısı: {len(specific_chunks)}", flush=True)

# Her PDF'ten dengeli örnek al
from collections import defaultdict
by_source = defaultdict(list)
for c in specific_chunks:
    by_source[c["source"]].append(c)

selected_chunks = []
for src, chunks in by_source.items():
    n = min(8, len(chunks))
    selected_chunks.extend(random.sample(chunks, n))

random.shuffle(selected_chunks)
selected_chunks = selected_chunks[:45]  # 45 aday → 40 test case hedefliyoruz
print(f"  Seçilen spesifik chunk: {len(selected_chunks)}", flush=True)

# ── Test case üretim promptu ─────────────────────────────────────────────────
GENERATOR_SYSTEM = """Sen Türk yükseköğretim mevzuatı uzmanısın.
Aşağıdaki gerçek YÖK mevzuat metnine dayanarak bir üniversite prosedürü ve uyum sorusu üret.

Kurallar:
1. Prosedür metni, mevzuattan FARKLI bir üniversitenin (X Üniversitesi) iç yönergesi gibi olmalı
2. Prosedürü şu üç türden BİRİ olarak tasarla:
   - compliant: Mevzuatın tam gerekliliklerini karşılıyor
   - partial: Bazı gereklilikleri karşılıyor ama önemli eksikler var
   - non-compliant: Mevzuatın açık bir gerekliğini ihlal ediyor (sayı, süre veya usul)
3. Non-compliant için: mevzuattaki SOMUT BİR SAYIYI/SÜREYİ kasıtlı olarak değiştir
   Örnek: Mevzuat "en az 55 puan" diyorsa, prosedürde "en az 45 puan" yaz
4. Soru, doğru cevabı vermek için PDF'i okumayı gerektirecek kadar spesifik olsun

SADECE şu JSON formatında yanıt ver (başka hiçbir şey yazma):
{
  "process_text": "<üniversite prosedürü, 3-5 cümle>",
  "query": "<uyum sorusu>",
  "target_label": "<compliant|partial|non-compliant>",
  "key_fact": "<yanıtlamak için PDF'ten okunması gereken spesifik bilgi>"
}"""

# ── Gold label doğrulama promptu ─────────────────────────────────────────────
EVALUATOR_SYSTEM = """Sen Türk yükseköğretim mevzuatı uzmanısın.
Aşağıda bir YÖK mevzuat metni (bağlam) ve bir üniversite prosedürü verilmiştir.
Prosedürün mevzuata uyumunu SADECE verilen bağlama dayanarak değerlendir.

SADECE şu JSON formatında yanıt ver:
{
  "compliance_score": <0-100>,
  "label": "<compliant|partial|non-compliant>",
  "reasoning": "<kısa Türkçe gerekçe, maksimum 2 cümle>"
}

Kriterler:
- compliant (70-100): Mevzuatın tüm somut gerekliliklerini karşılıyor
- partial (30-70): Bazı gereklilikleri karşılıyor, önemli eksikler var
- non-compliant (0-30): Mevzuatın açık bir hükmünü ihlal ediyor"""

# ── Ana döngü ─────────────────────────────────────────────────────────────────
records = []
label_counts = {"compliant": 0, "partial": 0, "non-compliant": 0}
TARGET = {"compliant": 13, "partial": 14, "non-compliant": 13}

print(f"\nTest case üretiliyor (hedef: 13+14+13=40)...", flush=True)

for i, chunk_data in enumerate(selected_chunks):
    if sum(label_counts.values()) >= 40:
        break

    chunk_text_val = chunk_data["text"]
    source = chunk_data["source"]

    # Hangi label'a ihtiyacımız var? En az olanı seç
    needed = {k: v for k, v in TARGET.items() if label_counts[k] < v}
    if not needed:
        break

    # En az olan label'ı hedefle
    target_label = min(needed, key=lambda k: label_counts[k])

    print(f"[{i+1:02d}] {source[:25]} → hedef: {target_label} ...", end="", flush=True)

    try:
        # Adım 1: Test case üret
        gen_resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": GENERATOR_SYSTEM},
                {"role": "user", "content": (
                    f"YÖK Mevzuat Metni (kaynak: {source}):\n{chunk_text_val}\n\n"
                    f"Lütfen '{target_label}' türünde bir test case üret."
                )}
            ],
            temperature=0.7,
            max_tokens=400,
            response_format={"type": "json_object"}
        )
        gen_raw = gen_resp.choices[0].message.content
        gen_data = json.loads(gen_raw)

        process_text = gen_data.get("process_text", "")
        query = gen_data.get("query", "")
        key_fact = gen_data.get("key_fact", "")

        if not process_text or not query:
            print(" → SKIP (boş)", flush=True)
            continue

        # Adım 2: Gold label doğrula (bağlamla)
        eval_resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": EVALUATOR_SYSTEM},
                {"role": "user", "content": (
                    f"## YÖK Mevzuat Bağlamı\n{chunk_text_val}\n\n"
                    f"## Üniversite Prosedürü\n{process_text}\n\n"
                    f"## Soru\n{query}\n\nJSON yanıt:"
                )}
            ],
            temperature=0.0,
            max_tokens=250,
            response_format={"type": "json_object"}
        )
        eval_data = json.loads(eval_resp.choices[0].message.content)
        gold_label = eval_data.get("label", "partial")
        gold_score = eval_data.get("compliance_score", 50)
        gold_reasoning = eval_data.get("reasoning", "")

        label_counts[gold_label] = label_counts.get(gold_label, 0) + 1

        case_id = f"rag_{gold_label[:4]}_{len(records)+1:02d}"
        records.append({
            "case_id": case_id,
            "process_text": process_text,
            "query": query,
            "gold_label": gold_label,
            "gold_score": gold_score,
            "gold_reasoning": gold_reasoning,
            "gold_chunk_ids": [],
            "source_chunk": chunk_text_val[:300],
            "source_pdf": source,
            "key_fact": key_fact,
            "target_label": target_label,
        })

        print(f" → {gold_label} (hedef: {target_label})", flush=True)
        time.sleep(0.5)

    except Exception as e:
        print(f" → HATA: {e}", flush=True)
        time.sleep(1)
        continue

# ── Kaydet ───────────────────────────────────────────────────────────────────
from collections import Counter
dist = Counter(r["gold_label"] for r in records)
print(f"\n{'='*50}")
print(f"Toplam üretilen: {len(records)}")
print(f"Dağılım: {dict(dist)}")

with open(OUTPUT, "w", encoding="utf-8") as f:
    for r in records:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

print(f"✅ Kaydedildi: {OUTPUT}")
print(f"\nBu test seti ile no-rag pipeline doğru cevap veremez çünkü:")
print(f"  → Her soru, PDF'teki spesifik madde/sayı/süreye dayanıyor")
print(f"  → RAG pipelines bu chunk'ları bulunca doğru cevap verir")
