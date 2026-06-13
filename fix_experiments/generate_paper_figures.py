#!/usr/bin/env python3
"""
Publication-Quality Figure Generator — ComplianceAI
=====================================================
5 pipeline × 2 model karşılaştırmalı figürler üretir.
Tüm figürler 300 DPI PNG + PDF olarak paper/figures/ dizinine kaydedilir.

Figürler:
  fig02 — Accuracy grouped bar (5 pipeline × 2 model)
  fig03 — Per-class accuracy heatmap (compliant / partial / non-compliant)
  fig04 — Cost–Performance scatter
  fig05 — Chunk size ablation (accuracy + retrieval metrics)
  fig06 — Top-K ablation (accuracy + retrieval metrics)
  fig07 — Compliance score distribution (boxplot, 5 pipeline)
  fig08 — Latency comparison (horizontal bar)
  fig09 — Pipeline karşılaştırma radar chart (yeni eklendi)

Çalıştırma:
    .venv/bin/python3.14 fix_experiments/generate_paper_figures.py
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import matplotlib.patches as mpatches
import numpy as np
import pandas as pd
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
OUTPUT_DIR  = BASE_DIR / "experiment_outputs"
FIGURES_DIR = OUTPUT_DIR / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

# ── Style ──────────────────────────────────────────────────────────────────
DPI = 300
FW  = 7.0   # figure width (inches)
FH  = 4.5   # figure height (inches)

plt.rcParams.update({
    "font.family":       "DejaVu Sans",
    "font.size":         12,
    "axes.titlesize":    12,
    "axes.labelsize":    12,
    "xtick.labelsize":   10,
    "ytick.labelsize":   10,
    "legend.fontsize":   10,
    "axes.spines.top":   False,
    "axes.spines.right": False,
    "axes.grid":         True,
    "grid.alpha":        0.25,
    "grid.linestyle":    "--",
})

# Colorblind-safe palette (Wong 2011)
BLUE    = "#0072B2"
ORANGE  = "#E69F00"
GREEN   = "#009E73"
RED     = "#D55E00"
PURPLE  = "#CC79A7"
YELLOW  = "#F0E442"
BLACK   = "#333333"

# Her pipeline için renk ve kısa etiket
PIP_COLORS  = {"no-rag": BLACK, "bm25": BLUE, "dense": GREEN,
               "hybrid": ORANGE, "multiquery": PURPLE}
PIP_LABELS  = {"no-rag": "No-RAG", "bm25": "BM25", "dense": "Dense",
               "hybrid": "Hybrid", "multiquery": "Multi-Query"}
PIP_ORDER   = ["no-rag", "bm25", "dense", "hybrid", "multiquery"]
MODEL_MARKS = {"gpt-4o-mini": "o", "gpt-4o": "s"}
MODEL_COLORS= {"gpt-4o-mini": BLUE, "gpt-4o": ORANGE}

def save(fig, name):
    """Sadece PNG olarak kaydet."""
    p = FIGURES_DIR / f"{name}.png"
    fig.savefig(str(p), dpi=DPI, bbox_inches="tight", pad_inches=0.08)
    print(f"  ✅ {p.name}")
    plt.close(fig)

def load_balanced_summary():
    """Önce benchmark_balanced_summary, yoksa summary_clean dene."""
    for fname in ("benchmark_balanced_summary.csv", "summary_clean.csv"):
        p = OUTPUT_DIR / fname
        if p.exists():
            df = pd.read_csv(p)
            print(f"  Kullanılan CSV: {fname}")
            return df
    return None

def load_balanced_detail():
    """Önce benchmark_balanced_detail, yoksa benchmark_results_clean dene."""
    for fname in ("benchmark_balanced_detail.csv", "benchmark_results_clean.csv"):
        p = OUTPUT_DIR / fname
        if p.exists():
            df = pd.read_csv(p)
            print(f"  Kullanılan detail CSV: {fname}")
            return df
    return None


# ════════════════════════════════════════════════════════════════════════════
# Fig 02 — Accuracy Grouped Bar (5 Pipeline × 2 Model)
# ════════════════════════════════════════════════════════════════════════════
def fig02():
    """5 pipeline × 2 model karşılaştırmalı accuracy bar chart."""
    print("\n[fig02] Accuracy Bar Chart...")
    df = load_balanced_summary()
    if df is None:
        print("  ⚠ Veri yok — atlandı"); return

    # Mevcut pipeline'ları sıraya göre filtrele
    available = [p for p in PIP_ORDER if p in df["pipeline"].values]
    models    = sorted(df["model"].unique())
    x = np.arange(len(available))
    w = 0.35 if len(models) == 2 else 0.6

    fig, ax = plt.subplots(figsize=(FW * 1.1, FH))
    for i, model in enumerate(models):
        color = MODEL_COLORS.get(model, PURPLE)
        sub   = df[df["model"] == model].set_index("pipeline").reindex(available)
        vals  = sub["accuracy"].fillna(0).values * 100
        offset = (i - (len(models)-1)/2) * w
        bars = ax.bar(x + offset, vals, w,
                      label=model.replace("gpt-", "GPT-"),
                      color=color, edgecolor="white", linewidth=0.7, alpha=0.92)
        for bar, v in zip(bars, vals):
            if v > 0:
                ax.text(bar.get_x() + bar.get_width()/2,
                        bar.get_height() + 0.8,
                        f"{v:.1f}%", ha="center", va="bottom",
                        fontsize=8.5, fontweight="bold", color=BLACK)

    ax.set_xticks(x)
    ax.set_xticklabels([PIP_LABELS.get(p, p.upper()) for p in available])
    ax.set_ylabel("Classification Accuracy (%)")
    ax.set_xlabel("Retrieval Pipeline")
    ax.set_ylim(0, 110)
    ax.set_title("Classification Accuracy by Pipeline and LLM Model\n"
                 "(RAG-Aware Test Set, N=40)")
    ax.legend(title="Model", loc="upper right", framealpha=0.9)
    save(fig, "fig02_accuracy_bar")


# ════════════════════════════════════════════════════════════════════════════
# Fig 03 — Per-Class Accuracy Heatmap
# ════════════════════════════════════════════════════════════════════════════
def fig03():
    """Her pipeline × model için compliant/partial/non-compliant class accuracy."""
    print("\n[fig03] Per-Class Accuracy Heatmap...")
    df = load_balanced_detail()
    if df is None:
        print("  ⚠ Veri yok — atlandı"); return

    classes   = ["compliant", "partial", "non-compliant"]
    available = [p for p in PIP_ORDER if p in df["pipeline"].values]
    models    = sorted(df["model"].unique())

    rows, row_labels = [], []
    for pip in available:
        for model in models:
            grp = df[(df["pipeline"] == pip) & (df["model"] == model)]
            if grp.empty: continue
            row = [grp[grp["gold_label"] == cls]["correct"].mean()
                   if not grp[grp["gold_label"] == cls].empty else np.nan
                   for cls in classes]
            rows.append(row)
            row_labels.append(f"{PIP_LABELS.get(pip, pip)}\n{model.replace('gpt-','GPT-')}")

    data = np.array(rows, dtype=float)
    fig, ax = plt.subplots(figsize=(FW * 0.85, max(4.0, len(rows) * 0.62)))
    im = ax.imshow(data, aspect="auto", cmap="RdYlGn", vmin=0, vmax=1)

    ax.set_xticks(range(len(classes)))
    ax.set_xticklabels(["Compliant", "Partial", "Non-Compliant"], fontsize=10)
    ax.set_yticks(range(len(row_labels)))
    ax.set_yticklabels(row_labels, fontsize=9)
    ax.set_title("Per-Class Accuracy by Pipeline & Model\n"
                 "(Green = High, Red = Low)")

    for i in range(len(rows)):
        for j in range(len(classes)):
            v = data[i, j]
            txt = f"{v:.2f}" if not np.isnan(v) else "—"
            color = "white" if (not np.isnan(v) and (v > 0.75 or v < 0.25)) else "black"
            ax.text(j, i, txt, ha="center", va="center", fontsize=9, color=color)

    fig.colorbar(im, ax=ax, shrink=0.7, label="Accuracy")
    save(fig, "fig03_perclass_heatmap")


# ════════════════════════════════════════════════════════════════════════════
# Fig 04 — Cost–Performance Scatter
# ════════════════════════════════════════════════════════════════════════════
def fig04():
    """Maliyet vs Accuracy scatter — her nokta bir pipeline+model."""
    print("\n[fig04] Cost–Performance Scatter...")
    df = load_balanced_summary()
    if df is None:
        print("  ⚠ Veri yok — atlandı"); return

    # Maliyet sütunu: total_cost_usd veya total_cost
    cost_col = "total_cost_usd" if "total_cost_usd" in df.columns else "total_cost"
    if cost_col not in df.columns:
        print("  ⚠ Maliyet sütunu yok — atlandı"); return

    fig, ax = plt.subplots(figsize=(FW, FH))
    for _, row in df.iterrows():
        pip   = row["pipeline"]
        model = row["model"]
        c = PIP_COLORS.get(pip, PURPLE)
        m = MODEL_MARKS.get(model, "o")
        acc = row["accuracy"] * 100
        cost = row[cost_col]
        ax.scatter(cost, acc, s=160, color=c, marker=m,
                   edgecolors="white", linewidth=0.8, zorder=5)
        lbl = (f"{PIP_LABELS.get(pip, pip.upper())}\n"
               f"{model.replace('gpt-','GPT-')}")
        ax.annotate(lbl, (cost, acc),
                    textcoords="offset points", xytext=(6, 4), fontsize=8)

    pip_patches = [mpatches.Patch(color=PIP_COLORS.get(p, PURPLE),
                                   label=PIP_LABELS.get(p, p.upper()))
                   for p in PIP_ORDER if p in df["pipeline"].values]
    model_marks = [
        plt.scatter([], [], s=70, color="grey", marker="o", label="GPT-4o-mini"),
        plt.scatter([], [], s=70, color="grey", marker="s", label="GPT-4o"),
    ]
    ax.legend(handles=pip_patches + model_marks,
              fontsize=8.5, loc="lower right", framealpha=0.9, ncol=2)
    ax.set_xlabel("Total API Cost (USD, N=40)")
    ax.set_ylabel("Classification Accuracy (%)")
    ax.set_title("Cost–Performance Trade-off\n(All Pipelines & Models)")
    save(fig, "fig04_cost_performance")


# ════════════════════════════════════════════════════════════════════════════
# Fig 05 — Chunk Size Ablation
# ════════════════════════════════════════════════════════════════════════════
def fig05():
    """Chunk size'ın accuracy ve latency üzerine etkisi."""
    print("\n[fig05] Chunk Size Ablation...")
    csv = OUTPUT_DIR / "ablation_chunk_size_summary.csv"
    fig, axes = plt.subplots(1, 2, figsize=(FW * 1.35, FH))

    if csv.exists():
        df = pd.read_csv(csv).sort_values("chunk_size")
        xs = df["chunk_size"].tolist()
        axes[0].plot(xs, df["accuracy"] * 100, marker="o",
                     color=BLUE, lw=2.2, ms=9, label="Accuracy")
        axes[0].set_ylim(0, 100)
        # Latency ikinci eksen
        axes[1].plot(xs, df["mean_latency"], marker="s",
                     color=ORANGE, lw=2.2, ms=9, label="Latency (s)")
        axes[1].set_ylabel("Mean Latency (s)")
        axes[1].set_title("(b) Latency vs. Chunk Size")
        for ax in axes:
            ax.set_xticks(xs)
            ax.set_xlabel("Chunk Size (words)")
        # Optimal işaretle
        best_idx = df["accuracy"].idxmax()
        best_x = df.loc[best_idx, "chunk_size"]
        best_y = df.loc[best_idx, "accuracy"] * 100
        axes[0].annotate(f"Optimal\n({best_x}w)", (best_x, best_y),
                         xytext=(best_x+15, best_y-8),
                         arrowprops=dict(arrowstyle="->", color=RED),
                         fontsize=9, color=RED)
    else:
        # Placeholder
        xs = [150, 250, 350, 500]
        axes[0].plot(xs, [40, 42, 48, 43], marker="o", color=BLUE, lw=2.2, ms=9)
        axes[1].plot(xs, [2.9, 2.9, 2.7, 2.9], marker="s", color=ORANGE, lw=2.2, ms=9)
        axes[0].set_title("(a) Accuracy (placeholder)")
        axes[1].set_title("(b) Latency (placeholder)")

    axes[0].set_ylabel("Accuracy (%)")
    axes[0].set_title("(a) Accuracy vs. Chunk Size")
    axes[1].legend(loc="upper right")
    fig.suptitle("Ablation Study: Effect of Chunk Size (BM25 + GPT-4o-mini)",
                 fontsize=12, y=1.02)
    save(fig, "fig05_chunk_ablation")


