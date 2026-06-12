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


# ── Article Splitter ──────────────────────────────────────────────────────────

def _split_articles(text: str) -> List[Dict]:
    """
    Splits document text into individual articles.

    pypdf extracts PDFs as a continuous text stream — 'Madde X' headings are NOT
    at the start of lines. Pattern examples from real PDFs:
      "Amaç ve kapsam Madde 1 – (1) Bu Yönetmeliğin amacı..."
      "Dayanak Madde 2 - (1) Bu Yönetmelik..."
      "Tanımlar Madde 3 - (1) Bu Yönetmelikte geçen;"

    Strategy: find every "Madde N –" or "Madde N -" occurrence (anywhere in text),
    then slice the text between consecutive occurrences.
    """
    import re as _re

    # Primary: "Madde N –" or "Madde N -" (number THEN dash) — most common
    # Negative lookbehind: must not be preceded by a Turkish letter (avoid mid-word)
    primary = _re.compile(
        r'(?<![a-zA-ZğüşıöçĞÜŞİÖÇ])'   # not part of a word
        r'(Madde|MADDE)\s+'              # keyword
        r'(\d+(?:[./]\d+)?)'             # article number
        r'\s*[-\u2013\u2014]',           # dash after number (identifies a heading)
    )

    # Fallback 1: "MADDE - N" (dash BEFORE number) — some PDF formats
    fallback = _re.compile(
        r'(?<![a-zA-ZğüşıöçĞÜŞİÖÇ])'
        r'(MADDE|Madde)\s*[-\u2013\u2014]\s*'
        r'(\d+(?:[./]\d+)?)',
    )

    # Fallback 2: "Madde N (title)" — parenthesis after number
    paren = _re.compile(
        r'(?<![a-zA-ZğüşıöçĞÜŞİÖÇ])'
        r'(Madde|MADDE)\s+'
        r'(\d+(?:[./]\d+)?)'
        r'\s*\(',
    )

    matches = list(primary.finditer(text))
    use_paren = False

    # Try fallback 1 if primary found fewer than 2
    if len(matches) < 2:
        fb = list(fallback.finditer(text))
        if len(fb) > len(matches):
            matches = fb

    # Try fallback 2 (paren format) if still fewer than 2
    if len(matches) < 2:
        fb2 = list(paren.finditer(text))
        if len(fb2) > len(matches):
            matches = fb2
            use_paren = True

    if len(matches) < 2:
        # No Madde structure — split into ~500-word sections
        words = text.split()
        size = 500
        sections = []
        for i in range(0, len(words), size):
            chunk = " ".join(words[i:i + size])
            sections.append({
                "number": f"Bölüm {i // size + 1}",
                "title":  f"Bölüm {i // size + 1}",
                "text":   chunk,
            })
        print(f"[RagService] No Madde structure found, using {len(sections)} word-sections")
        return sections

    articles = []
    for idx, m in enumerate(matches):
        num_str  = m.group(2)
        number   = f"Madde {num_str}"

        # ── Title extraction ──────────────────────────────────────────────────
        if use_paren:
            # Extract title from parentheses content: "Madde N (title)"
            paren_start = m.end()  # right after "Madde N ("
            paren_end   = text.find(')', paren_start)
            if 0 < paren_end - paren_start < 120:
                title = text[paren_start:paren_end].strip()[:80]
            else:
                title = number
        else:
            # ── Title: look BACK in text for the section heading before this Madde ──
            look_back_start = matches[idx - 1].end() if idx > 0 else 0
            before_text = text[look_back_start:m.start()].strip()
            before_clean = _re.sub(r'[\d\s.;,]+$', '', before_text).strip()
            words_before = before_clean.split()
            if 1 <= len(words_before) <= 6:
                title = " ".join(words_before)
            else:
                last_sentence = _re.split(r'[.;!?]\s+', before_clean)
                candidate = last_sentence[-1].strip() if last_sentence else ""
                title = candidate[:80] if 3 <= len(candidate) <= 80 else number

        # ── Article text: from this Madde to the next ──
        art_start = m.start()
        art_end   = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        full_text = text[art_start:art_end].strip()

        # ── Clean: strip trailing page number ──
        full_text = _re.sub(r'\s+\d{1,3}\s*$', '', full_text).rstrip()

        # ── Clean: strip trailing orphan section heading ──
        last_period = max(full_text.rfind('. '), full_text.rfind('.\n'), full_text.rfind('. '))
        if last_period > 0:
            trailing = full_text[last_period + 1:].strip()
            if trailing and '.' not in trailing and len(trailing) < 100:
                full_text = full_text[:last_period + 1].strip()

        if full_text:
            articles.append({
                "number": number,
                "title":  title[:80] if title else number,
                "text":   full_text,
            })

    print(f"[RagService] Madde split: {len(articles)} articles detected")
    return articles





