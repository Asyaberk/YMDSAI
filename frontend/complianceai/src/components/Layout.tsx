import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  FileSearch, 
  FlaskConical, 
  Search, 
  ShieldCheck,
  Circle,
  Settings,
  LogOut,
  HelpCircle,
  X,
  ChevronRight,
  Info,
  Scale
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'motion/react';
import Logo from './Logo';
import { useLanguage } from '../contexts/LanguageContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const userNavItems = [
    { name: t('overview'), path: '/', icon: LayoutDashboard, desc: t('overviewDesc') },
    { name: t('upload'), path: '/upload', icon: Upload, desc: t('uploadDesc') },
    { name: t('analyses'), path: '/analysis', icon: FileSearch, desc: t('analysesDesc') },
    { name: t('portal'), path: '/portal', icon: Search, desc: t('portalDesc') },
    { name: t('regulations'), path: '/mevzuat', icon: Scale, desc: t('regulationsDesc') },
  ];

  const adminNavItems = [
    { name: t('adminPanel'), path: '/admin', icon: Settings, desc: t('adminDesc') },
    { name: t('experiments'), path: '/experiments', icon: FlaskConical, desc: t('experimentsDesc') },
  ];

  const navItems = user?.role === 'ADMIN' ? [...userNavItems, ...adminNavItems] : userNavItems;

  const currentNavItem = navItems.find(item => item.path === location.pathname);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#f9fafb] border-r border-gray-200 flex flex-col fixed h-full z-40 transition-all duration-300">
        <Logo className="p-6 border-b border-gray-100" />

        <nav className="flex-1 px-4 py-6 space-y-8">
          <div>
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t('mainMenu')}</p>
            <div className="space-y-1">
              {userNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all group relative duration-200",
                      isActive && "bg-primary/5 text-primary font-medium"
                    )
                  }
                >
                  <item.icon size={20} className={cn("transition-colors", location.pathname === item.path && "text-primary")} />
                  <span className="text-sm">{item.name}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {user?.role === 'ADMIN' && (
            <div>
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t('management')}</p>
              <div className="space-y-1">
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all group relative duration-200",
                        isActive && "bg-academic/5 text-academic font-medium"
                      )
                    }
                  >
                    <item.icon size={20} className={cn("transition-colors", location.pathname === item.path && "text-academic")} />
                    <span className="text-sm">{item.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Info & Help */}
        <div className="p-4 space-y-3">
          <button 
             onClick={() => setShowHelp(true)}
             className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
          >
             <HelpCircle size={18} />
             <span>{t('help')}</span>
          </button>
          
          <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-3">
               <img src={user?.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-gray-200" />
               <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-700 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{user?.role === 'ADMIN' ? t('admin') : t('user')}</p>
               </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-danger hover:bg-danger/5 rounded-lg transition-all"
            >
              <LogOut size={14} /> {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col relative transition-all duration-300">
        {/* Top Header/Helper Bar */}
        <header className={cn(
          "h-20 backdrop-blur-md border-b sticky top-0 z-30 px-8 flex items-center justify-between transition-colors duration-300",
          ['/admin', '/experiments'].includes(location.pathname) ? "bg-slate-900 border-slate-800 text-white" : "bg-white/80 border-gray-100 text-slate-900"
        )}>
           <div className="flex items-center gap-2">
              <span className={cn("text-sm", ['/admin', '/experiments'].includes(location.pathname) ? "text-slate-500" : "text-slate-400")}>{t('dashboard')}</span>
              <ChevronRight size={14} className={['/admin', '/experiments'].includes(location.pathname) ? "text-slate-700" : "text-slate-300"} />
              <span className="font-medium text-sm">{currentNavItem?.name}</span>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-[11px] font-bold bg-white text-slate-600">
                {(['tr', 'en'] as const).map(code => (
                  <button key={code} type="button" onClick={() => setLanguage(code)}
                    aria-pressed={language === code}
                    className={cn('px-2.5 py-1 rounded-md transition-colors', language === code && 'bg-primary text-white')}>
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
              {!['/admin', '/experiments'].includes(location.pathname) && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-full text-xs font-bold border border-success/10">
                   <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                   {t('regulationsCurrent')} · {new Date().getFullYear()}
                </div>
              )}
              {['/admin', '/experiments'].includes(location.pathname) && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-academic text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                   {t('adminAccess')}
                </div>
              )}
              <button 
                onClick={() => setShowHelp(true)}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative group",
                  ['/admin', '/experiments'].includes(location.pathname) ? "text-slate-400 hover:bg-white/5" : "text-slate-400 hover:bg-gray-50"
                )}
              >
                 <Info size={20} />
                 <span className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">{t('pageInfo')}</span>
              </button>
           </div>
        </header>

        <div className="flex-1 p-8">
           {/* Welcome Message Card (Optional, for explaining page intent) */}
           {location.pathname !== '/admin' && (
             <div className="mb-8 p-6 bg-slate-50 border border-slate-100 rounded-2xl flex gap-6 items-start animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                   {currentNavItem && <currentNavItem.icon size={24} />}
                </div>
                <div className="space-y-1">
                   <h2 className="text-slate-900 font-medium tracking-tight">{currentNavItem?.name}</h2>
                   <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">{currentNavItem?.desc}</p>
                </div>
             </div>
           )}

           <Outlet />
        </div>
      </main>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <HelpCircle size={28} className="text-primary" />
                  <h2 className="text-2xl font-medium tracking-tight text-slate-900">{t('howTo')}</h2>
               </div>
               <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-slate-400">
                  <X size={24} />
               </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
               <section className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2 text-slate-800">
                     <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                     {t('helpAnalysisTitle')}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                     {t('helpAnalysis')}
                  </p>
               </section>

               <section className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2 text-slate-800">
                     <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                     {t('helpResultsTitle')}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                     {t('helpResults')}
                  </p>
               </section>

               <section className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2 text-slate-800">
                     <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                     {t('helpBotTitle')}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                     {t('helpBot')}
                  </p>
               </section>
            </div>

            <div className="p-8 bg-gray-50 flex justify-end">
               <button 
                  onClick={() => setShowHelp(false)}
                  className="btn-primary"
               >
                  {t('close')}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