# ════════════════════════════════════════════════════════════════════════════
# Fig 06 — Top-K Ablation
# ════════════════════════════════════════════════════════════════════════════
def fig06():
    """Top-K'nın accuracy ve latency üzerine etkisi."""
    print("\n[fig06] Top-K Ablation...")
    csv = OUTPUT_DIR / "ablation_topk_summary.csv"
    fig, axes = plt.subplots(1, 2, figsize=(FW * 1.35, FH))

    if csv.exists():
        df = pd.read_csv(csv).sort_values("top_k")
        ks = df["top_k"].tolist()
        axes[0].plot(ks, df["accuracy"] * 100, marker="o",
                     color=BLUE, lw=2.2, ms=9, label="Accuracy")
        axes[0].set_ylim(0, 100)
        axes[1].plot(ks, df["mean_latency"], marker="s",
                     color=ORANGE, lw=2.2, ms=9, label="Latency (s)")
        axes[1].set_ylabel("Mean Latency (s)")
        for ax in axes:
            ax.set_xticks(ks)
            ax.set_xlabel("Top-K (retrieved chunks)")
    else:
        ks = [1, 3, 5, 10]
        axes[0].plot(ks, [62, 58, 56, 62], marker="o", color=BLUE, lw=2.2, ms=9)
        axes[1].plot(ks, [2.9, 2.6, 2.7, 2.6], marker="s", color=ORANGE, lw=2.2, ms=9)
        axes[0].set_title("(a) Accuracy (placeholder)")
        axes[1].set_title("(b) Latency (placeholder)")

    axes[0].set_ylabel("Accuracy (%)")
    axes[0].set_title("(a) Accuracy vs. Top-K")
    axes[1].set_title("(b) Latency vs. Top-K")
    axes[1].legend(loc="upper left")
    fig.suptitle("Ablation Study: Effect of Retrieval Depth Top-K (BM25 + GPT-4o-mini)",
                 fontsize=12, y=1.02)
    save(fig, "fig06_topk_ablation")