# ── Per-article LLM prompt ────────────────────────────────────────────────────


ARTICLE_SYSTEM = """Sen Türk yükseköğretim hukuku uzmanı bir denetçisin.
Sana incelenen bir üniversite yönetmeliğinin TEK BİR MADDESİ ve referans YÖK mevzuat parçaları verilecek.

TEMEL İLKE: Uyumluluk = kelime kelime aynı olmak DEĞİL, YÖK'ün düzenlediği amacı/hükmü karşılamak demektir.
Üniversiteler YÖK mevzuatını kendi kurumsal dillerine uyarlayabilir. Bu normaldir ve Uyumlu sayılır.

UYUMLULUK TANIMLARI (4 seçenek):
- Uyumlu: Madde, YÖK'ün düzenlediği konuyu karşılıyor. İfade farklı olsa da aynı amacı güdüyor,
  YÖK'ün zorunlu kıldıklarını kapsıyor ve hiçbir YÖK hükmüyle çelişmiyor.
- Kısmen Uyumlu: Madde genel olarak doğru yönde ama: (a) YÖK'ün zorunlu kıldığı spesifik bir unsur
  eksik, veya (b) belirsiz/muğlak ifadeler YÖK'ün net hükmünü tam karşılamıyor.
  Sağlanan YÖK parçaları bu maddeyle yalnızca dolaylı ilgiliyse de Kısmen Uyumlu ver.
- Uyumsuz: Aşağıdaki somut durumlardan biri varsa Uyumsuz ver:
  (a) YÖK'ün belirlediği sayısal eşik/süre/oran belge maddesinde farklıysa (örn: YÖK 8 hafta der, belgede 6 hafta);
  (b) YÖK'ün zorunlu kıldığı bir onay makamı/prosedür belgede hiç yoksa (örn: YÖK Senatoyu zorunlu kılar, belgede belirtilmemiş);
  (c) YÖK'ün yasakladığı bir uygulama belgede yapılıyorsa;
  (d) YÖK'ün tanımladığı hak/koruma belgede kısıtlanmış veya tamamen eksikse.
  NOT: Farklı ifade veya eksik detay tek başına Uyumsuz DEĞİLDİR — o durumda Kısmen Uyumlu.
- Kapsam Dışı: YALNIZCA şu iki durumda kullan:
  (1) Bu konu YÖK mevzuatının hiçbir bölümünde düzenlenmemiş; üniversitenin tamamen serbest bırakıldığı
      idari/organizasyonel bir konudur (örn: kampüs güvenlik prosedürleri, yemekhane yönetimi,
      ders gruplarının fiziksel bölünmesi, dahili idari toplantı takvimi).
  (2) Madde yalnızca geçici/geçiş hükmü içeriyor ve kalıcı bir YÖK standardıyla çelişmiyorsa.
  ÖNEMLI: Sağlanan YÖK parçaları alakasız görünse bile, konu aşağıdaki başlıklardan biriyse
  Kapsam Dışı VERMEK YASAKTIR — Kısmen Uyumlu ver:
  Sınav, not sistemi, GANO/YANO/AGNO, ders kaydı, kayıt dondurma, mezuniyet, burs, disiplin,
  akademik takvim, ders programı, kredi sistemi, öğrenci kabulü, muafiyet, intibak, çift anadal/yandal.

ÇIKTI: Yalnızca şu JSON formatında cevap ver (başka metin ekleme):
{
  "status": "<Uyumlu|Kısmen Uyumlu|Uyumsuz|Kapsam Dışı>",
  "similarity": <0.0 ile 1.0 arası float — anlam örtüşmesi, ifade benzerliği değil>,
  "yok_reference": "<ilgili YÖK mevzuat adı ve maddesi; hiç bulamazsan boş string>",
  "yok_text": "<SAĞLANAN YÖK PARÇALARINDAN doğrudan alıntı: en alakalı tek cümleyi kelimesi kelimesine kopyala>",
  "reasoning": [
    "<neden bu status: belgede ne diyor, YÖK ne diyor, ikisi aynı amacı karşılıyor mu?>",
    "<varsa eksiklik veya çelişki; yoksa neden uyumlu sayıldı>"
  ],
  "suggestion": "<YALNIZCA Kısmen Uyumlu/Uyumsuz ise: üniversite yönetmeliğinin bu maddesinde ne değiştirilmeli/eklenmeli? 'Bu maddede X ifadesi Y olarak değiştirilmeli' formatında. Uyumlu ise boş string>"
}

KRİTİK KURALLAR:
- Farklı ifade = UYUMSUZ demek DEĞİLDİR. Anlam aynıysa Uyumlu ver.
- yok_reference alanına bir YÖK mevzuatı adı yazabiliyorsan, "Kapsam Dışı" veremezsin.
- Sağlanan YÖK parçaları bu maddeyle dolaylı ilgiliyse: similarity 0.2-0.4 ile Kısmen Uyumlu ver.
- yok_text: Mutlaka SAĞLANAN YÖK PARÇALARINDAN al. Kendi yorumunu yazma.
- suggestion: Üniversite belgesinde yapılacak değişikliği yaz, YÖK'teki değişikliği değil.
"""

