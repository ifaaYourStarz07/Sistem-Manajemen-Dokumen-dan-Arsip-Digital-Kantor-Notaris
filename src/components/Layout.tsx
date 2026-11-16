import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  BarChart3,
  History,
  UserCog,
  Settings,
  UserCircle2,
  LogOut,
  Menu,
  X,
  Scale,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatRoleLabel } from '../lib/format.ts';
import { GlobalSearchModal } from './GlobalSearchModal.tsx';

interface LayoutProps {
  title: string;
  breadcrumb?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Layout({ title, breadcrumb, actions, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/klien', label: 'Klien', icon: Users, end: false },
    { to: '/akta', label: 'Akta', icon: FileText, end: false },
    { to: '/pembayaran', label: 'Pembayaran', icon: Wallet, end: false },
  ];

  const adminNavItems = [
    { to: '/laporan', label: 'Laporan', icon: BarChart3 },
    { to: '/pengguna', label: 'Pengguna', icon: UserCog },
    { to: '/log-aktivitas', label: 'Log Aktivitas', icon: History },
    { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  const renderNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-orange-500 text-white shadow-xs'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0F1E36] text-slate-100">
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            NOTARY
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={renderNavLinkClass}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {user?.role === 'admin' && (
          <div className="pt-4 border-t border-white/10 space-y-1">
            <p className="px-3.5 pb-1.5 text-[11px] font-medium text-slate-400">
              Administrasi Notaris
            </p>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={renderNavLinkClass}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-white/10 space-y-1">
          <NavLink
            to="/profil"
            onClick={() => setMobileMenuOpen(false)}
            className={renderNavLinkClass}
          >
            <UserCircle2 className="w-4 h-4 shrink-0" />
            <span>Profil</span>
          </NavLink>
        </div>
      </nav>

      <div className="p-4 border-t border-white/10">
        {user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-semibold text-white truncate">{user.nama}</p>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>{formatRoleLabel(user.role)}</span>
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-white/10 hover:bg-white/15 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:block w-64 shrink-0 border-r border-slate-200 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-white rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Buka menu navigasi"
                className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                {breadcrumb && (
                  <p className="text-xs text-slate-500 truncate">{breadcrumb}</p>
                )}
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Global Search Box */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Pencarian Global (Ctrl+K)"
                className="inline-flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline">Cari klien, akta, kuitansi...</span>
                <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 bg-white border border-slate-200 rounded">
                  Ctrl+K
                </kbd>
              </button>

              {actions}

              <div className="hidden xl:flex items-center gap-2.5 pl-3 border-l border-slate-200 text-xs text-slate-600">
                <NavLink
                  to="/profil"
                  className="font-medium text-slate-800 hover:text-orange-600 whitespace-nowrap"
                >
                  {user?.nama}
                </NavLink>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap">
                  {user ? formatRoleLabel(user.role) : ''}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
