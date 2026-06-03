import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  FileText,
  Trash2,
  Search,
  MoreVertical,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  X,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('ca_token') ?? ''}`,
  'Content-Type': 'application/json',
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminDoc {
  id: string;
  name: string;
  category: string;
  complianceScore: number;
  status: string;
  uploadDate: string;
  uploaderEmail: string;
  uploaderName: string;
  articleCount: number;
  uyumlu: number;
  kismen: number;
  uyumsuz: number;
  kapsamDisi: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  documentCount: number;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(n: number) {
  return n > 80 ? 'text-success' : n > 60 ? 'text-warning' : 'text-danger';
}
function scoreBar(n: number) {
  return n > 80 ? 'bg-success' : n > 60 ? 'bg-warning' : 'bg-danger';
}
function statusBadge(s: string) {
  if (s === 'Uyumlu') return 'bg-success/10 text-success';
  if (s === 'Kısmen Uyumlu') return 'bg-warning/10 text-warning';
  return 'bg-danger/10 text-danger';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'belgeler' | 'kullanicilar'>('belgeler');
  const [notification, setNotification] = useState<string | null>(null);

  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [docSearch, setDocSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'doc' | 'user'; id: string; name: string } | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchDocs = useCallback(() => {
    setLoadingDocs(true);
    fetch(`${BASE}/api/admin/documents`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoadingDocs(false));
  }, []);

  const fetchUsers = useCallback(() => {
    setLoadingUsers(true);
    fetch(`${BASE}/api/admin/users`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => { fetchDocs(); fetchUsers(); }, [fetchDocs, fetchUsers]);

  // ── Delete handlers ───────────────────────────────────────────────────────────

  const deleteDoc = async (id: string, name: string) => {
    const res = await fetch(`${BASE}/api/admin/documents/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== id));
      showNotification(`"${name}" silindi.`);
    } else {
      showNotification('Silme işlemi başarısız.');
    }
    setConfirmDelete(null);
  };

  const deleteUser = async (id: string, name: string) => {
    const res = await fetch(`${BASE}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id));
      showNotification(`"${name}" kullanıcısı silindi.`);
    } else {
      showNotification('Silme işlemi başarısız.');
    }
    setConfirmDelete(null);
  };

  // ── Filtered lists ────────────────────────────────────────────────────────────

  const filteredDocs = docs.filter(d =>
    d.name.toLowerCase().includes(docSearch.toLowerCase()) ||
    d.uploaderEmail.toLowerCase().includes(docSearch.toLowerCase()) ||
    d.category.toLowerCase().includes(docSearch.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* Toast notification */}
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

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-danger/10 text-danger rounded-xl flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Silmek istediğinize emin misiniz?</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{confirmDelete.name}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  onClick={() => setConfirmDelete(null)}
                >
                  İptal
                </button>
                <button
                  className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-bold hover:bg-danger/90 transition-all"
                  onClick={() =>
                    confirmDelete.type === 'doc'
                      ? deleteDoc(confirmDelete.id, confirmDelete.name)
                      : deleteUser(confirmDelete.id, confirmDelete.name)
                  }
                >
                  Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Yönetim Paneli</h1>
          <p className="text-slate-500 text-sm mt-1">
            Sisteme yüklenen belgeler ve kullanıcıları buradan yönetin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm">
            <FileText size={15} className="text-primary" />
            <span className="font-bold text-slate-800">{docs.length}</span>
            <span className="text-slate-400">belge</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm">
            <Users size={15} className="text-academic" />
            <span className="font-bold text-slate-800">{users.length}</span>
            <span className="text-slate-400">kullanıcı</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('belgeler')}
          className={`px-8 py-4 text-sm font-medium transition-all relative ${activeTab === 'belgeler' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className="flex items-center gap-2">
            <FileText size={15} /> Yüklenen Belgeler
            {docs.length > 0 && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">{docs.length}</span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('kullanicilar')}
          className={`px-8 py-4 text-sm font-medium transition-all relative ${activeTab === 'kullanicilar' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className="flex items-center gap-2">
            <Users size={15} /> Kullanıcı Yönetimi
            {users.length > 0 && (
              <span className="px-1.5 py-0.5 bg-academic/10 text-academic text-[10px] font-bold rounded-full">{users.length}</span>
            )}
          </span>
        </button>
      </div>

      {/* ── Tab: Belgeler ── */}
      {activeTab === 'belgeler' && (
        <div className="card space-y-5">
          {/* Search bar */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Belge adı, e-posta veya kategori ara..."
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-primary transition-all text-sm"
              />
            </div>
            <p className="text-xs text-slate-400 font-medium shrink-0">
              {filteredDocs.length} / {docs.length} belge
            </p>
          </div>

          {loadingDocs ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-sm">
              {docs.length === 0 ? 'Henüz belge yüklenmemiş.' : 'Aramanızla eşleşen belge yok.'}
            </div>
          ) : (
            <div className="overflow-hidden border border-gray-100 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Belge Adı</th>
                    <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Yükleyen</th>
                    <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Uyum Skoru</th>
                    <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Maddeler</th>
                    <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Tarih</th>
                    <th className="px-5 py-4 font-medium text-[10px] uppercase tracking-wider">Durum</th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-primary shrink-0" />
                          <span className="font-medium text-slate-800 max-w-[180px] truncate" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 ml-7 mt-0.5">{doc.category}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-700 text-xs font-medium">{doc.uploaderName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{doc.uploaderEmail}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${scoreBar(doc.complianceScore)}`}
                              style={{ width: `${doc.complianceScore}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${scoreColor(doc.complianceScore)}`}>
                            %{doc.complianceScore}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <span className="text-success">{doc.uyumlu}✓</span>
                          <span className="text-warning mx-0.5">{doc.kismen}~</span>
                          <span className="text-danger">{doc.uyumsuz}✗</span>
                          {doc.kapsamDisi > 0 && <span className="text-slate-400 ml-0.5">{doc.kapsamDisi}−</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">{doc.uploadDate}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusBadge(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`${BASE}/api/documents/${doc.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100"
                            title="PDF'i görüntüle"
                          >
                            <Eye size={16} />
                          </a>
                          <button
                            onClick={() => setConfirmDelete({ type: 'doc', id: doc.id, name: doc.name })}
                            className="p-2 rounded-lg text-slate-300 hover:text-danger hover:bg-danger/5 transition-all opacity-0 group-hover:opacity-100"
                            title="Belgeyi sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Kullanıcılar ── */}
      {activeTab === 'kullanicilar' && (
        <div className="card space-y-6">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Ad veya e-posta ara..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-100 rounded-xl outline-none focus:border-primary transition-all text-sm"
            />
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-sm">Kullanıcı bulunamadı.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                      ${user.role === 'ADMIN' ? 'bg-academic/10 text-academic' : 'bg-slate-100 text-slate-500'}`}>
                      {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">{user.documentCount} belge · Üyelik: {user.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${user.role === 'ADMIN' ? 'bg-academic/10 text-academic' : 'bg-slate-100 text-slate-500'}`}>
                      {user.role}
                    </span>
                    <button
                      onClick={() => setConfirmDelete({ type: 'user', id: user.id, name: user.name })}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-danger hover:bg-danger/5 transition-all opacity-0 group-hover:opacity-100"
                      title="Kullanıcıyı sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
