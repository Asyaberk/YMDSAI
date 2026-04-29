import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  FileSearch, 
  FlaskConical, 
  Search, 
  BarChart3, 
  ShieldCheck,
  Circle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Genel Bakış', path: '/', icon: LayoutDashboard },
  { name: 'Belge Yükle', path: '/upload', icon: Upload },
  { name: 'Uyumluluk Analizi', path: '/analysis', icon: FileSearch },
  { name: 'RAG Karşılaştırma', path: '/experiments', icon: FlaskConical },
  { name: 'Bilgi Portalı', path: '/portal', icon: Search },
  { name: 'Raporlar', path: '/reports', icon: BarChart3 },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#f9fafb] border-r border-gray-200 flex flex-col fixed h-full">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="font-medium text-lg leading-tight">ComplianceAI</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Mevzuat Denetim</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "nav-item",
                  isActive && "nav-item-active"
                )
              }
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-top border-gray-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>YÖK mevzuatı Güncel · 2025</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