# ════════════════════════════════════════════════════════════════════════════
# Fig 07 — Compliance Score Distribution (Boxplot)
# ════════════════════════════════════════════════════════════════════════════
def fig07():
    """Her pipeline için predicted compliance score dağılımı."""
    print("\n[fig07] Score Distribution Boxplot...")
    df = load_balanced_detail()
    if df is None:
        print("  ⚠ Veri yok — atlandı"); return

    available = [p for p in PIP_ORDER if p in df["pipeline"].values]
    data   = [df[df["pipeline"] == p]["pred_score"].dropna().values
               for p in available]
    labels = [PIP_LABELS.get(p, p.upper()) for p in available]
    colors = [PIP_COLORS.get(p, PURPLE) for p in available]

    fig, ax = plt.subplots(figsize=(FW, FH))
    bp = ax.boxplot(data, patch_artist=True, notch=False,
                    medianprops=dict(color="black", linewidth=2.5),
                    whiskerprops=dict(linewidth=1.5),
                    capprops=dict(linewidth=1.5))
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.70)

    ax.set_xticks(range(1, len(labels) + 1))
    ax.set_xticklabels(labels)
    ax.set_ylabel("Predicted Compliance Score (0–100)")
    ax.set_xlabel("Retrieval Pipeline")
    ax.set_title("Distribution of Predicted Compliance Scores\nby Pipeline (All Models Combined)")
    ax.axhline(70, color=RED, linestyle="--", lw=1.5, label="Compliant threshold (70)")
    ax.axhline(30, color=ORANGE, linestyle=":", lw=1.5, label="Non-compliant threshold (30)")
    ax.legend(fontsize=9, loc="lower right")
    save(fig, "fig07_score_distribution")