# ── English variant (status labels remain canonical Turkish) ─────────────────
ARTICLE_SYSTEM_EN = """You are an expert auditor in Turkish higher education law.
You will be given ONE ARTICLE from a university policy document and reference YÖK regulation excerpts.

CORE PRINCIPLE: Compliance means satisfying the intent and provisions set by YÖK — not word-for-word identity.
Universities may adapt YÖK regulations to their own institutional language; this is normal and counts as Compliant.

COMPLIANCE DEFINITIONS (4 options — use EXACTLY these Turkish status values):
- Uyumlu: The article satisfies the topic regulated by YÖK. Even if phrased differently, it pursues the same
  objective, covers what YÖK mandates, and does not conflict with any YÖK provision.
- Kısmen Uyumlu: The article is generally in the right direction but: (a) a specific element required by YÖK
  is missing, or (b) vague/ambiguous wording does not fully satisfy YÖK's clear provision.
  Also use Kısmen Uyumlu if the provided YÖK excerpts are only indirectly related to this article.
- Uyumsuz: Use Uyumsuz if any of these concrete conditions apply:
  (a) A numeric threshold/duration/ratio set by YÖK differs in the document;
  (b) A mandatory approval body/procedure required by YÖK is entirely absent;
  (c) A practice prohibited by YÖK is present in the document;
  (d) A right or protection defined by YÖK is restricted or completely absent.
  NOTE: Different wording or missing detail alone is NOT Uyumsuz — use Kısmen Uyumlu in that case.
- Kapsam Dışı: Use ONLY in these two cases:
  (1) This topic is not regulated anywhere in YÖK legislation; it is a purely administrative/organisational
      matter left entirely to the university (e.g. campus security, cafeteria management, internal meeting schedules).
  (2) The article contains only a transitional/temporary provision not conflicting with any permanent YÖK standard.
  IMPORTANT: If the topic is any of the following, Kapsam Dışı is FORBIDDEN — use Kısmen Uyumlu instead:
  Exams, grading systems, GPA/CGPA, course registration, leave of absence, graduation, scholarships,
  disciplinary matters, academic calendar, curriculum, credit system, student admission, exemptions,
  credit transfer, double major/minor programmes.

OUTPUT: Respond ONLY with the following JSON (no other text). Write reasoning and suggestion in English.
The status field MUST use one of these exact Turkish strings: Uyumlu | Kısmen Uyumlu | Uyumsuz | Kapsam Dışı
{
  "status": "<Uyumlu|Kısmen Uyumlu|Uyumsuz|Kapsam Dışı>",
  "similarity": <float 0.0–1.0 — semantic overlap, not surface similarity>,
  "yok_reference": "<relevant YÖK regulation name and article; empty string if none found>",
  "yok_text": "<verbatim quote from the PROVIDED YÖK excerpts: copy the single most relevant sentence word-for-word>",
  "reasoning": [
    "<why this status: what does the document say, what does YÖK say, do they satisfy the same purpose?>",
    "<any gap or conflict; or why the article was deemed compliant>"
  ],
  "suggestion": "<ONLY for Kısmen Uyumlu/Uyumsuz: what should be changed/added in the university policy? Format: 'The wording X should be changed to Y'. Empty string if Uyumlu.>"
}

CRITICAL RULES:
- Different wording ≠ Uyumsuz. If the meaning is equivalent, use Uyumlu.
- If you can name a YÖK regulation in yok_reference, you cannot use Kapsam Dışı.
- If the provided YÖK excerpts are only indirectly related: use Kısmen Uyumlu with similarity 0.2–0.4.
- yok_text: MUST be taken verbatim from the PROVIDED excerpts. Do not paraphrase.
- suggestion: Describe changes to the university document, not to YÖK.
"""

