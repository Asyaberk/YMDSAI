import React, { useState } from 'react';
import { 
  Users, 
  Library, 
  FilePlus, 
  Trash2, 
  Settings, 
  Search, 
  MoreVertical,
  CheckCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'mevzuat' | 'kullanicilar' | 'sistem'>('mevzuat');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const yokDocuments = [
    { id: 'yok1', title: 'Yükseköğretim Kanunu (2547)', version: '2024.1', status: 'Aktif', lastUpdate: '2025-01-10' },
    { id: 'yok2', title: 'Öğrenci Disiplin Yönetmeliği', version: '2.4', status: 'Aktif', lastUpdate: '2025-02-15' },
    { id: 'yok3', title: 'Lisansüstü Eğitim Çerçeve Yönetmeliği', version: '1.8', status: 'Aktif', lastUpdate: '2024-12-05' },
    { id: 'yok4', title: 'Yatırım ve Bütçe Uygulama Esasları', version: '2025.1', status: 'Taslak', lastUpdate: '2025-04-20' },
  ];

  const users = [
    { name: 'Dr. Ahmet Öz', email: 'ahmet@universite.edu.tr', role: 'ADMIN', lastSeen: '1 saat önce' },
    { name: 'Ayşe Yılmaz', email: 'ayse@universite.edu.tr', role: 'USER', lastSeen: '3 gün önce' },
    { name: 'Mehmet Demir', email: 'metmet@universite.edu.tr', role: 'USER', lastSeen: 'Az önce' },
    { name: 'Zeynep Kaya', email: 'zeynep@universite.edu.tr', role: 'USER', lastSeen: '1 hafta önce' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[100] px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium"
          >
            <CheckCircle2 size={18} className="text-success" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Yönetim Paneli</h1>
          <p className="text-slate-500">Referans mevzuatları ve sistem kullanıcılarını buradan yönetebilirsiniz.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => showNotification('Sistem ayarları yükleniyor...')}
             className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all"
           >
             <Settings size={18} /> Sistem Ayarları
           </button>
           <button 
             onClick={() => showNotification('Yeni mevzuat yükleme sihirbazı başlatılıyor...')}
             className="btn-primary flex items-center gap-2"
           >
             <FilePlus size={18} /> Yeni Mevzuat Ekle
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('mevzuat')}
          className={`px-8 py-4 text-sm font-medium transition-all relative ${activeTab === 'mevzuat' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
        >
           Referans Mevzuatlar
        </button>
        <button 
          onClick={() => setActiveTab('kullanicilar')}
          className={`px-8 py-4 text-sm font-medium transition-all relative ${activeTab === 'kullanicilar' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
        >
           Kullanıcı Yönetimi
        </button>
        <button 
          onClick={() => setActiveTab('sistem')}
          className={`px-8 py-4 text-sm font-medium transition-all relative ${activeTab === 'sistem' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
        >
           Sistem Logları
        </button>
      </div>

      {activeTab === 'mevzuat' && (
        <div className="grid grid-cols-1 gap-6">
           <div className="card space-y-6">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Referans belge ara..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-sm" />
                 </div>
                 <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Bütün endeksler güncel
                 </div>
              </div>

              <div className="overflow-hidden border border-gray-100 rounded-xl">
                 <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-slate-500 text-left">
                       <tr>
                          <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Mevzuat Adı</th>
                          <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Versiyon</th>
                          <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Durum</th>
                          <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Son Güncelleme</th>
                          <th className="px-6 py-4"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {yokDocuments.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50 transition-all group">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <Library size={20} className="text-primary" />
                                   <span className="font-medium text-slate-700">{doc.title}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-slate-500 font-mono text-xs">{doc.version}</td>
                             <td className="px-6 py-4">
                                <span className={`status-pill ${doc.status === 'Aktif' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                   {doc.status}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-slate-500">{doc.lastUpdate}</td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                   <button 
                                     onClick={() => showNotification(`${doc.title} dış bağlantısı açılıyor...`)}
                                     className="p-2 text-slate-400 hover:text-primary transition-all rounded-lg hover:bg-white"
                                   ><ExternalLink size={18} /></button>
                                   <button 
                                     onClick={() => showNotification(`${doc.title} referans listesinden kaldırıldı.`)}
                                     className="p-2 text-slate-400 hover:text-danger transition-all rounded-lg hover:bg-white"
                                   ><Trash2 size={18} /></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'kullanicilar' && (
        <div className="card space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="font-medium">Yetkili Kullanıcılar</h3>
              <button className="text-primary text-sm font-medium hover:underline">+ Yeni Kullanıcı Davet Et</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((user, i) => (
                 <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:shadow-sm transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                          {user.name.charAt(0)}
                       </div>
                       <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${user.role === 'ADMIN' ? 'bg-academic/10 text-academic' : 'bg-slate-100 text-slate-500'}`}>
                          {user.role}
                       </span>
                       <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'sistem' && (
        <div className="card space-y-6">
           <h3 className="font-medium mb-4">Sistem Aktivite Logları</h3>
           <div className="space-y-4">
              {[
                { icon: Clock, title: "Yeni mevzuat yüklendi: Lisansüstü Çerçeve Yönetmeliği", user: "Admin", time: "2 saat önce" },
                { icon: CheckCircle, title: "Mevzuat analizi tamamlandı: Akademik_Tesvik_Taslagi.pdf", user: "Dr. Ahmet", time: "12 saat önce" },
                { icon: ShieldAlert, title: "Yetkisiz erişim denemesi tespit edildi", user: "Sistem", time: "1 gün önce" },
              ].map((log, i) => (
                <div key={i} className="flex gap-4 p-4 hover:bg-slate-50 rounded-xl transition-all border-b border-gray-50 last:border-0">
                   <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-slate-400 shrink-0">
                      <log.icon size={16} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700">{log.title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                         <span>{log.user}</span>
                         <span>•</span>
                         <span>{log.time}</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
