import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  FileText, 
  Plus, 
  Calendar, 
  CheckSquare, 
  X,
  Loader2,
  Check
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { trendData } from '../mockData';

export default function Reports() {
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState<string | null>(null);

  const previousReports = [
    { name: 'Mart 2025 Genel Uyumluluk Raporu', date: '2025-03-31', scope: 'Tüm Birimler', format: 'PDF' },
    { name: 'Disiplin Yönetmeliği Analiz Sonuçları', date: '2025-04-02', scope: 'Hukuk Müşavirliği', format: 'Excel' },
    { name: 'Lisansüstü Eğitim Revizyon Önerileri', date: '2025-03-15', scope: 'Enstitü', format: 'PDF' },
    { name: 'Mali Mevzuat Risk Analizi', date: '2025-04-05', scope: 'Strateji Geliştirme', format: 'JSON' },
    { name: 'YÖK 2025 Mevzuat Uyum Özeti', date: '2025-02-28', scope: 'Rektörlük', format: 'PDF' },
  ];

  const handleCreateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowModal(false);
      // Show success toast or update list
    }, 2000);
  };

  const simulateDownload = (name: string) => {
    setIsDownloaded(name);
    setTimeout(() => setIsDownloaded(null), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Raporlar ve Analitik</h1>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus size={20} />
          Rapor Oluştur
        </button>
      </div>

      {/* Trend Chart */}
      <div className="card h-[400px]">
        <h3 className="text-sm font-medium mb-6">Uyumluluk Trendi (Son 6 Ay)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Line type="monotone" dataKey="uyumlu" name="Uyumlu %" stroke="#1D9E75" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="kismen" name="Kısmen %" stroke="#BA7517" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="uyumsuz" name="Uyumsuz %" stroke="#E24B4A" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Previous Reports Table */}
      <div className="card">
        <h3 className="text-sm font-medium mb-6">Geçmiş Raporlar</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 border-b border-gray-100">
              <th className="text-left pb-4 font-medium">Rapor Adı</th>
              <th className="text-left pb-4 font-medium">Tarih</th>
              <th className="text-left pb-4 font-medium">Kapsam</th>
              <th className="text-left pb-4 font-medium">Format</th>
              <th className="text-right pb-4 font-medium">İndir</th>
            </tr>
          </thead>
          <tbody>
            {previousReports.map((report, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-slate-400" />
                    <span className="font-medium">{report.name}</span>
                  </div>
                </td>
                <td className="py-4 text-slate-500">{report.date}</td>
                <td className="py-4 text-slate-500">{report.scope}</td>
                <td className="py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    report.format === 'PDF' ? 'bg-danger/10 text-danger' : 
                    report.format === 'Excel' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                  }`}>
                    {report.format}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button 
                    className={`p-2 rounded-lg transition-all ${
                      isDownloaded === report.name ? 'bg-success text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-primary'
                    }`}
                    onClick={() => simulateDownload(report.name)}
                  >
                    {isDownloaded === report.name ? <Check size={18} /> : <Download size={18} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Report Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-medium">Yeni Rapor Oluştur</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Rapor Adı</label>
                <input type="text" placeholder="Örn: Nisan 2025 Analizi" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">Başlangıç Tarihi</label>
                  <div className="relative">
                    <input type="date" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">Bitiş Tarihi</label>
                  <div className="relative">
                    <input type="date" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary" />
                  </div>
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
                    <button key={fmt} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium hover:border-primary hover:text-primary transition-all">
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button 
                className="flex-1 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                onClick={() => setShowModal(false)}
              >
                İptal
              </button>
              <button 
                className="flex-1 btn-primary py-2 flex items-center justify-center gap-2"
                onClick={handleCreateReport}
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
