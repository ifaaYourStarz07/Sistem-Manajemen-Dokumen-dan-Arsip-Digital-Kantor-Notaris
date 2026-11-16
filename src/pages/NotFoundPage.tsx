import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <header className="bg-[#0F1E36] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white">
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight">NOTARYDUTTY</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs max-w-md w-full p-8 text-center">
          <p className="font-mono text-4xl font-bold text-orange-500">404</p>
          <h1 className="mt-3 text-xl font-bold text-[#0F1E36]">Halaman Tidak Ditemukan</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Halaman yang Anda cari tidak tersedia atau alamat tautan telah berubah.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to={user ? '/dashboard' : '/'}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{user ? 'Kembali ke Dashboard' : 'Kembali ke Beranda'}</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
