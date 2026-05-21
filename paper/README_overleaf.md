# ComplianceAI — Overleaf Yükleme & Kullanım Rehberi

## Adım 1: Derleme için Gerekli Dosyalar

`paper/` dizininde şu dosyalar bulunmalıdır:

```
paper/
├── main.tex                    ← Ana dosya
├── compliance_ai.bib           ← Kaynakça
├── cas-dc.cls                  ← Elsevier CAS sınıf dosyası
├── cas-common.sty              ← Ortak stil dosyası
├── cas-model2-names.bst        ← Kaynakça stili
├── sections/
│   ├── 01_introduction.tex
│   ├── 02_related_work.tex
│   ├── 03_architecture.tex
│   ├── 04_methodology.tex
│   ├── 05_experimental_setup.tex
│   ├── 06_results.tex
│   └── 07_conclusion.tex
└── figures/
    ├── fig02_accuracy_bar.pdf
    ├── fig03_recall_mrr_heatmap.pdf
    ├── fig04_cost_performance.pdf
    ├── fig05_chunk_size_ablation.pdf
    ├── fig06_topk_ablation.pdf
    ├── fig07_score_distribution.pdf
    └── fig08_latency.pdf
```

---

## Adım 2: Figürleri Üret

Overleaf'e yüklemeden önce figürlerin hazır olması gerekir:

```bash
cd /Users/asyaberk/Desktop/SeniorDesignExperiments

# Önce ablasyon deneylerini çalıştır
python fix_experiments/ablation_chunk_size.py
python fix_experiments/ablation_topk.py

# Sonra tüm figürleri üret (paper/figures/ dizinine kaydeder)
python fix_experiments/generate_paper_figures.py
```

---

## Adım 3: Zip Arşivi Oluştur

```bash
cd /Users/asyaberk/Desktop/SeniorDesignExperiments
zip -r complianceai_paper.zip paper/
```

---

## Adım 4: Overleaf'e Yükle

1. [overleaf.com](https://www.overleaf.com) → **New Project** → **Upload Project**
2. `complianceai_paper.zip` dosyasını sürükle-bırak
3. **Compiler:** `pdflatex` seç
4. **Main document:** `main.tex` seç (genellikle otomatik algılanır)
5. **Recompile** butonuna bas

---

## Adım 5: Tuğba Hoca ile Paylaş

1. Sol üstteki **Share** butonuna bas
2. **Turn on link sharing** → **Can Edit** seç
3. Linki kopyala ve Tuğba hocaya e-posta ile gönder

---

## Lokal Derleme (Alternatif)

MacOS'ta MacTeX kuruluysa:

```bash
cd /Users/asyaberk/Desktop/SeniorDesignExperiments/paper
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
open main.pdf
```

> **Not:** Figürler olmadan derlemek de mümkün — ilgili `\includegraphics` satırlarını `%` ile yorum satırına alın.

---

## Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|---|---|
| `cas-dc.cls not found` | `cas-dc.cls` dosyasının `main.tex` ile aynı dizinde olduğunu kontrol et |
| `figures/fig02.pdf not found` | `generate_paper_figures.py`'yi önce çalıştır |
| `natbib` uyarısı | `bibtex main` komutunu çalıştırdıktan sonra 2× pdflatex dene |
| Türkçe karakter bozukluğu | `\usepackage[utf8]{inputenc}` ve `\usepackage[T1]{fontenc}` paketleri zaten main.tex'te mevcut |