ARTICLE_USER = """## University Policy Article Under Review
{article_text}

## Reference YÖK Regulation Excerpts (Sole Authoritative Source)
{chunks}

Provide JSON analysis."""

ARTICLE_USER_TR = """## İncelenen Üniversite Yönetmeliği Maddesi
{article_text}

## Referans YÖK Mevzuat Parçaları (Tek Doğru Kaynak)
{chunks}

JSON analiz yap."""


DOCUMENT_SYSTEM = """Sen Türk yükseköğretim hukuku uzmanı bir denetçisin.
Sana bir üniversite belgesi verilecek. Belge bir üniversite yönetmeliği DEĞİLSE (örneğin ödev, araştırma makalesi, kod dosyası),
compliance_score'u 5-25 arasında ver ve bunu açıkla.

ÇIKTI — Yalnızca JSON:
{
  "compliance_score": <0-100 tam sayı>,
  "label": "<compliant|partial|non-compliant>",
  "explanation": "<Türkçe 2-3 cümle genel değerlendirme>",
  "articles": [
    {
      "number": "<Madde numarası>",
      "title": "<Türkçe başlık>",
      "status": "<Uyumlu|Kısmen Uyumlu|Uyumsuz>",
      "similarity": <float 0.0-1.0>,
      "text": "<belgeden alıntı, max 300 karakter>",
      "yok_reference": "<YÖK mevzuat adı>",
      "yok_text": "<YÖK alıntısı, max 300 karakter>",
      "reasoning": ["<gerekçe>"],
      "suggestion": "<önerim veya boş string>"
    }
  ]
}
Eşik: compliant>=80, partial 40-79, non-compliant<40."""

DOCUMENT_USER = """## Belge
{process_text}

## YÖK Mevzuat Parçaları
{chunks}

JSON compliance analizi yap."""


# ── Helpers ────────────────────────────────────────────────────────────────────

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


def _score_from_articles(articles: List[Dict]) -> int:
    """
    Compute compliance score from real article results.
    'Kapsam Dışı' articles are EXCLUDED from calculation — they don't
    reflect non-compliance, just topics YÖK doesn't regulate.
    Only Uyumlu / Kısmen Uyumlu / Uyumsuz count toward the score.
    """
    scorable = [a for a in articles if a.get("status") != "Kapsam Dışı"]
    if not scorable:
        return 100  # all articles are out-of-scope → no violations
    weights = {"Uyumlu": 100, "Kısmen Uyumlu": 60, "Uyumsuz": 0}
    total = sum(weights.get(a.get("status", "Kısmen Uyumlu"), 60) for a in scorable)
    return round(total / len(scorable))


def _label_from_score(score: int) -> str:
    if score >= 80:
        return "compliant"
    if score >= 40:
        return "partial"
    return "non-compliant"


# ── Public API ─────────────────────────────────────────────────────────────────