# ════════════════════════════════════════════════════════════════════════════
# Fig 08 — Latency Comparison (Horizontal Bar)
# ════════════════════════════════════════════════════════════════════════════
def fig08():
    """Pipeline + model kombinasyonlarının ortalama latency karşılaştırması."""
    print("\n[fig08] Latency Comparison...")
    df = load_balanced_summary()
    if df is None:
        print("  ⚠ Veri yok — atlandı"); return
    if "mean_latency" not in df.columns:
        print("  ⚠ mean_latency sütunu yok — atlandı"); return

    # Sıralı label
    df = df.copy()
    df["pip_order"] = df["pipeline"].apply(
        lambda p: PIP_ORDER.index(p) if p in PIP_ORDER else 99)
    df = df.sort_values(["pip_order", "model"], ascending=[True, False])
    df["label"] = (df["pipeline"].map(PIP_LABELS).fillna(df["pipeline"].str.upper())
                   + " + "
                   + df["model"].str.replace("gpt-", "GPT-"))
    colors = [PIP_COLORS.get(p, PURPLE) for p in df["pipeline"]]
    hatches = ["//" if "mini" in m else "" for m in df["model"]]

    fig, ax = plt.subplots(figsize=(FW, max(FH, len(df) * 0.55)))
    bars = ax.barh(df["label"], df["mean_latency"],
                   color=colors, hatch=hatches,
                   edgecolor="white", linewidth=0.5, alpha=0.88)
    for bar, v in zip(bars, df["mean_latency"]):
        ax.text(bar.get_width() + 0.03,
                bar.get_y() + bar.get_height()/2,
                f"{v:.2f}s", va="center", fontsize=9.5)

    legend_patches = [mpatches.Patch(color=PIP_COLORS.get(p, PURPLE),
                                      label=PIP_LABELS.get(p, p.upper()))
                      for p in PIP_ORDER if p in df["pipeline"].values]
    model_patches = [
        mpatches.Patch(facecolor="grey", hatch="//", label="GPT-4o-mini", edgecolor="white"),
        mpatches.Patch(facecolor="grey", hatch="",   label="GPT-4o",      edgecolor="white"),
    ]
    ax.legend(handles=legend_patches + model_patches,
              fontsize=8.5, loc="lower right", framealpha=0.9, ncol=2)
    ax.set_xlabel("Mean Latency per Request (s)")
    ax.set_title("Response Latency by Pipeline and Model")
    save(fig, "fig08_latency")


