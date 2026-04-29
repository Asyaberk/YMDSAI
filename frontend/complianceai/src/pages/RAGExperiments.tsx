import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, LabelList,
} from 'recharts';
import { Trophy, Loader2, WifiOff, Info, CheckCircle2 } from 'lucide-react';
import { fetchExperiments, ExperimentAgg } from '../api';

// ── Constants ────────────────────────────────────────────────────────────────
const PIPELINES  = ['no-rag', 'bm25', 'dense', 'hybrid'] as const;
const MODELS     = ['gpt-4o-mini', 'gpt-4o'] as const;
const MODEL_LABELS: Record<string, string> = {
  'gpt-4o':      'GPT-4o',
  'gpt-4o-mini': 'GPT-4o-mini',
};
const BAR_COLORS: Record<string, string> = {
  'gpt-4o':      '#6366F1',
  'gpt-4o-mini': '#3B82F6',
};

const PIPELINE_DESCRIPTIONS: Record<string, { desc: string; pros: string[]; cons: string[] }> = {
  'no-rag': {
    desc: 'YÖK mevzuatından hiçbir chunk çekilmez. Sadece üniversite metni LLM\'e verilir. Baseline referans noktası.',
    pros: ['En ucuz ($0.011/40q)', 'En az gecikme'],
    cons: ['Retrieval yok (Recall@5=0)', 'Yerleşik LLM bilgisine bağımlı'],
  },
  'bm25': {
    desc: 'BM25Okapi — TF-IDF tabanlı kelime eşleşmesi. Türkçe hukuki terminoloji için çok etkili.',
    pros: ['En yüksek Recall@5 (%66.2)', 'En yüksek MRR (0.767)', 'Ucuz'],
    cons: ['Semantik anlama yok', 'Eş anlamlı terimleri kaçırabilir'],
  },
  'dense': {
    desc: 'FAISS + paraphrase-multilingual-MiniLM-L12-v2 ile semantik vektör araması. 384-boyutlu embedding.',
    pros: ['Semantik anlama kapasitesi', 'Eş anlamlı terimleri yakalayabilir'],
    cons: ['Recall@5 çok düşük (%2.5)', 'Domain-specific eğitim eksikliği'],
  },
  'hybrid': {
    desc: 'BM25 + Dense skorların eşit ağırlıkla (α=0.5) kombinasyonu. min-max normalizasyonu ile.',
    pros: ['Her iki yöntemin avantajları', 'Dengeli yaklaşım'],
    cons: ['Dense\'in zayıflığını miras alıyor', 'BM25\'ten düşük Recall@5'],
  },
};

