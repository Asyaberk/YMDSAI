import React, { useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { 
  ChevronDown, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  Cpu,
  Zap
} from 'lucide-react';
import { mockDocuments, mockArticles } from '../mockData';

export default function ComplianceAnalysis() {
  const [selectedDoc, setSelectedDoc] = useState(mockDocuments[2]); // Default to Lisansüstü
  const [activeTab, setActiveTab] = useState<'Özet' | 'Madde Detayı' | 'YÖK Karşılaştırması'>('Özet');
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const pieData = [
    { name: 'Uyumlu', value: 68, color: '#1D9E75' },
    { name: 'Kısmen Uyumlu', value: 19, color: '#BA7517' },
    { name: 'Uyumsuz', value: 13, color: '#E24B4A' },
  ];

  return (
    <div className="space-y-8">
      {/* Document Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Uyumluluk Analizi</h1>
        <div className="relative">
          <select 
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium outline-none focus:border-primary shadow-sm"
            value={selectedDoc.id}
            onChange={(e) => setSelectedDoc(mockDocuments.find(d => d.id === e.target.value)!)}
          >
            {mockDocuments.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['Özet', 'Madde Detayı', 'YÖK Karşılaştırması'].map((tab) => (
          <button
            key={tab}
            className={`px-6 py-3 text-sm font-medium transition-all relative ${
              activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab(tab as any)}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'Özet' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 card flex flex-col items-center justify-center py-12">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-8 mt-8">
                {pieData.map((item) => (
                  <div key={item.name} className="text-center">
                    <p className="text-2xl font-medium" style={{ color: item.color }}>%{item.value}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="card bg-slate-50 border-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-academic/10 text-academic rounded-lg flex items-center justify-center">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Kullanılan Model</p>
                    <p className="font-medium">CRAG (Corrective RAG)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 text-success rounded-lg flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Ortalama Benzerlik</p>
                    <p className="font-medium">0.91 Cosine Similarity</p>
                  </div>
                </div>
              </div>
              
              <div className="card border-danger/20 bg-danger/5">
                <h3 className="text-sm font-medium text-danger mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Kritik Bulgular
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  İncelenen belgede 3 madde YÖK çerçeve yönetmeliği ile doğrudan çelişmektedir. 
                  Özellikle "Disiplin Süreleri" ve "Mali Paylar" bölümlerinde hukuki risk tespit edilmiştir.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Madde Detayı' && (
          <div className="space-y-4">
            {mockArticles.map((article) => (
              <div key={article.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full ${
                      article.status === 'Uyumlu' ? 'bg-success' : 
                      article.status === 'Kısmen Uyumlu' ? 'bg-warning' : 'bg-danger'
                    }`} />
                    <div>
                      <h3 className="font-medium">{article.number}: {article.title}</h3>
                      <p className="text-xs text-slate-500">Benzerlik Skoru: {article.similarity}</p>
                    </div>
                  </div>
                  <span className={`status-pill ${
                    article.status === 'Uyumlu' ? 'bg-success/10 text-success' : 
                    article.status === 'Kısmen Uyumlu' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                  }`}>
                    {article.status}
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic mb-4">
                  "{article.text}"
                </p>

                <div className="flex items-center gap-2 text-xs text-primary font-medium mb-4">
                  <Info size={14} />
                  <span>Referans: {article.yokReference}</span>
                </div>

                <button 
                  className="text-xs font-medium text-slate-500 flex items-center gap-1 hover:text-primary transition-colors"
                  onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
                >
                  {expandedArticle === article.id ? 'Akıl Yürütmeyi Gizle' : 'CoT Akıl Yürütmeyi Göster'}
                  <ChevronDown size={14} className={expandedArticle === article.id ? 'rotate-180' : ''} />
                </button>

                {expandedArticle === article.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs font-medium text-slate-700 mb-3">Zincirleme Akıl Yürütme (Chain-of-Thought):</p>
                    <ol className="space-y-3">
                      {article.reasoning.map((step, idx) => (
                        <li key={idx} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                          <span className="flex-shrink-0 w-5 h-5 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'YÖK Karşılaştırması' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Üniversite Mevzuat Metni</p>
                <div className="card h-64 overflow-y-auto text-sm leading-relaxed text-slate-700">
                  {mockArticles[0].text}
                  <p className="mt-4 text-danger bg-danger/5 p-2 rounded border border-danger/10">
                    Hata Tespit Edilen Kısım: "...3 iş günü süre verilir."
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">İlgili YÖK Kanun Maddesi</p>
                <div className="card h-64 overflow-y-auto text-sm leading-relaxed text-slate-700 border-success/20">
                  {mockArticles[0].yokText}
                  <p className="mt-4 text-success bg-success/5 p-2 rounded border border-success/10">
                    Doğru Uygulama: "...yedi günden az olmamak üzere..."
                  </p>
                </div>
              </div>
            </div>

            <div className="card bg-primary/5 border-primary/20">
              <h3 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} />
                Önerilen Düzeltme
              </h3>
              <div className="bg-white border border-primary/10 rounded-lg p-4 text-sm text-slate-700 leading-relaxed shadow-sm">
                {mockArticles[0].suggestion}
              </div>
              <button className="mt-4 btn-primary text-xs py-2 px-4 flex items-center gap-2">
                Düzeltmeyi Uygula ve Taslağı Güncelle
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