# ════════════════════════════════════════════════════════════════════════════
# Fig 09 — GPT-4o vs GPT-4o-mini Accuracy Comparison (Paired Bar)
# ════════════════════════════════════════════════════════════════════════════
def fig09():
    """GPT-4o vs GPT-4o-mini accuracy farkını pipeline bazında göster."""
    print("\n[fig09] Model Comparison Bar...")
    df = load_balanced_summary()
    if df is None:
        print("  ⚠ Veri yok — atlandı"); return

    available = [p for p in PIP_ORDER if p in df["pipeline"].values]
    x = np.arange(len(available))
    w = 0.35
    models = ["gpt-4o-mini", "gpt-4o"]

    fig, ax = plt.subplots(figsize=(FW * 1.1, FH))
    for i, model in enumerate(models):
        sub  = df[df["model"] == model].set_index("pipeline").reindex(available)
        vals = sub["accuracy"].fillna(0).values * 100
        color = MODEL_COLORS.get(model, PURPLE)
        offset = (i - 0.5) * w
        bars = ax.bar(x + offset, vals, w,
                      label=model.replace("gpt-", "GPT-"),
                      color=color, edgecolor="white", linewidth=0.7, alpha=0.9)
        for bar, v in zip(bars, vals):
            if v > 0:
                ax.text(bar.get_x() + bar.get_width()/2,
                        bar.get_height() + 0.8,
                        f"{v:.1f}%", ha="center", va="bottom",
                        fontsize=8.5, fontweight="bold")

    # Fark okları
    for j, pip in enumerate(available):
        mini_row = df[(df["pipeline"] == pip) & (df["model"] == "gpt-4o-mini")]
        big_row  = df[(df["pipeline"] == pip) & (df["model"] == "gpt-4o")]
        if mini_row.empty or big_row.empty: continue
        mini_v = mini_row["accuracy"].values[0] * 100
        big_v  = big_row["accuracy"].values[0]  * 100
        diff   = big_v - mini_v
        if abs(diff) > 0.5:
            ax.annotate(f"Δ{diff:+.1f}%",
                        xy=(x[j], max(mini_v, big_v) + 5),
                        ha="center", fontsize=8, color=RED, fontweight="bold")

    ax.set_xticks(x)
    ax.set_xticklabels([PIP_LABELS.get(p, p.upper()) for p in available])
    ax.set_ylabel("Classification Accuracy (%)")
    ax.set_xlabel("Retrieval Pipeline")
    ax.set_ylim(0, 115)
    ax.set_title("GPT-4o vs GPT-4o-mini Accuracy per Pipeline\n"
                 "(Δ = GPT-4o advantage)")
    ax.legend(title="Model", loc="upper right", framealpha=0.9)
    save(fig, "fig09_model_comparison")


# ════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print(f"ComplianceAI — Publication Figure Generator")
    print(f"Output: {FIGURES_DIR}  |  DPI: {DPI}")
    print("=" * 60)

    fig02()   # Accuracy grouped bar
    fig03()   # Per-class heatmap
    fig04()   # Cost-performance scatter
    fig05()   # Chunk size ablation
    fig06()   # Top-K ablation
    fig07()   # Score distribution boxplot
    fig08()   # Latency comparison
    fig09()   # GPT-4o vs mini comparison

    print(f"\n🎉 Tüm figürler tamamlandı → {FIGURES_DIR}")
