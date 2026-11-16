import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Layout } from './Layout.tsx';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#0F1E36] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Memuat sesi NOTARYDUTTY...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#0F1E36] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Memuat sesi NOTARYDUTTY...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'admin') {
    return (
      <Layout title="Akses Terbatas" breadcrumb="Otorisasi Peran">
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-8 text-center max-w-lg mx-auto my-8">
          <ShieldAlert className="w-10 h-10 text-red-700 mx-auto" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            Halaman Khusus Admin (Notaris)
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Akun dengan peran Staf tidak memiliki izin untuk mengakses fitur administrasi,
            laporan, log aktivitas, manajemen pengguna, atau pengaturan kantor.
          </p>
          <a
            href="/dashboard"
            className="mt-5 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          >
            Kembali ke Dashboard
          </a>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}
