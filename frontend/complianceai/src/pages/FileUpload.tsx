import React, { useState } from 'react';
import { Upload, FileText, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { mockDocuments } from '../mockData';

export default function FileUpload() {
  const [files, setFiles] = useState<{ name: string; category: string; status: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const handleFileSelect = () => {
    // Simulate file selection
    const mockFile = {
      name: 'Yüksek_Lisans_Mezuniyet_Sartlari_2025.pdf',
      category: 'Lisansüstü',
      status: 'Bekliyor'
    };
    setFiles([...files, mockFile]);
  };

  const startAnalysis = () => {
    if (files.length === 0) return;
    
    setIsAnalyzing(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-medium">Belge Yükleme Merkezi</h1>
        <p className="text-slate-500">Analiz edilecek üniversite yönetmeliklerini PDF formatında yükleyin.</p>
      </div>

      {/* Upload Zone */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
        onClick={handleFileSelect}
      >
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
          <Upload size={32} />
        </div>
        <div className="text-center">
          <p className="font-medium text-lg">Dosyaları sürükleyin veya tıklayın</p>
          <p className="text-sm text-slate-400">Sadece PDF dosyaları (Maks. 10MB)</p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-gray-100">
                <th className="text-left pb-4 font-medium">Dosya Adı</th>
                <th className="text-left pb-4 font-medium">Kategori</th>
                <th className="text-left pb-4 font-medium">Durum</th>
                <th className="text-right pb-4 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-4 flex items-center gap-3">
                    <FileText size={18} className="text-primary" />
                    <span className="font-medium">{file.name}</span>
                  </td>
                  <td className="py-4">
                    <select 
                      className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-primary"
                      defaultValue="Lisansüstü"
                    >
                      <option>Akademik</option>
                      <option>İdari</option>
                      <option>Mali</option>
                      <option>Disiplin</option>
                      <option>Lisansüstü</option>
                    </select>
                  </td>
                  <td className="py-4">
                    <span className="status-pill bg-gray-100 text-slate-500">{file.status}</span>
                  </td>
                  <td className="py-4 text-right">
                    <button 
                      className="text-slate-400 hover:text-danger transition-colors"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 flex flex-col items-center gap-4">
            {isAnalyzing ? (
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-xs font-medium text-primary">
                  <span>Analiz Ediliyor...</span>
                  <span>%{progress}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-100" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button 
                className="btn-primary px-12 py-3 flex items-center gap-2"
                onClick={startAnalysis}
              >
                Analizi Başlat
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-success text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 size={24} />
          <div>
            <p className="font-medium">Analiz tamamlandı</p>
            <p className="text-xs opacity-90">3 uyumsuz madde bulundu.</p>
          </div>
        </div>
      )}
    </div>
  );
}
