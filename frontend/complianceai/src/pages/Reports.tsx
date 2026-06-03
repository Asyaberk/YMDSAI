import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  Plus,
  CheckSquare,
  X,
  Loader2,
  Check,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('ca_token') ?? ''}` });

interface Summary {
  totalDocuments: number;
  avgComplianceScore: number;
  byStatus: { Uyumlu: number; 'Kısmen Uyumlu': number; Uyumsuz: number };
  trend: { month: string; avgScore: number; uyumlu: number; kismen: number; uyumsuz: number; count: number }[];
  topProblems: { title: string; count: number }[];
}

interface DocRow {
  id: string;
  name: string;
  category: string;
  complianceScore: number;
  status: string;
  uploadDate: string;
  articleCount: number;
  uyumlu: number;
  kismen: number;
  uyumsuz: number;
  kapsamDisi: number;
}

function statusBadge(s: string) {
  if (s === 'Uyumlu') return 'bg-success/10 text-success';
  if (s === 'Kısmen Uyumlu') return 'bg-warning/10 text-warning';
  return 'bg-danger/10 text-danger';
}

export default function Reports() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState<string | null>(null);

  useEffect(() => {
    const headers = authHeaders();
    Promise.all([
      fetch(`${BASE}/api/reports/summary`, { headers }).then(r => r.json()),
      fetch(`${BASE}/api/reports/documents`, { headers }).then(r => r.json()),
    ])
      .then(([sum, docList]) => {
        setSummary(sum);
        setDocs(Array.isArray(docList) ? docList : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const simulateDownload = (name: string) => {
    setIsDownloaded(name);
    setTimeout(() => setIsDownloaded(null), 3000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="text-sm font-medium">Raporlar yükleniyor...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Raporlar ve Analitik</h1>
          <p className="text-slate-500 text-sm mt-1">YÖK uyum sürecinizdeki ilerlemeyi takip edin.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Rapor Oluştur
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Toplam Belge',      value: summary.totalDocuments,          icon: FileText,      color: 'text-slate-700',   bg: 'bg-slate-100' },
            { label: 'Ort. Uyum Skoru',   value: `%${summary.avgComplianceScore}`, icon: TrendingUp,    color: 'text-primary',      bg: 'bg-primary/10' },
            { label: 'Uyumlu Belge',      value: summary.byStatus['Uyumlu'],      icon: CheckCircle2,  color: 'text-success',      bg: 'bg-success/10' },
            { label: 'Uyumsuz Belge',     value: summary.byStatus['Uyumsuz'],     icon: AlertTriangle, color: 'text-danger',       bg: 'bg-danger/10' },
          ].map((s, i) => (
            <div key={i} className="card flex items-center gap-4 py-5">
              <div className={`w-11 h-11 ${s.bg} ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
                <s.icon size={20} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trend Chart */}
      <div className="card">
        <h3 className="text-sm font-medium mb-6 flex items-center gap-2">
          <BarChart3 size={16} className="text-primary" />
          Madde Bazlı Uyum Dağılımı (Aylık)
        </h3>
        {summary && summary.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={summary.trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                formatter={(v: number, name: string) => [`%${v}`, name]}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="uyumlu"  name="Uyumlu %"        stroke="#1D9E75" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="kismen"  name="Kısmen Uyumlu %" stroke="#BA7517" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="uyumsuz" name="Uyumsuz %"        stroke="#E24B4A" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Grafik için en az bir belge analizi gerekiyor.
          </div>
        )}
      </div>

      {/* Top Problems */}
      {summary && summary.topProblems.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium mb-5 flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" />
            En Sorunlu Maddeler
          </h3>
          <div className="space-y-3">
            {summary.topProblems.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{p.title}</span>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">{p.count}x</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warning rounded-full transition-all"
                      style={{ width: `${Math.min(100, p.count * 20)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="card">
        <h3 className="text-sm font-medium mb-6 flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          Analiz Edilen Belgeler
        </h3>
        {docs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Henüz analiz edilmiş belge yok. Bir belge yükleyerek başlayın.
          </div>
        ) : (
          <div className="overflow-hidden border border-gray-100 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-slate-500 text-left">
                <tr>
                  <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Belge</th>
                  <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Kategori</th>
                  <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Uyum Skoru</th>
                  <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Maddeler</th>
                  <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Tarih</th>
                  <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Durum</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 max-w-[180px] truncate">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{doc.category}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${doc.complianceScore > 80 ? 'bg-success' : doc.complianceScore > 60 ? 'bg-warning' : 'bg-danger'}`}
                            style={{ width: `${doc.complianceScore}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${doc.complianceScore > 80 ? 'text-success' : doc.complianceScore > 60 ? 'text-warning' : 'text-danger'}`}>
                          %{doc.complianceScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="text-success">{doc.uyumlu}✓</span>
                        <span className="text-warning">{doc.kismen}~</span>
                        <span className="text-danger">{doc.uyumsuz}✗</span>
                        {doc.kapsamDisi > 0 && <span className="text-slate-400">{doc.kapsamDisi}−</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{doc.uploadDate}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => simulateDownload(doc.name)}
                        className={`p-2 rounded-lg transition-all ${isDownloaded === doc.name ? 'bg-success text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-primary'}`}
                      >
                        {isDownloaded === doc.name ? <Check size={16} /> : <Download size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Report Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-medium">Yeni Rapor Oluştur</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Rapor Adı</label>
                <input type="text" placeholder="Örn: Haziran 2026 Uyum Analizi" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">Başlangıç Tarihi</label>
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">Bitiş Tarihi</label>
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-600">Kapsam (Bölümler)</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Özet', 'Madde Detayı', 'RAG Karşılaştırma', 'Öneriler'].map(sec => (
                    <label key={sec} className="flex items-center gap-2 cursor-pointer group">
                      <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center group-hover:border-primary transition-all">
                        <CheckSquare size={12} className="text-primary opacity-0 group-hover:opacity-100" />
                      </div>
                      <span className="text-xs text-slate-600">{sec}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Format</label>
                <div className="flex gap-3">
                  {['PDF', 'Excel', 'JSON'].map(fmt => (
                    <button key={fmt} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium hover:border-primary hover:text-primary transition-all">{fmt}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button className="flex-1 py-2 text-sm font-medium text-slate-600 hover:text-slate-800" onClick={() => setShowModal(false)}>İptal</button>
              <button
                className="flex-1 btn-primary py-2 flex items-center justify-center gap-2"
                onClick={() => { setIsGenerating(true); setTimeout(() => { setIsGenerating(false); setShowModal(false); }, 2000); }}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
