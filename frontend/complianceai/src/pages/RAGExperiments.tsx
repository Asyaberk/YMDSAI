import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  LabelList,
  Cell
} from 'recharts';
import { 
  Settings, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Trophy,
  Zap,
  Clock,
  Eye
} from 'lucide-react';
import { ragModels } from '../mockData';

export default function RAGExperiments() {
  const [models, setModels] = useState(ragModels);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [visibleModels, setVisibleModels] = useState<string[]>(ragModels.map(m => m.id));

  const categories = ['Akademik', 'İdari', 'Mali', 'Disiplin', 'Lisansüstü', 'Yurt Dışı'];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setModels(prev => prev.map(m => ({
        ...m,
        f1: Math.min(0.98, Math.max(0.75, m.f1 + (Math.random() * 0.04 - 0.02))),
        precision: Math.min(0.98, Math.max(0.75, m.precision + (Math.random() * 0.04 - 0.02))),
        recall: Math.min(0.98, Math.max(0.75, m.recall + (Math.random() * 0.04 - 0.02))),
      })));
      setIsRefreshing(false);
    }, 2000);
  };

  const radarData = [
    { subject: 'F1 Score', fullMark: 1 },
    { subject: 'Precision', fullMark: 1 },
    { subject: 'Recall', fullMark: 1 },
    { subject: 'Speed', fullMark: 1 },
    { subject: 'Explainability', fullMark: 5 },
  ].map(axis => {
    const entry: any = { subject: axis.subject };
    models.forEach(m => {
      if (axis.subject === 'Speed') {
        entry[m.name] = (4 - m.latency) / 4; // Normalized speed
      } else if (axis.subject === 'Explainability') {
        entry[m.name] = m.explainability;
      } else {
        entry[m.name] = m[axis.subject.toLowerCase() as keyof typeof m];
      }
    });
    return entry;
  });

  const scatterData = models.map(m => ({
    name: m.name,
    x: m.latency,
    y: m.f1,
    category: m.category
  }));

  const getHeatmapColor = (modelIdx: number, catIdx: number) => {
    const base = models[modelIdx].f1;
    const offset = (modelIdx * catIdx * 0.01) % 0.1;
    const score = base - offset;
    if (score > 0.88) return 'bg-success text-white';
    if (score > 0.82) return 'bg-warning text-white';
    return 'bg-danger text-white';
  };

  return (
    <div className="flex gap-8">
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium">RAG Karşılaştırma Deneyleri</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            <Clock size={14} />
            Son Güncelleme: Az Önce
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Grouped Bar Chart */}
          <div className="card h-[400px]">
            <h3 className="text-sm font-medium mb-6">Model Performans Karşılaştırması</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={models}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                <Bar dataKey="precision" name="Precision" fill="#185FA5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recall" name="Recall" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                <Bar dataKey="f1" name="F1 Score" fill="#7F77DD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Radar Chart */}
          <div className="card h-[400px]">
            <h3 className="text-sm font-medium mb-6">Çok Boyutlu Model Analizi</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                {models.filter(m => visibleModels.includes(m.id)).map((m, i) => (
                  <Radar
                    key={m.id}
                    name={m.name}
                    dataKey={m.name}
                    stroke={['#185FA5', '#1D9E75', '#BA7517', '#E24B4A', '#7F77DD', '#64748b', '#000'][i % 7]}
                    fill={['#185FA5', '#1D9E75', '#BA7517', '#E24B4A', '#7F77DD', '#64748b', '#000'][i % 7]}
                    fillOpacity={0.1}
                  />
                ))}
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                  onClick={(e) => {
                    const id = models.find(m => m.name === e.value)?.id;
                    if (id) {
                      setVisibleModels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                    }
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Scatter Plot */}
          <div className="card h-[400px]">
            <h3 className="text-sm font-medium mb-6">Hız-Doğruluk Dengesi (Trade-off)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="x" name="Latency" unit="s" label={{ value: 'Gecikme (sn)', position: 'bottom', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="F1 Score" domain={[0.7, 1]} label={{ value: 'F1 Skoru', angle: -90, position: 'left', fontSize: 10 }} />
                <ZAxis type="number" range={[100, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                {/* Ideal Zone */}
                <rect x={0} y={0.85} width={1.5} height={0.15} fill="#1D9E75" fillOpacity={0.05} />
                <text x={10} y={40} fontSize={10} fill="#1D9E75" fontWeight="500">İdeal Bölge</text>
                
                <Scatter name="Models" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.category === 'Simple' ? '#94a3b8' : entry.category === 'Medium' ? '#185FA5' : '#7F77DD'} 
                    />
                  ))}
                  <LabelList dataKey="name" position="top" style={{ fontSize: '10px', fill: '#64748b' }} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4: Heatmap */}
          <div className="card h-[400px] flex flex-col">
            <h3 className="text-sm font-medium mb-6">Kategori × Model Performans Haritası</h3>
            <div className="flex-1 grid grid-cols-7 grid-rows-8 gap-1">
              {/* Header Row */}
              <div />
              {categories.map(cat => (
                <div key={cat} className="text-[9px] font-medium text-slate-500 flex items-center justify-center text-center leading-tight">
                  {cat}
                </div>
              ))}
              
              {/* Data Rows */}
              {models.map((model, mIdx) => (
                <React.Fragment key={model.id}>
                  <div className="text-[9px] font-medium text-slate-700 flex items-center pr-2">
                    {model.name}
                  </div>
                  {categories.map((_, cIdx) => (
                    <div 
                      key={cIdx} 
                      className={`rounded-sm flex items-center justify-center text-[10px] font-bold ${getHeatmapColor(mIdx, cIdx)}`}
                    >
                      {(model.f1 - (mIdx * cIdx * 0.01) % 0.1).toFixed(2)}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <div className="w-3 h-3 bg-success rounded-sm" /> Yüksek
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <div className="w-3 h-3 bg-warning rounded-sm" /> Orta
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <div className="w-3 h-3 bg-danger rounded-sm" /> Düşük
              </div>
            </div>
          </div>
        </div>

        {/* Model Descriptions */}
        <div className="card">
          <h3 className="text-lg font-medium mb-6">Model Açıklamaları</h3>
          <div className="space-y-2">
            {models.map((model) => (
              <div key={model.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <button 
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-sm">{model.name}</span>
                    <span className="status-pill bg-academic/10 text-academic text-[10px]">
                      {model.id === 'crag' ? 'En İyi Doğruluk' : model.id === 'vanilla' ? 'En Hızlı' : 'Dengeli'}
                    </span>
                  </div>
                  {expandedModel === model.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expandedModel === model.id && (
                  <div className="p-4 bg-slate-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                    <div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">{model.description}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Zap size={14} className="text-warning" />
                          Latency: {model.latency}s
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Eye size={14} className="text-primary" />
                          Explainability: {model.explainability}/5
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-success uppercase mb-2">Avantajlar</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {model.pros.map((p, i) => <li key={i}>• {p}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-danger uppercase mb-2">Dezavantajlar</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {model.cons.map((p, i) => <li key={i}>• {p}</li>)}
                        </ul>
                      </div>
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
              <input type="range" min="0.5" max="0.95" step="0.05" defaultValue="0.75" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-600">Embedding Model</label>
              <select 
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
                defaultValue="SBERT all-mpnet-base-v2"
              >
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
              <input type="range" min="1" max="10" step="1" defaultValue="5" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-600">LLM Selector</label>
              <select 
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
                defaultValue="GPT-4o"
              >
                <option>GPT-4o</option>
                <option>LLaMA-2</option>
                <option>Mistral-7B</option>
              </select>
            </div>

            <button 
              className={`w-full btn-primary py-3 flex items-center justify-center gap-2 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
              Yeniden Çalıştır
            </button>
          </div>

          <div className="mt-8 p-4 bg-academic/5 rounded-xl border border-academic/10">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={16} className="text-academic" />
              <p className="text-xs font-bold text-academic uppercase">Önerilen Yapılandırma</p>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Hukuki metin analizi için <b>CRAG + GPT-4o</b> kombinasyonu, en yüksek doğruluk ve açıklanabilirlik skorlarını sağlamaktadır.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
