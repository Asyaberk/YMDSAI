import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, LabelList, Cell,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import {
  Settings, Play, ChevronDown, ChevronUp, Trophy, Zap, Clock, Eye,
  Loader2, DollarSign, RefreshCw, AlertTriangle,
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('ca_token') ?? ''}` });

const COLORS = ['#185FA5', '#1D9E75', '#BA7517', '#E24B4A', '#7F77DD'];
const PIPELINE_ORDER = ['no-rag', 'bm25', 'dense', 'hybrid', 'multiquery'];

interface RagModel {
  id: string; name: string; f1: number; precision: number; recall: number;
  latency: number; explainability: number; category: string;
  description: string; pros: string[]; cons: string[];
  cost_gpt4o: number; cost_mini: number; accuracy_mini: number; n: number;
}
interface ChunkRow   { chunkSize: number; accuracy: number; meanScore: number; latency: number; }
interface TopkRow    { topK: number;      accuracy: number; meanScore: number; latency: number; }
interface LabelRow   { pipeline: string;  model: string; compliant: number; partial: number; 'non-compliant': number; }

// ── Helpers ────────────────────────────────────────────────────────────────────

function pipelineLabel(id: string) {
  const MAP: Record<string, string> = {
    'no-rag': 'No-RAG', bm25: 'BM25', dense: 'Dense',
    hybrid: 'Hybrid', multiquery: 'Multi-Q',
  };
  return MAP[id] ?? id;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RAGExperiments() {
  const [models, setModels]         = useState<RagModel[]>([]);
  const [chunkData, setChunkData]   = useState<ChunkRow[]>([]);
  const [topkData, setTopkData]     = useState<TopkRow[]>([]);
  const [labelData, setLabelData]   = useState<LabelRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [visibleModels, setVisibleModels] = useState<string[]>([]);

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [exp, chunk, topk, labels] = await Promise.all([
        fetch(`${BASE}/api/experiments`,                   { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BASE}/api/experiments/ablation/chunk`,    { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BASE}/api/experiments/ablation/topk`,     { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BASE}/api/experiments/label-accuracy`,    { headers: authHeaders() }).then(r => r.json()),
      ]);
      const sorted = ((exp.models ?? []) as RagModel[]).sort(
        (a, b) => PIPELINE_ORDER.indexOf(a.id) - PIPELINE_ORDER.indexOf(b.id)
      );
      setModels(sorted);
      setVisibleModels(sorted.map(m => m.id));
      setChunkData(Array.isArray(chunk)  ? chunk  : []);
      setTopkData(Array.isArray(topk)   ? topk   : []);
      setLabelData(Array.isArray(labels) ? labels : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAll();
  };

  // ── Derived data ──────────────────────────────────────────────────────────────

  // Chart 1: GPT-4o vs GPT-4o-mini accuracy comparison (real data from rows)
  const barData = models.map(m => ({
    name: pipelineLabel(m.id),
    'GPT-4o (%)': Math.round(m.f1 * 100 * 10) / 10,
    'GPT-4o-mini (%)': Math.round(m.accuracy_mini * 100 * 10) / 10,
    'Güven Skoru': Math.round(m.precision * 100 * 10) / 10,
  }));

  // Chart 2: Radar — real axes only (no fabricated recall)
  const maxCost = Math.max(...models.map(m => m.cost_gpt4o)) || 1;
  const maxLat  = Math.max(...models.map(m => m.latency))    || 1;
  const radarData = ['Doğruluk', 'Güven Skoru', 'Hız', 'Açıklanabilirlik', 'Maliyet Verimi'].map(subject => {
    const entry: any = { subject };
    models.forEach(m => {
      if (subject === 'Doğruluk')          entry[m.name] = m.f1;
      else if (subject === 'Güven Skoru')  entry[m.name] = m.precision;
      else if (subject === 'Hız')          entry[m.name] = Math.max(0, (maxLat - m.latency) / maxLat);
      else if (subject === 'Açıklanabilirlik') entry[m.name] = m.explainability / 5;
      else if (subject === 'Maliyet Verimi')   entry[m.name] = 1 - m.cost_gpt4o / maxCost;
    });
    return entry;
  });

  // Chart 3: Scatter
  const scatterData = models.map(m => ({
    name: pipelineLabel(m.id), x: m.latency, y: m.f1,
  }));

  // Chart 4: Per-label accuracy heatmap (REAL data)
  const heatmapRows = PIPELINE_ORDER.map(pid => {
    const row = labelData.find(r => r.pipeline === pid && r.model === 'gpt-4o');
    return {
      pipeline: pipelineLabel(pid),
      compliant:       row?.compliant       ?? 0,
      partial:         row?.partial         ?? 0,
      'non-compliant': row?.['non-compliant'] ?? 0,
    };
  });
  const getHeatColor = (val: number) => {
    if (val >= 60)  return 'bg-success text-white';
    if (val >= 20)  return 'bg-warning text-white';
    if (val > 0)    return 'bg-orange-400 text-white';
    return 'bg-danger text-white';
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="text-sm font-medium">Deney sonuçları yükleniyor...</p>
      </div>
    </div>
  );

  return (
    <div className="flex gap-8">
      <div className="flex-1 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">RAG Karşılaştırma Deneyleri</h1>
            <p className="text-slate-500 text-sm mt-1">
              Pipeline performanslarını gerçek benchmark sonuçlarıyla karşılaştırın.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm">
              <Play size={15} className="text-primary" />
              <span className="font-bold text-slate-800">{models.length}</span>
              <span className="text-slate-400">pipeline</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm">
              <Clock size={15} className="text-academic" />
              <span className="font-bold text-slate-800">{models[0]?.n ?? 40}</span>
              <span className="text-slate-400">test vakası</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Chart 1: GPT-4o vs GPT-4o-mini Accuracy */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">GPT-4o vs GPT-4o-mini Doğruluk Karşılaştırması</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Her pipeline için iki model doğruluğu (40 test vakası)</p>
            </div>
            <ResponsiveContainer width="100%" height="87%">
              <BarChart data={barData} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 60]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} />
                <Bar dataKey="GPT-4o (%)"      fill="#185FA5" radius={[4,4,0,0]} />
                <Bar dataKey="GPT-4o-mini (%)" fill="#1D9E75" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Radar — real axes */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">Çok Boyutlu Model Analizi</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Legend'e tıklayarak model gizle/göster</p>
            </div>
            <ResponsiveContainer width="100%" height="87%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                {models.filter(m => visibleModels.includes(m.id)).map((m, i) => (
                  <Radar
                    key={m.id} name={m.name} dataKey={m.name}
                    stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.1}
                  />
                ))}
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
                  onClick={e => {
                    const id = models.find(m => m.name === e.value)?.id;
                    if (id) setVisibleModels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Scatter — Hız/Doğruluk */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">Hız–Doğruluk Dengesi (Trade-off)</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Sol üst köşe ideal: hızlı ve doğru</p>
            </div>
            <ResponsiveContainer width="100%" height="87%">
              <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="x" name="Gecikme" unit="s" tick={{ fontSize: 10 }}
                  label={{ value: 'Ort. Gecikme (sn)', position: 'bottom', fontSize: 10, dy: 14 }} />
                <YAxis type="number" dataKey="y" name="Accuracy" domain={[0.28, 0.52]}
                  tick={{ fontSize: 10 }} tickFormatter={v => `${(v*100).toFixed(0)}%`}
                  label={{ value: 'Doğruluk', angle: -90, position: 'insideLeft', fontSize: 10, dx: -4 }} />
                <ZAxis type="number" range={[120, 120]} />
                <Tooltip formatter={(v: number, name: string) =>
                  [name === 'Accuracy' ? `${(v*100).toFixed(1)}%` : `${v}s`, name]} />
                <Scatter name="Pipeline" data={scatterData}>
                  {scatterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  <LabelList dataKey="name" position="top" style={{ fontSize: '9px', fill: '#64748b' }} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4: Per-label accuracy heatmap (REAL) */}
          <div className="card h-[400px] flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-medium">Etiket Türü × Pipeline Doğruluk Haritası</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">GPT-4o · Her etiket türündeki tespit başarısı</p>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {/* Header row */}
              <div className="grid grid-cols-4 gap-2">
                <div />
                {['Uyumlu', 'Kısmen Uyumlu', 'Uyumsuz'].map(col => (
                  <div key={col} className="text-[10px] font-bold text-slate-500 text-center">{col}</div>
                ))}
              </div>
              {/* Data rows */}
              {heatmapRows.map((row, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 flex-1">
                  <div className="text-[10px] font-medium text-slate-700 flex items-center"
                    style={{ color: COLORS[i % COLORS.length] }}>
                    {row.pipeline}
                  </div>
                  <div className={`rounded-lg flex items-center justify-center text-sm font-bold ${getHeatColor(row.compliant)}`}>
                    %{row.compliant}
                  </div>
                  <div className={`rounded-lg flex items-center justify-center text-sm font-bold ${getHeatColor(row.partial)}`}>
                    %{row.partial}
                  </div>
                  <div className={`rounded-lg flex items-center justify-center text-sm font-bold ${getHeatColor(row['non-compliant'])}`}>
                    %{row['non-compliant']}
                  </div>
                </div>
              ))}
            </div>

            {/* Critical finding callout */}
            <div className="mt-4 p-3 bg-danger/5 border border-danger/10 rounded-xl flex items-start gap-2">
              <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-600 leading-relaxed">
                <b className="text-danger">Kritik Bulgu:</b> Tüm RAG pipeline'ları uyumsuz maddeleri tespit etmekte
                başarısız (%0). Yalnızca No-RAG %7.7 oranında başarı gösteriyor.
                Bu sonuç, modellerin <i>false negative</i> eğilimli olduğuna işaret eder.
              </p>
            </div>

            <div className="mt-2 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 text-[10px] text-slate-500"><div className="w-3 h-3 bg-success rounded-sm" /> ≥60%</div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500"><div className="w-3 h-3 bg-warning rounded-sm" /> 20–60%</div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500"><div className="w-3 h-3 bg-danger rounded-sm" /> &lt;20%</div>
            </div>
          </div>

          {/* Chart 5: Chunk Size Ablation */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">Chunk Boyutu Ablasyon Analizi</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Chunk boyutunun doğruluk ve güven skoru üzerindeki etkisi (Top-K=5, GPT-4o-mini)</p>
            </div>
            <ResponsiveContainer width="100%" height="87%">
              <LineChart data={chunkData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="chunkSize" tick={{ fontSize: 10 }}
                  label={{ value: 'Chunk Boyutu (token)', position: 'bottom', fontSize: 10, dy: 12 }} />
                <YAxis yAxisId="left"  domain={[35, 60]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis yAxisId="right" orientation="right" domain={[65, 90]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} />
                <Tooltip formatter={(v: number, name: string) => [name === 'Doğruluk %' ? `${v}%` : v, name]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} />
                <ReferenceLine yAxisId="left" x={350} stroke="#7F77DD" strokeDasharray="4 4"
                  label={{ value: 'Optimum', position: 'top', fontSize: 9, fill: '#7F77DD' }} />
                <Line yAxisId="left"  type="monotone" dataKey="accuracy"  name="Doğruluk %"
                  stroke="#7F77DD" strokeWidth={3} dot={{ r: 5, fill: '#7F77DD' }} activeDot={{ r: 7 }} />
                <Line yAxisId="right" type="monotone" dataKey="meanScore" name="Ort. Güven Skoru"
                  stroke="#BA7517" strokeWidth={2} dot={{ r: 4, fill: '#BA7517' }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 6: Top-K Ablation */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">Top-K Ablasyon Analizi</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Retrieval derinliğinin doğruluk ve gecikme süresine etkisi (Chunk=350, GPT-4o-mini)</p>
            </div>
            <ResponsiveContainer width="100%" height="87%">
              <LineChart data={topkData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="topK" tick={{ fontSize: 10 }}
                  label={{ value: 'Top-K Değeri', position: 'bottom', fontSize: 10, dy: 12 }} />
                <YAxis yAxisId="left"  domain={[45, 56]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis yAxisId="right" orientation="right" domain={[1.7, 2.2]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}s`} />
                <Tooltip formatter={(v: number, name: string) => [name === 'Doğruluk %' ? `${v}%` : `${v}s`, name]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} />
                <ReferenceLine yAxisId="left" x={5} stroke="#1D9E75" strokeDasharray="4 4"
                  label={{ value: 'Seçilen K', position: 'top', fontSize: 9, fill: '#1D9E75' }} />
                <Line yAxisId="left"  type="monotone" dataKey="accuracy" name="Doğruluk %"
                  stroke="#1D9E75" strokeWidth={3} dot={{ r: 5, fill: '#1D9E75' }} activeDot={{ r: 7 }} />
                <Line yAxisId="right" type="monotone" dataKey="latency"  name="Gecikme (sn)"
                  stroke="#E24B4A" strokeWidth={2} dot={{ r: 4, fill: '#E24B4A' }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Model Descriptions */}
        <div className="card">
          <h3 className="text-lg font-medium mb-6">Model Açıklamaları</h3>
          <div className="space-y-2">
            {models.map((model, i) => (
              <div key={model.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-medium text-sm">{model.name}</span>
                    <span className="status-pill bg-academic/10 text-academic text-[10px]">
                      {model.id === 'hybrid' ? 'Üretimde Kullanılan' : model.id === 'no-rag' ? 'Taban Çizgisi' : model.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="font-bold text-slate-700">%{(model.f1 * 100).toFixed(1)} acc</span>
                    {expandedModel === model.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {expandedModel === model.id && (
                  <div className="p-4 bg-slate-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                    <div className="md:col-span-1">
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">{model.description}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-slate-500"><Zap size={13} className="text-warning" /> {model.latency}s gecikme</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500"><Eye size={13} className="text-primary" /> {model.explainability}/5 açıklanabilirlik</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500"><DollarSign size={13} className="text-success" /> ${model.cost_gpt4o} / 40 vaka</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-success uppercase mb-2">Avantajlar</p>
                      <ul className="text-xs text-slate-600 space-y-1">{model.pros.map((p, j) => <li key={j}>• {p}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-danger uppercase mb-2">Dezavantajlar</p>
                      <ul className="text-xs text-slate-600 space-y-1">{model.cons.map((p, j) => <li key={j}>• {p}</li>)}</ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Settings Panel */}
      <aside className="w-80 space-y-6">
        <div className="card sticky top-8">
          <div className="flex items-center gap-2 mb-6">
            <Settings size={20} className="text-slate-400" />
            <h2 className="text-lg font-medium">Deney Ayarları</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-medium text-slate-600">Similarity Threshold</label>
                <span className="text-xs font-bold text-primary">0.75</span>
              </div>
              <input type="range" min="0.5" max="0.95" step="0.05" defaultValue="0.75"
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-600">Embedding Model</label>
              <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
                defaultValue="OpenAI text-embedding-3-small">
                <option>SBERT all-MiniLM-L6-v2</option>
                <option>SBERT all-mpnet-base-v2</option>
                <option>OpenAI text-embedding-3-small</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-medium text-slate-600">Top-k Results</label>
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <input type="range" min="1" max="10" step="1" defaultValue="5"
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-600">LLM Selector</label>
              <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" defaultValue="GPT-4o">
                <option>GPT-4o</option>
                <option>GPT-4o-mini</option>
                <option>LLaMA-2</option>
              </select>
            </div>

            {/* Real refresh button */}
            <button
              className={`w-full btn-primary py-3 flex items-center justify-center gap-2 ${isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <RefreshCw size={16} />}
              {isRefreshing ? 'Veriler Güncelleniyor...' : 'Sonuçları Yenile'}
            </button>
          </div>

          {/* Recommended config */}
          <div className="mt-8 p-4 bg-academic/5 rounded-xl border border-academic/10">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={16} className="text-academic" />
              <p className="text-xs font-bold text-academic uppercase">Önerilen Yapılandırma</p>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Benchmark sonuçlarına göre <b>Hybrid RAG + GPT-4o</b> en iyi doğruluk/hız dengesini sağlar
              (%47.5 accuracy, 1.82s gecikme). <b className="text-danger">Uyumsuz madde tespiti</b> tüm
              modellerde kritik zayıflık (%0) — ileri çalışmalar için öncelikli hedef.
            </p>
          </div>

          {/* Cost table */}
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">40 Vaka Maliyet Karşılaştırması</p>
            <div className="space-y-2">
              {models.map((m, i) => (
                <div key={m.id} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 truncate max-w-[90px]">{pipelineLabel(m.id)}</span>
                  </div>
                  <div className="flex gap-3 text-slate-400">
                    <span>4o: <b className="text-slate-600">${m.cost_gpt4o}</b></span>
                    <span>mini: <b className="text-slate-600">${m.cost_mini}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}