class RagService:
    """
    Real RAG-based compliance analysis service.
    Uses hybrid retrieval (BM25 + FAISS dense) + GPT for generation.
    Supports per-article analysis to handle large documents fully.
    """

    def __init__(self, pipeline: str = "hybrid", model: str = "gpt-4o-mini", language: str = "tr"):
        self.pipeline = pipeline
        self.model    = model
        self.language = language

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

    def _analyze_article(self, article: Dict) -> Dict:
        """Analyze a single article with its own RAG retrieval."""
        query = article["text"][:500]
        try:
            retrieved = self._retrieve(query, k=8)
        except Exception:
            retrieved = []

        chunks_str = _format_chunks(retrieved) if retrieved else "İlgili mevzuat parçası bulunamadı."

        sys_prompt = ARTICLE_SYSTEM_EN if self.language == "en" else ARTICLE_SYSTEM
        usr_template = ARTICLE_USER if self.language == "en" else ARTICLE_USER_TR

        try:
            resp = _oa_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": usr_template.format(
                        article_text=article["text"][:4000],  # full article, no artificial cut
                        chunks=chunks_str[:4000],
                    )},
                ],
                temperature=0.0,
                max_tokens=1000,
                response_format={"type": "json_object"},
            )
            result = _parse_json(resp.choices[0].message.content)
        except Exception as e:
            print(f"[RagService] article LLM error: {e}")
            result = None

        if not result:
            fallback_msg = "Analysis could not be completed." if self.language == "en" else "Analiz tamamlanamadı."
            result = {
                "status": "Kısmen Uyumlu",
                "similarity": 0.5,
                "yok_reference": "",
                "yok_text": "",
                "reasoning": [fallback_msg],
                "suggestion": "",
            }

        # Merge article metadata with LLM result
        return {
            "number":        article["number"],
            "title":         article["title"],
            "status":        result.get("status", "Kısmen Uyumlu"),
            "similarity":    float(result.get("similarity", 0.5)),
            "text":          article["text"],         # full article text, no cut
            "yok_reference": result.get("yok_reference", ""),
            "yok_text":      result.get("yok_text", ""),  # full YÖK text from LLM
            "reasoning":     result.get("reasoning", []),
            "suggestion":    result.get("suggestion", ""),
        }

    def analyze_document(self, process_text: str, filename: str) -> dict:
        """
        Full RAG compliance analysis.
        Splits document into real articles and analyzes each one independently.
        Score is computed from actual article results, not LLM guess.
        """
        # 1. Split document into articles
        split_articles = _split_articles(process_text)
        print(f"[RagService] Found {len(split_articles)} articles/sections in document")

        all_retrieved: List[Dict] = []

        # 2. If document has clear article structure → per-article RAG
        if split_articles:
            analyzed_articles = []
            for art in split_articles:
                result = self._analyze_article(art)
                analyzed_articles.append(result)
                # Collect retrieved chunks for logging
                try:
                    chunks = self._retrieve(art["text"][:300], k=3)
                    all_retrieved.extend(chunks)
                except Exception:
                    pass

            # 3. Compute score from real article results
            score = _score_from_articles(analyzed_articles)
            label = _label_from_score(score)
            label_map = {"compliant": "Uyumlu", "partial": "Kısmen Uyumlu", "non-compliant": "Uyumsuz"}
            turkish_status = label_map[label]

        else:
            # Fallback: whole-document analysis (no Madde structure)
            try:
                retrieved = self._retrieve(process_text[:500], TOP_K)
                all_retrieved = retrieved
            except Exception:
                retrieved = []

            chunks_str = _format_chunks(retrieved) if retrieved else "İlgili mevzuat parçası bulunamadı."
            try:
                resp = _oa_client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": DOCUMENT_SYSTEM},
                        {"role": "user", "content": DOCUMENT_USER.format(
                            process_text=process_text[:6000],
                            chunks=chunks_str[:6000],
                        )},
                    ],
                    temperature=0.0,
                    max_tokens=4000,
                    response_format={"type": "json_object"},
                )
                fallback_result = _parse_json(resp.choices[0].message.content)
            except Exception as e:
                print(f"[RagService] fallback LLM error: {e}")
                fallback_result = None

            if fallback_result:
                analyzed_articles = fallback_result.get("articles", [])
                score = _score_from_articles(analyzed_articles) if analyzed_articles else fallback_result.get("compliance_score", 50)
                label = fallback_result.get("label", "partial")
                label_map = {"compliant": "Uyumlu", "partial": "Kısmen Uyumlu", "non-compliant": "Uyumsuz"}
                turkish_status = label_map.get(label, "Kısmen Uyumlu")
            else:
                analyzed_articles = []
                score = 50
                turkish_status = "Kısmen Uyumlu"

        # Deduplicate retrieved chunks
        seen = set()
        unique_retrieved = []
        for c in all_retrieved:
            if c["chunk_id"] not in seen:
                seen.add(c["chunk_id"])
                unique_retrieved.append(c)

        return {
            "status":           turkish_status,
            "compliance_score": score,
            "articles":         analyzed_articles,
            "retrieved_chunks": [
                {
                    "chunk_id": c["chunk_id"],
                    "score":    round(c["score"], 4),
                    "source":   c.get("source", ""),
                    "text":     c.get("text", "")[:400],
                }
                for c in unique_retrieved[:20]
            ],
            "pipeline": self.pipeline,
            "model":    self.model,
        }


# Module-level singleton
rag_service = RagService(pipeline="hybrid", model="gpt-4o-mini")

