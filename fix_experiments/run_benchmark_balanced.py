#!/usr/bin/env python3
"""
Kapsamlı Benchmark — Dengeli Test Seti + 5 Pipeline
=====================================================
Pipelines:
  1. no-rag      — Saf LLM, retrieval yok
  2. bm25        — Sparse BM25 retrieval
  3. dense       — FAISS vektör retrieval (MiniLM)
  4. hybrid      — BM25 + Dense lineer füzyon (alpha=0.5)
  5. multiquery  — 3 sorgu varyasyonu → BM25 → sonuçları birleştir

Models: gpt-4o-mini, gpt-4o

Çıktı:
  experiment_outputs/benchmark_balanced_detail.csv
  experiment_outputs/benchmark_balanced_summary.csv
"""

import os, re, json, time
import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv

BASE = Path(__file__).parent.parent
load_dotenv(BASE / ".env")
import openai
client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

OUT_DIR  = BASE / "experiment_outputs"
DATA_DIR = BASE / "data"

# ── Config ─────────────────────────────────────────────────────────────────
MODELS      = ["gpt-4o-mini", "gpt-4o"]
CHUNK_SIZE  = 350
OVERLAP     = 59
TOP_K       = 5
YOK_KEYS    = ["yok", "lisansustu", "cap", "yandal", "yatay", "ek-madde", "yurt"]
PRICING     = {"gpt-4o-mini": (0.15, 0.60), "gpt-4o": (2.50, 10.00)}

# ── Text utils ──────────────────────────────────────────────────────────────
def clean(t): return re.sub(r"\s+", " ", t).strip()
def tokenize(t): return re.findall(r"\b\w+\b", t.lower())

def load_pdf(path):
    from pypdf import PdfReader
    return clean("\n".join(p.extract_text() or "" for p in PdfReader(str(path)).pages))

def chunk_text(text, size, overlap):
    words, chunks, i = text.split(), [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += max(1, size - overlap)
    return chunks

# ── Build corpus ────────────────────────────────────────────────────────────
def build_corpus():
    print("Corpus yükleniyor...", flush=True)
    all_pdfs = sorted(DATA_DIR.rglob("*.pdf"))
    yok_pdfs = [p for p in all_pdfs if any(k in p.name.lower() for k in YOK_KEYS)]
    chunks = []
    for doc in yok_pdfs:
        for c in chunk_text(load_pdf(doc), CHUNK_SIZE, OVERLAP):
            chunks.append({"id": len(chunks), "text": c, "source": doc.name})
    print(f"  {len(chunks)} chunk, {len(yok_pdfs)} PDF", flush=True)
    return chunks

# ── BM25 ────────────────────────────────────────────────────────────────────
def build_bm25(chunks):
    from rank_bm25 import BM25Okapi
    return BM25Okapi([tokenize(c["text"]) for c in chunks])

def bm25_retrieve(bm25, chunks, query, k):
    scores = bm25.get_scores(tokenize(query))
    top = np.argsort(scores)[::-1][:k]
    mx = float(scores.max()) if scores.max() > 0 else 1.0
    return [{"id": int(i), "score": float(scores[i])/mx, "text": chunks[i]["text"]} for i in top]

# ── Dense (FAISS) ───────────────────────────────────────────────────────────
def build_dense(chunks):
    cache_vec = OUT_DIR / "faiss_vectors_balanced.npy"
    cache_ids = OUT_DIR / "faiss_chunk_ids_balanced.npy"
    if cache_vec.exists():
        print("  FAISS cache yüklendi", flush=True)
        vecs = np.load(str(cache_vec))
        ids  = np.load(str(cache_ids))
    else:
        print("  FAISS vektörler encode ediliyor...", flush=True)
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        texts = [c["text"] for c in chunks]
        vecs  = model.encode(texts, batch_size=32, show_progress_bar=True).astype("float32")
        ids   = np.array([c["id"] for c in chunks])
        np.save(str(cache_vec), vecs)
        np.save(str(cache_ids), ids)
    # L2 normalize for cosine
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    vecs  = vecs / np.maximum(norms, 1e-9)
    import faiss
    index = faiss.IndexFlatIP(vecs.shape[1])
    index.add(vecs)
    return index, ids

def dense_retrieve(index, chunk_ids, chunks, query_vec, k):
    import faiss
    q = query_vec.reshape(1, -1).astype("float32")
    q = q / np.maximum(np.linalg.norm(q), 1e-9)
    D, I = index.search(q, k)
    result = []
    for score, idx in zip(D[0], I[0]):
        if idx >= 0 and idx < len(chunk_ids):
            cid = int(chunk_ids[idx])
            result.append({"id": cid, "score": float(score), "text": chunks[cid]["text"]})
    return result

# ── Multi-query RAG ─────────────────────────────────────────────────────────
MULTIQUERY_PROMPT = """Aşağıdaki YÖK uyum sorusunu 3 farklı şekilde ifade et.
Her satıra bir soru yaz, başka bir şey yazma.

Soru: {query}"""

def generate_queries(query, model):
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": MULTIQUERY_PROMPT.format(query=query)}],
        temperature=0.7, max_tokens=200
    )
    lines = [l.strip() for l in resp.choices[0].message.content.strip().split("\n") if l.strip()]
    queries = [query] + lines[:2]  # orijinal + 2 varyasyon = 3 toplam
    return queries

