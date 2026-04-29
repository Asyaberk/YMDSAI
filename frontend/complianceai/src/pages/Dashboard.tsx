import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Trophy, TrendingUp, DollarSign, Database,
  AlertTriangle, Loader2, Wifi, WifiOff,
} from 'lucide-react';
import { fetchSummary, SummaryRow, SummaryMeta } from '../api';

// ── Helpers ──────────────────────────────────────────────────────────────────
const pct = (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '—';
const fmt3 = (v: number | null) => v != null ? v.toFixed(3) : '—';

const PIPELINE_ORDER = ['bm25', 'hybrid', 'dense', 'no-rag'];
const MEDAL = ['🥇', '🥈', '🥉', '4️⃣'];

// ── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [meta, setMeta] = useState<SummaryMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary()
      .then(data => { setRows(data.rows); setMeta(data.meta); })
      .catch(e  => setError(e.message))
      .finally(()=> setLoading(false));
  }, []);

  // ── Chart data: per-pipeline average across models ─────────────────────────
  const perPipeline = PIPELINE_ORDER.map(pipe => {
    const group = rows.filter(r => r.pipeline === pipe);
    const avg = (key: keyof SummaryRow) => {
      const vals = group.map(r => r[key] as number | null).filter(v => v != null) as number[];
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      pipeline: pipe,
      label:    group[0]?.pipeline_label ?? pipe,
      color:    group[0]?.pipeline_color ?? '#64748B',
      accuracy:    avg('accuracy'),
      recall_at_k: avg('recall_at_k'),
      mrr:         avg('mrr'),
    };
  });

  // ── Leaderboard: sort by recall_at_k ──────────────────────────────────────
  const leaderboard = [...perPipeline].sort(
    (a, b) => (b.recall_at_k ?? 0) - (a.recall_at_k ?? 0)
  );

  // ── Metric cards ──────────────────────────────────────────────────────────
  const metricCards = meta ? [
    {
      label: 'En İyi Retrieval',
      value: meta.best_pipeline,
      sub:   `Recall@5: ${pct(meta.best_recall_at_k)}`,
      color: 'text-blue-600',
      bg:    'bg-blue-50',
      icon:  <TrendingUp size={20} className="text-blue-500" />,
    },
    {
      label: 'Toplam Test Case',
      value: `${meta.n_cases} case`,
      sub:   `${meta.n_pipelines} pipeline × 2 model`,
      color: 'text-emerald-600',
      bg:    'bg-emerald-50',
      icon:  <Database size={20} className="text-emerald-500" />,
    },
    {
      label: 'Ort. Doğruluk',
      value: pct(meta.mean_accuracy),
      sub:   '⚠ Class imbalance mevcut',
      color: 'text-amber-600',
      bg:    'bg-amber-50',
      icon:  <AlertTriangle size={20} className="text-amber-500" />,
    },
    {
      label: 'Toplam API Maliyeti',
      value: `$${meta.total_cost_usd.toFixed(2)}`,
      sub:   '320 LLM çağrısı',
      color: 'text-violet-600',
      bg:    'bg-violet-50',
      icon:  <DollarSign size={20} className="text-violet-500" />,
    },
  ] : [];

  // ── Chart data for bar ────────────────────────────────────────────────────
  const barData = perPipeline.map(p => ({
    name:        p.label.split(' (')[0],   // short name
    'Recall@5':  p.recall_at_k != null ? Math.round(p.recall_at_k * 1000) / 10 : 0,
    'MRR':       p.mrr         != null ? Math.round(p.mrr         * 1000) / 10 : 0,
    'Accuracy':  p.accuracy    != null ? Math.round(p.accuracy    * 1000) / 10 : 0,
    color:       p.color,
  }));

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
      <Loader2 className="animate-spin" size={24} />
      <span>API'dan veriler yükleniyor…</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
      <WifiOff size={40} className="text-slate-300" />
      <p className="font-medium text-red-500">Backend'e bağlanılamadı</p>
      <p className="text-sm text-slate-400">{error}</p>
      <code className="text-xs bg-slate-100 px-3 py-2 rounded-lg">
        .venv/bin/uvicorn backend.main:app --port 8000
      </code>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── Metric Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {metricCards.map((c, i) => (
          <div key={i} className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">{c.label}</p>
              <div className={`p-2 rounded-lg ${c.bg}`}>{c.icon}</div>
            </div>
            <p className={`text-xl font-semibold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Left: Retrieval Quality Bar Chart ──────────────────────────── */}
        <div className="card">
          <h2 className="text-lg font-medium mb-1">Retrieval Kalitesi</h2>
          <p className="text-xs text-slate-400 mb-6">Model ortalaması — Recall@5, MRR, Accuracy (%)</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="Recall@5" fill="#3B82F6" radius={[4,4,0,0]} />
                <Bar dataKey="MRR"      fill="#8B5CF6" radius={[4,4,0,0]} />
                <Bar dataKey="Accuracy" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center">
            ⚠ Accuracy sınıf dengesizliği nedeniyle yanıltıcı olabilir (%95 "partial")
          </p>
        </div>

        {/* ── Right: Leaderboard + Class Imbalance Note ──────────────────── */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <Trophy size={20} className="text-amber-500" />
              <h2 className="text-lg font-medium">Pipeline Liderlik Tablosu</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">Recall@5 metriğine göre sıralama — model ortalaması</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-gray-100 text-xs">
                  <th className="text-left pb-3 font-medium">Sıra</th>
                  <th className="text-left pb-3 font-medium">Pipeline</th>
                  <th className="text-right pb-3 font-medium">Recall@5</th>
                  <th className="text-right pb-3 font-medium">MRR</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr key={row.pipeline} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-lg">{MEDAL[i]}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                        <span className="font-medium text-xs">{row.label}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold text-blue-600 text-xs">
                      {pct(row.recall_at_k)}
                    </td>
                    <td className="py-3 text-right text-slate-500 text-xs">
                      {fmt3(row.mrr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Recommended Config ──────────────────────────────────────── */}
          <div className="card border border-blue-100 bg-blue-50/30">
            <div className="flex items-center gap-2 mb-3">
              <Wifi size={16} className="text-blue-500" />
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Önerilen Yapılandırma</p>
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              BM25 + GPT-4o-mini
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              En yüksek retrieval kalitesi (Recall@5: 66.2%) ve en düşük maliyet
              ($0.017 / 40 sorgu). Türkçe hukuki metinlerde exact-term matching
              semantik aramadan üstün.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
