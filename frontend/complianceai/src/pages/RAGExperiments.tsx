import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, LabelList, Cell,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import {
  Play, ChevronDown, ChevronUp, Zap, Clock, Eye,
  Loader2, DollarSign, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
interface ChunkRow { chunkSize: number; accuracy: number; meanScore: number; latency: number; }
interface TopkRow  { topK: number;      accuracy: number; meanScore: number; latency: number; }
interface LabelRow { pipeline: string;  model: string; compliant: number; partial: number; 'non-compliant': number; }

// ── Translations ──────────────────────────────────────────────────────────────

const copy = {
  tr: {
    loading: 'Deney sonuçları yükleniyor...',
    title: 'RAG Karşılaştırma Deneyleri',
    subtitle: 'Pipeline performanslarını gerçek benchmark sonuçlarıyla karşılaştırın.',
    pipelineUnit: 'pipeline',
    testUnit: 'test vakası',
    // Charts
    chart1Title: 'GPT-4o vs GPT-4o-mini Doğruluk Karşılaştırması',
    chart1Sub: 'Her pipeline için iki model doğruluğu (40 test vakası)',
    chart1ConfLabel: 'Güven Skoru',
    chart2Title: 'Çok Boyutlu Model Analizi',
    chart2Sub: "Legend'e tıklayarak model gizle/göster",
    radarAxes: ['Doğruluk', 'Güven Skoru', 'Hız', 'Açıklanabilirlik', 'Maliyet Verimi'],
    chart3Title: 'Hız–Doğruluk Dengesi (Trade-off)',
    chart3Sub: 'Sol üst köşe ideal: hızlı ve doğru',
    latencyLabel: 'Ort. Gecikme (sn)',
    accuracyLabel: 'Doğruluk',
    latencyUnit: 'Gecikme (sn)',
    chart4Title: 'Etiket Türü × Pipeline Doğruluk Haritası',
    chart4Sub: 'GPT-4o · Her etiket türündeki tespit başarısı',
    heatmapCols: ['Uyumlu', 'Kısmen Uyumlu', 'Uyumsuz'],
    criticalLabel: 'Kritik Bulgu:',
    criticalText: "Tüm RAG pipeline'ları uyumsuz maddeleri tespit etmekte başarısız (%0). Yalnızca No-RAG %7.7 oranında başarı gösteriyor. Bu sonuç, modellerin false negative eğilimli olduğuna işaret eder.",
    chart5Title: 'Chunk Boyutu Ablasyon Analizi',
    chart5Sub: 'Chunk boyutunun doğruluk ve güven skoru üzerindeki etkisi (Top-K=5, GPT-4o-mini)',
    chunkSizeLabel: 'Chunk Boyutu (token)',
    accuracyPct: 'Doğruluk %',
    avgScoreLabel: 'Ort. Güven Skoru',
    optimumLabel: 'Optimum',
    chart6Title: 'Top-K Ablasyon Analizi',
    chart6Sub: 'Retrieval derinliğinin doğruluk ve gecikme süresine etkisi (Chunk=350, GPT-4o-mini)',
    topkLabel: 'Top-K Değeri',
    selectedK: 'Seçilen K',
    // Model descriptions panel
    modelDesc: 'Model Açıklamaları',
    inProduction: 'Üretimde Kullanılan',
    baseline: 'Taban Çizgisi',
    latencyUnit2: 's gecikme',
    explainUnit: '/5 açıklanabilirlik',
    casesUnit: '/ 40 vaka',
    pros: 'Avantajlar',
    cons: 'Dezavantajlar',
    // Settings panel
    settingsTitle: 'Deney Ayarları',
    refreshing: 'Veriler Güncelleniyor...',
    refreshBtn: 'Sonuçları Yenile',
    recommended: 'Önerilen Yapılandırma',
    recommendedText: "Benchmark sonuçlarına göre Hybrid RAG + GPT-4o en iyi doğruluk/hız dengesini sağlar (%47.5 accuracy, 1.82s gecikme). Uyumsuz madde tespiti tüm modellerde kritik zayıflık (%0) — ileri çalışmalar için öncelikli hedef.",
    costTitle: '40 Vaka Maliyet Karşılaştırması',
  },
  en: {
    loading: 'Loading experiment results...',
    title: 'RAG Comparison Experiments',
    subtitle: 'Compare pipeline performances with real benchmark results.',
    pipelineUnit: 'pipelines',
    testUnit: 'test cases',
    // Charts
    chart1Title: 'GPT-4o vs GPT-4o-mini Accuracy Comparison',
    chart1Sub: 'Two-model accuracy per pipeline (40 test cases)',
    chart1ConfLabel: 'Confidence Score',
    chart2Title: 'Multi-Dimensional Model Analysis',
    chart2Sub: 'Click legend to hide/show models',
    radarAxes: ['Accuracy', 'Confidence', 'Speed', 'Explainability', 'Cost Efficiency'],
    chart3Title: 'Speed–Accuracy Trade-off',
    chart3Sub: 'Top-left is ideal: fast and accurate',
    latencyLabel: 'Avg. Latency (s)',
    accuracyLabel: 'Accuracy',
    latencyUnit: 'Latency (s)',
    chart4Title: 'Label Type × Pipeline Accuracy Heatmap',
    chart4Sub: 'GPT-4o · Detection accuracy per label type',
    heatmapCols: ['Compliant', 'Partially Compliant', 'Non-Compliant'],
    criticalLabel: 'Critical Finding:',
    criticalText: 'All RAG pipelines fail to detect non-compliant articles (0%). Only No-RAG achieves 7.7%. This indicates a false-negative tendency across all models.',
    chart5Title: 'Chunk Size Ablation Analysis',
    chart5Sub: 'Effect of chunk size on accuracy and confidence score (Top-K=5, GPT-4o-mini)',
    chunkSizeLabel: 'Chunk Size (tokens)',
    accuracyPct: 'Accuracy %',
    avgScoreLabel: 'Avg. Confidence Score',
    optimumLabel: 'Optimum',
    chart6Title: 'Top-K Ablation Analysis',
    chart6Sub: 'Effect of retrieval depth on accuracy and latency (Chunk=350, GPT-4o-mini)',
    topkLabel: 'Top-K Value',
    selectedK: 'Selected K',
    // Model descriptions panel
    modelDesc: 'Model Descriptions',
    inProduction: 'In Production',
    baseline: 'Baseline',
    latencyUnit2: 's latency',
    explainUnit: '/5 explainability',
    casesUnit: '/ 40 cases',
    pros: 'Advantages',
    cons: 'Disadvantages',
    // Settings panel
    settingsTitle: 'Experiment Settings',
    refreshing: 'Updating Data...',
    refreshBtn: 'Refresh Results',
    recommended: 'Recommended Configuration',
    recommendedText: 'Based on benchmark results, Hybrid RAG + GPT-4o provides the best accuracy/speed balance (47.5% accuracy, 1.82s latency). Non-compliant article detection is a critical weakness across all models (0%) — priority target for future work.',
    costTitle: '40-Case Cost Comparison',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pipelineLabel(id: string) {
  const MAP: Record<string, string> = {
    'no-rag': 'No-RAG', bm25: 'BM25', dense: 'Dense',
    hybrid: 'Hybrid', multiquery: 'Multi-Q',
  };
  return MAP[id] ?? id;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RAGExperiments() {
  const { language } = useLanguage();
  const c = copy[language];

  const [models, setModels]           = useState<RagModel[]>([]);
  const [chunkData, setChunkData]     = useState<ChunkRow[]>([]);
  const [topkData, setTopkData]       = useState<TopkRow[]>([]);
  const [labelData, setLabelData]     = useState<LabelRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [visibleModels, setVisibleModels] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [exp, chunk, topk, labels] = await Promise.all([
        fetch(`${BASE}/api/experiments`,                { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BASE}/api/experiments/ablation/chunk`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BASE}/api/experiments/ablation/topk`,  { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BASE}/api/experiments/label-accuracy`, { headers: authHeaders() }).then(r => r.json()),
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

  const handleRefresh = () => { setIsRefreshing(true); fetchAll(); };

  // ── Derived data ──────────────────────────────────────────────────────────────

  const barData = models.map(m => ({
    name: pipelineLabel(m.id),
    'GPT-4o (%)': Math.round(m.f1 * 100 * 10) / 10,
    'GPT-4o-mini (%)': Math.round(m.accuracy_mini * 100 * 10) / 10,
    [c.chart1ConfLabel]: Math.round(m.precision * 100 * 10) / 10,
  }));

  const maxCost = Math.max(...models.map(m => m.cost_gpt4o)) || 1;
  const maxLat  = Math.max(...models.map(m => m.latency))    || 1;

  // Radar axes — use language-specific labels but map to consistent metric IDs
  const radarData = c.radarAxes.map((subject, idx) => {
    const entry: any = { subject };
    models.forEach(m => {
      if (idx === 0)      entry[m.name] = m.f1;
      else if (idx === 1) entry[m.name] = m.precision;
      else if (idx === 2) entry[m.name] = Math.max(0, (maxLat - m.latency) / maxLat);
      else if (idx === 3) entry[m.name] = m.explainability / 5;
      else if (idx === 4) entry[m.name] = 1 - m.cost_gpt4o / maxCost;
    });
    return entry;
  });

  const scatterData = models.map(m => ({ name: pipelineLabel(m.id), x: m.latency, y: m.f1 }));

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
    if (val >= 60) return 'bg-success text-white';
    if (val >= 20) return 'bg-warning text-white';
    if (val > 0)   return 'bg-orange-400 text-white';
    return 'bg-danger text-white';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="text-sm font-medium">{c.loading}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">{c.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{c.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm">
              <Play size={15} className="text-primary" />
              <span className="font-bold text-slate-800">{models.length}</span>
              <span className="text-slate-400">{c.pipelineUnit}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm">
              <Clock size={15} className="text-academic" />
              <span className="font-bold text-slate-800">{models[0]?.n ?? 40}</span>
              <span className="text-slate-400">{c.testUnit}</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Chart 1: Accuracy Comparison */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">{c.chart1Title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.chart1Sub}</p>
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

          {/* Chart 2: Radar */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">{c.chart2Title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.chart2Sub}</p>
            </div>
            <ResponsiveContainer width="100%" height="87%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                {models.filter(m => visibleModels.includes(m.id)).map((m, i) => (
                  <Radar key={m.id} name={m.name} dataKey={m.name}
                    stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.1} />
                ))}
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
                  onClick={e => {
                    const id = models.find(m => m.name === e.value)?.id;
                    if (id) setVisibleModels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                  }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Scatter */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">{c.chart3Title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.chart3Sub}</p>
            </div>
            <ResponsiveContainer width="100%" height="87%">
              <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="x" name={c.latencyLabel} unit="s" tick={{ fontSize: 10 }}
                  label={{ value: c.latencyLabel, position: 'bottom', fontSize: 10, dy: 14 }} />
                <YAxis type="number" dataKey="y" name="Accuracy" domain={[0.28, 0.52]}
                  tick={{ fontSize: 10 }} tickFormatter={v => `${(v*100).toFixed(0)}%`}
                  label={{ value: c.accuracyLabel, angle: -90, position: 'insideLeft', fontSize: 10, dx: -4 }} />
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

          {/* Chart 4: Heatmap */}
          <div className="card h-[400px] flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-medium">{c.chart4Title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.chart4Sub}</p>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="grid grid-cols-4 gap-2">
                <div />
                {c.heatmapCols.map(col => (
                  <div key={col} className="text-[10px] font-bold text-slate-500 text-center">{col}</div>
                ))}
              </div>
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

            <div className="mt-4 p-3 bg-danger/5 border border-danger/10 rounded-xl flex items-start gap-2">
              <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-600 leading-relaxed">
                <b className="text-danger">{c.criticalLabel}</b> {c.criticalText}
              </p>
            </div>

            <div className="mt-2 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 text-[10px] text-slate-500"><div className="w-3 h-3 bg-success rounded-sm" /> ≥60%</div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500"><div className="w-3 h-3 bg-warning rounded-sm" /> 20–60%</div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500"><div className="w-3 h-3 bg-danger rounded-sm" /> {'<'}20%</div>
            </div>
          </div>

          {/* Chart 5: Chunk Ablation */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">{c.chart5Title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.chart5Sub}</p>
            </div>
            <ResponsiveContainer width="100%" height="87%">
              <LineChart data={chunkData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="chunkSize" tick={{ fontSize: 10 }}
                  label={{ value: c.chunkSizeLabel, position: 'bottom', fontSize: 10, dy: 12 }} />
                <YAxis yAxisId="left"  domain={[35, 60]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis yAxisId="right" orientation="right" domain={[65, 90]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => [name === c.accuracyPct ? `${v}%` : v, name]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} />
                <ReferenceLine yAxisId="left" x={350} stroke="#7F77DD" strokeDasharray="4 4"
                  label={{ value: c.optimumLabel, position: 'top', fontSize: 9, fill: '#7F77DD' }} />
                <Line yAxisId="left"  type="monotone" dataKey="accuracy"  name={c.accuracyPct}
                  stroke="#7F77DD" strokeWidth={3} dot={{ r: 5, fill: '#7F77DD' }} activeDot={{ r: 7 }} />
                <Line yAxisId="right" type="monotone" dataKey="meanScore" name={c.avgScoreLabel}
                  stroke="#BA7517" strokeWidth={2} dot={{ r: 4, fill: '#BA7517' }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 6: Top-K Ablation */}
          <div className="card h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-medium">{c.chart6Title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.chart6Sub}</p>
            </div>
            <ResponsiveContainer width="100%" height="87%">
              <LineChart data={topkData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="topK" tick={{ fontSize: 10 }}
                  label={{ value: c.topkLabel, position: 'bottom', fontSize: 10, dy: 12 }} />
                <YAxis yAxisId="left"  domain={[45, 56]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis yAxisId="right" orientation="right" domain={[1.7, 2.2]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}s`} />
                <Tooltip formatter={(v: number, name: string) => [name === c.accuracyPct ? `${v}%` : `${v}s`, name]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} />
                <ReferenceLine yAxisId="left" x={5} stroke="#1D9E75" strokeDasharray="4 4"
                  label={{ value: c.selectedK, position: 'top', fontSize: 9, fill: '#1D9E75' }} />
                <Line yAxisId="left"  type="monotone" dataKey="accuracy" name={c.accuracyPct}
                  stroke="#1D9E75" strokeWidth={3} dot={{ r: 5, fill: '#1D9E75' }} activeDot={{ r: 7 }} />
                <Line yAxisId="right" type="monotone" dataKey="latency"  name={c.latencyUnit}
                  stroke="#E24B4A" strokeWidth={2} dot={{ r: 4, fill: '#E24B4A' }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Model Descriptions */}
        <div className="card">
          <h3 className="text-lg font-medium mb-6">{c.modelDesc}</h3>
          <div className="space-y-2">
            {models.map((model, i) => (
              <div key={model.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-medium text-sm">{model.name}</span>
                    <span className="status-pill bg-academic/10 text-academic text-[10px]">
                      {model.id === 'hybrid' ? c.inProduction : model.id === 'no-rag' ? c.baseline : model.category}
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
                        <div className="flex items-center gap-1 text-xs text-slate-500"><Zap size={13} className="text-warning" /> {model.latency}s {c.latencyUnit2}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500"><Eye size={13} className="text-primary" /> {model.explainability}{c.explainUnit}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500"><DollarSign size={13} className="text-success" /> ${model.cost_gpt4o} {c.casesUnit}</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-success uppercase mb-2">{c.pros}</p>
                      <ul className="text-xs text-slate-600 space-y-1">{model.pros.map((p, j) => <li key={j}>• {p}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-danger uppercase mb-2">{c.cons}</p>
                      <ul className="text-xs text-slate-600 space-y-1">{model.cons.map((p, j) => <li key={j}>• {p}</li>)}</ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

    </div>
  );
}