def multiquery_retrieve(bm25, chunks, query, k, model):
    queries = generate_queries(query, model)
    seen, results = set(), []
    for q in queries:
        for r in bm25_retrieve(bm25, chunks, q, k):
            if r["id"] not in seen:
                seen.add(r["id"])
                results.append(r)
    # Skora göre sırala, top-k döndür
    results.sort(key=lambda x: -x["score"])
    return results[:k]

# ── LLM değerlendirmesi ─────────────────────────────────────────────────────
SYS = ("Sen Türk yükseköğretim mevzuatı uyum uzmanısın. "
       "SADECE şu JSON ile yanıt ver:\n"
       '{"compliance_score":<0-100>,"label":"<compliant|partial|non-compliant>",'
       '"explanation":"<kısa Türkçe açıklama>"}')

def llm_eval(process, query, chunks_retrieved, model):
    ctx = "\n\n".join(f"[{c['id']}] {c['text']}" for c in chunks_retrieved)
    msg = (f"## Prosedür\n{process[:800]}\n\n"
           f"## Soru\n{query}\n\n"
           f"## YÖK Mevzuat Parçaları\n{ctx[:3000]}\n\nJSON yanıt:")
    pin, pout = PRICING[model]
    t0 = time.time()
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role":"system","content":SYS},{"role":"user","content":msg}],
        temperature=0.0, max_tokens=300
    )
    lat  = round(time.time()-t0, 3)
    raw  = resp.choices[0].message.content
    cost = (resp.usage.prompt_tokens*pin + resp.usage.completion_tokens*pout)/1e6
    m    = re.search(r"\{.*\}", raw, re.DOTALL)
    ans  = json.loads(m.group()) if m else {"compliance_score":50,"label":"partial","explanation":"parse error"}
    ans.update({"latency":lat,"cost_usd":cost})
    return ans

# ── Metrics ─────────────────────────────────────────────────────────────────
def recall_k(ret_ids, gold_ids, k):
    if not gold_ids: return float("nan")
    return len(set(ret_ids[:k]) & set(gold_ids)) / len(gold_ids)

def mrr(ret_ids, gold_ids):
    if not gold_ids: return float("nan")
    gs = set(gold_ids)
    for r, rid in enumerate(ret_ids, 1):
        if rid in gs: return 1.0/r
    return 0.0

# ── Load test cases ─────────────────────────────────────────────────────────
def load_cases(path):
    cases = []
    with open(path) as f:
        for line in f:
            d = json.loads(line)
            if d.get("gold_label"):
                cases.append(d)
    return cases