const pct = (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '—';

// ── Component ────────────────────────────────────────────────────────────────
export default function RAGExperiments() {
  const [data, setData]       = useState<ExperimentAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selModel, setSelModel] = useState<string>('gpt-4o-mini');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchExperiments()
      .then(d => setData(d.aggregated))
      .catch(e => setError(e.message))
      .finally(()=> setLoading(false));
  }, []);

  // ── Chart Builders ────────────────────────────────────────────────────────
  const filtered = data.filter(r => r.model === selModel);
  const pipelinesInOrder = PIPELINES.map(p => filtered.find(r => r.pipeline === p)).filter(Boolean) as ExperimentAgg[];

  // Bar chart data — 3 metrics × 4 pipelines
  const barData = pipelinesInOrder.map(r => ({
    name:        r.pipeline_label.split(' (')[0],
    color:       r.pipeline_color,
    'Recall@5':  r.recall_at_k != null ? +(r.recall_at_k * 100).toFixed(1) : 0,
    'MRR×100':   r.mrr         != null ? +(r.mrr * 100).toFixed(1)         : 0,
    'Accuracy':  r.accuracy    != null ? +(r.accuracy * 100).toFixed(1)    : 0,
  }));

  // Scatter: cost vs recall@5 — all models
  const scatterData = data.map(r => ({
    name:        `${r.pipeline_label.split(' (')[0]} / ${MODEL_LABELS[r.model]}`,
    x:           r.total_cost ?? 0,
    y:           r.recall_at_k != null ? +(r.recall_at_k * 100).toFixed(1) : 0,
    color:       r.pipeline_color,
    model:       r.model,
  }));

  // Leaderboard by recall_at_k — averaged over models
  const leaderboard = PIPELINES.map(pipe => {
    const group = data.filter(r => r.pipeline === pipe);
    const avg = (key: keyof ExperimentAgg) => {
      const vals = group.map(r => r[key] as number | null).filter(v => v != null) as number[];
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    };
    return {
      pipeline: pipe,
      label:    group[0]?.pipeline_label ?? pipe,
      color:    group[0]?.pipeline_color ?? '#64748B',
      recall_at_k: avg('recall_at_k'),
      mrr:         avg('mrr'),
      accuracy:    avg('accuracy'),
      cost_mini:   data.find(r=>r.pipeline===pipe&&r.model==='gpt-4o-mini')?.total_cost ?? null,
    };
  }).sort((a,b)=>(b.recall_at_k??0)-(a.recall_at_k??0));

  const MEDAL = ['🥇','🥈','🥉','4️⃣'];

  // ── Error / Loading ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
      <Loader2 className="animate-spin" size={24}/>
      <span>Benchmark verileri yükleniyor…</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
      <WifiOff size={40} className="text-slate-300"/>
      <p className="font-medium text-red-500">Backend'e bağlanılamadı</p>
      <code className="text-xs bg-slate-100 px-4 py-2 rounded-lg">
        .venv/bin/uvicorn backend.main:app --port 8000
      </code>
    </div>
  );

  return (
    <div className="flex gap-8">
      <div className="flex-1 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium">RAG Karşılaştırma Deneyleri</h1>
            <p className="text-sm text-slate-400 mt-1">
              {data.length > 0 ? `${data[0].n} test case · Gerçek GPT-4o/mini sonuçları` : ''}
            </p>
          </div>
          {/* Model selector */}
          <div className="flex gap-2">
            {MODELS.map(m => (
              <button
                key={m}
                onClick={() => setSelModel(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selModel === m
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {MODEL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Chart 1: Grouped Bar — 3 metrics */}
          <div className="card h-[380px]">
            <h3 className="text-sm font-medium mb-1">Pipeline Performans Karşılaştırması</h3>
            <p className="text-xs text-slate-400 mb-4">Model: <b>{MODEL_LABELS[selModel]}</b></p>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                  contentStyle={{ borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize:'10px' }} />
                <Bar dataKey="Recall@5" fill="#3B82F6" radius={[4,4,0,0]} />
                <Bar dataKey="MRR×100" fill="#8B5CF6" radius={[4,4,0,0]} />
                <Bar dataKey="Accuracy" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Scatter — cost vs recall@5 */}
          <div className="card h-[380px]">
            <h3 className="text-sm font-medium mb-1">Maliyet & Retrieval Dengesi</h3>
            <p className="text-xs text-slate-400 mb-4">Tüm modeller · Sol-alt = en verimli</p>
            <ResponsiveContainer width="100%" height="88%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="x" name="Maliyet (USD)" tick={{ fontSize: 10 }}
                       label={{ value: 'Maliyet / 40 sorgu (USD)', position: 'bottom', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="Recall@5" domain={[0, 80]}
                       tick={{ fontSize: 10 }} unit="%" />
                <ZAxis type="number" range={[80, 80]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(v: number, name: string) => [
                    name === 'Recall@5' ? `${v}%` : `$${v.toFixed(3)}`, name
                  ]}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white rounded-lg shadow-lg p-3 text-xs border border-slate-100">
                        <p className="font-semibold mb-1">{d.name}</p>
                        <p>Recall@5: <b>{d.y}%</b></p>
                        <p>Maliyet: <b>${d.x.toFixed(3)}</b></p>
                      </div>
                    );
                  }}
                />
                <Scatter name="Pipeline/Model" data={scatterData}>
                  {scatterData.map((entry, i) => (
                    <Cell key={i} fill={entry.color}
                          opacity={entry.model === selModel ? 1 : 0.35} />
                  ))}
                  <LabelList dataKey="name" position="top"
                             style={{ fontSize: '9px', fill: '#64748b' }}
                             formatter={(v: string) => v.split(' / ')[0]}/>
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Pipeline Descriptions ────────────────────────────────────────── */}
        <div className="card">
          <h3 className="text-lg font-medium mb-6">Pipeline Açıklamaları & Teknik Kararlar</h3>
          <div className="space-y-2">
            {PIPELINES.map(pipe => {
              const info  = PIPELINE_DESCRIPTIONS[pipe];
              const row   = data.find(r => r.pipeline === pipe && r.model === selModel);
              const isExp = expanded === pipe;
              return (
                <div key={pipe} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(isExp ? null : pipe)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full"
                           style={{ background: leaderboard.find(l=>l.pipeline===pipe)?.color }} />
                      <span className="font-medium text-sm">
                        {PIPELINE_DESCRIPTIONS[pipe] && leaderboard.find(l=>l.pipeline===pipe)?.label}
                      </span>
                      {pipe === 'bm25' && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          🏆 En İyi Retrieval
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-500">
                      {row && <>
                        <span>Recall@5: <b className="text-slate-700">{pct(row.recall_at_k)}</b></span>
                        <span>MRR: <b className="text-slate-700">{row.mrr?.toFixed(3)}</b></span>
                        <span>Maliyet: <b className="text-slate-700">${row.total_cost?.toFixed(3)}</b></span>
                      </>}
                      <Info size={14} className={isExp ? 'text-primary' : 'text-slate-300'} />
                    </div>
                  </button>
                  {isExp && (
                    <div className="p-4 bg-slate-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-4">{info.desc}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Avantajlar</p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {info.pros.map((p,i) => <li key={i}>✓ {p}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-red-500 uppercase mb-2">Dezavantajlar</p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {info.cons.map((p,i) => <li key={i}>✗ {p}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-72 space-y-6">
        <div className="card sticky top-8 space-y-6">

          {/* Leaderboard */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-amber-500" />
              <h2 className="text-sm font-semibold">Retrieval Sıralaması</h2>
            </div>
            <div className="space-y-2">
              {leaderboard.map((r, i) => (
                <div key={r.pipeline}
                     className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{MEDAL[i]}</span>
                    <div>
                      <p className="text-xs font-medium">{r.label.split(' (')[0]}</p>
                      <p className="text-[10px] text-slate-400">MRR: {r.mrr?.toFixed(3) ?? '—'}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{pct(r.recall_at_k)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Class imbalance warning */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">⚠ Metodoloji Notu</p>
            <p className="text-[10px] text-amber-700 leading-relaxed">
              40 test case'in 38'i "partial" — accuracy class imbalance nedeniyle
              yanıltıcıdır. Retrieval metrikleri (Recall@5, MRR) daha güvenilir.
            </p>
          </div>

          {/* Recommended */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-blue-600" />
              <p className="text-[10px] font-bold text-blue-700 uppercase">Önerilen Yapılandırma</p>
            </div>
            <p className="text-xs font-semibold text-slate-700 mb-1">BM25 + GPT-4o-mini</p>
            <ul className="text-[10px] text-slate-500 space-y-1">
              <li>• Recall@5: 66.2%</li>
              <li>• MRR: 0.767</li>
              <li>• Maliyet: $0.017 / 40 sorgu</li>
              <li>• Latency: ~3.1s/sorgu</li>
            </ul>
          </div>

        </div>
      </aside>
    </div>
  );
}