# ── Main ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("="*60)
    print("ComplianceAI — Kapsamlı Benchmark (Dengeli Dataset)")
    print("="*60, flush=True)

    # Test case seç: RAG-aware > dengeli > eski
    rag_aware = OUT_DIR / "test_cases_rag_aware.jsonl"
    balanced  = OUT_DIR / "test_cases_balanced.jsonl"
    original  = OUT_DIR / "test_cases.jsonl"
    if rag_aware.exists():
        case_file = rag_aware
    elif balanced.exists():
        case_file = balanced
    else:
        case_file = original
    cases = load_cases(str(case_file))
    print(f"\n{len(cases)} case yüklendi: {case_file.name}", flush=True)

    from collections import Counter
    print(f"Label dağılımı: {dict(Counter(c['gold_label'] for c in cases))}", flush=True)

    # Corpus
    chunks = build_corpus()
    bm25   = build_bm25(chunks)
    print("BM25 hazır.", flush=True)

    # Dense — sadece mevcut cache varsa kullan (ST yükleme çok yavaş)
    dense_available = False
    faiss_index = None
    faiss_ids   = None
    cache_vec   = OUT_DIR / "faiss_vectors_balanced.npy"
    if cache_vec.exists():
        try:
            faiss_ids = np.load(str(OUT_DIR / "faiss_chunk_ids_balanced.npy"))
            vecs = np.load(str(cache_vec)).astype("float32")
            norms = np.linalg.norm(vecs, axis=1, keepdims=True)
            vecs  = vecs / np.maximum(norms, 1e-9)
            import faiss
            faiss_index = faiss.IndexFlatIP(vecs.shape[1])
            faiss_index.add(vecs)
            dense_available = True
            print("FAISS cache yüklendi — dense pipeline aktif.", flush=True)
        except Exception as e:
            print(f"FAISS yüklenemedi: {e} — dense atlanacak.", flush=True)
    else:
        print("FAISS cache yok — dense ve hybrid atlanacak (BM25+multiquery çalışacak).", flush=True)

    # Pipelines — dense/hybrid için OpenAI embedding kullanıyoruz (ST yerine)
    # OpenAI text-embedding-3-small: 384 boyutlu değil, 1536 boyutlu
    # Mevcut FAISS index 384 boyutlu — dense için ST gerekiyor ama yavaş
    # Çözüm: FAISS'i REBUILD et (OpenAI embedding ile)
    PIPELINES = ["no-rag", "bm25", "multiquery"]
    if dense_available:
        # Dense için OpenAI embedding ile query encode et
        PIPELINES += ["dense", "hybrid"]
    print(f"Pipelines: {PIPELINES}", flush=True)

    # Query encoder: dense için OpenAI text-embedding-3-small
    def encode_query_openai(query_text):
        """OpenAI API ile query embedding üret."""
        resp = client.embeddings.create(
            model="text-embedding-3-small",
            input=query_text,
            dimensions=384
        )
        return np.array(resp.data[0].embedding, dtype="float32")

    st_model = None  # ST yerine encode_query_openai kullanılacak
    if dense_available:
        # FAISS vektörleri de aynı model ile encode edilmiş mi kontrol et
        # Eski vektörler MiniLM ile, yenisi OpenAI ile — rebuild gerekiyor
        oai_cache_vec = OUT_DIR / "faiss_vectors_oai.npy"
        oai_cache_ids = OUT_DIR / "faiss_chunk_ids_oai.npy"
        if not oai_cache_vec.exists():
            print("OpenAI embedding ile FAISS index oluşturuluyor...", flush=True)
            texts = [c["text"] for c in chunks]
            batch_size = 100
            all_vecs = []
            for b in range(0, len(texts), batch_size):
                batch = texts[b:b+batch_size]
                resp = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=batch,
                    dimensions=384
                )
                batch_vecs = [np.array(d.embedding, dtype="float32") for d in resp.data]
                all_vecs.extend(batch_vecs)
                print(f"  {min(b+batch_size, len(texts))}/{len(texts)} encode edildi", flush=True)
            oai_vecs = np.array(all_vecs, dtype="float32")
            oai_ids  = np.array([c["id"] for c in chunks])
            np.save(str(oai_cache_vec), oai_vecs)
            np.save(str(oai_cache_ids), oai_ids)
            print(f"  FAISS OpenAI cache kaydedildi.", flush=True)
        else:
            print("OpenAI FAISS cache yüklendi.", flush=True)
            oai_vecs = np.load(str(oai_cache_vec)).astype("float32")
            oai_ids  = np.load(str(oai_cache_ids))

        # L2 normalize
        norms = np.linalg.norm(oai_vecs, axis=1, keepdims=True)
        oai_vecs = oai_vecs / np.maximum(norms, 1e-9)
        import faiss as faiss_lib
        oai_index = faiss_lib.IndexFlatIP(oai_vecs.shape[1])
        oai_index.add(oai_vecs)
        faiss_index = oai_index
        faiss_ids   = oai_ids
        print(f"OpenAI FAISS index hazır ({len(oai_vecs)} vektör, dim=384)", flush=True)

    all_records = []

    for model in MODELS:
        for pipeline in PIPELINES:
            print(f"\n{'='*40}")
            print(f"Pipeline: {pipeline.upper()} | Model: {model}")
            print(f"{'='*40}", flush=True)

            for i, tc in enumerate(cases, 1):
                cid   = tc["case_id"]
                gold  = tc["gold_label"]
                gold_chunk_ids = [int(x) for x in (tc.get("gold_chunk_ids") or [])]
                print(f"  [{i:02d}/{len(cases)}] {cid} ...", end="", flush=True)

                # Retrieve
                retrieved = []
                if pipeline == "no-rag":
                    retrieved = []
                elif pipeline == "bm25":
                    retrieved = bm25_retrieve(bm25, chunks, tc["query"], TOP_K)
                elif pipeline == "multiquery":
                    retrieved = multiquery_retrieve(bm25, chunks, tc["query"], TOP_K, model)
                elif pipeline == "dense" and dense_available:
                    qv = encode_query_openai(tc["query"])
                    retrieved = dense_retrieve(faiss_index, faiss_ids, chunks, qv, TOP_K)
                elif pipeline == "hybrid" and dense_available:
                    bm_res = bm25_retrieve(bm25, chunks, tc["query"], TOP_K*2)
                    qv     = encode_query_openai(tc["query"])
                    dn_res = dense_retrieve(faiss_index, faiss_ids, chunks, qv, TOP_K*2)
                    bm_map = {r["id"]: r["score"] for r in bm_res}
                    dn_map = {r["id"]: r["score"] for r in dn_res}
                    all_ids = set(bm_map) | set(dn_map)
                    scored  = sorted(all_ids,
                                     key=lambda x: 0.5*bm_map.get(x,0)+0.5*dn_map.get(x,0),
                                     reverse=True)
                    retrieved = [{"id":x,"score":0.5*bm_map.get(x,0)+0.5*dn_map.get(x,0),
                                  "text":chunks[x]["text"]} for x in scored[:TOP_K]]

                # Evaluate
                ans = llm_eval(tc["process_text"], tc["query"], retrieved, model)
                ret_ids = [r["id"] for r in retrieved]
                correct = (ans.get("label") == gold)
                ok = "✓" if correct else "✗"
                print(f" {ans.get('label')} (gold:{gold}) {ok}", flush=True)

                all_records.append({
                    "pipeline":    pipeline,
                    "model":       model,
                    "case_id":     cid,
                    "gold_label":  gold,
                    "pred_label":  ans.get("label",""),
                    "pred_score":  ans.get("compliance_score"),
                    "correct":     correct,
                    "recall_at_k": recall_k(ret_ids, gold_chunk_ids, TOP_K),
                    "mrr":         mrr(ret_ids, gold_chunk_ids),
                    "latency":     ans.get("latency",0),
                    "cost_usd":    ans.get("cost_usd",0),
                    "n_retrieved": len(retrieved),
                })

    # Kaydet
    df = pd.DataFrame(all_records)
    detail_path = OUT_DIR / "benchmark_balanced_detail.csv"
    df.to_csv(detail_path, index=False)
    print(f"\nDetay: {detail_path}", flush=True)

    summary_rows = []
    for (pip, mod), grp in df.groupby(["pipeline","model"]):
        summary_rows.append({
            "pipeline":       pip,
            "model":          mod,
            "n":              len(grp),
            "accuracy":       round(grp["correct"].mean(), 3),
            "mean_pred_score":round(grp["pred_score"].mean(), 1),
            "recall_at_k":    round(grp["recall_at_k"].mean(), 3),
            "mrr":            round(grp["mrr"].mean(), 3),
            "mean_latency":   round(grp["latency"].mean(), 3),
            "total_cost_usd": round(grp["cost_usd"].sum(), 4),
        })
    summary = pd.DataFrame(summary_rows).sort_values(["pipeline","model"])
    summary_path = OUT_DIR / "benchmark_balanced_summary.csv"
    summary.to_csv(summary_path, index=False)

    print("\n" + "="*60)
    print("ÖZET SONUÇLAR")
    print("="*60)
    print(summary.to_string(index=False), flush=True)
    print(f"\n✅ Tamamlandı! {summary_path}")
