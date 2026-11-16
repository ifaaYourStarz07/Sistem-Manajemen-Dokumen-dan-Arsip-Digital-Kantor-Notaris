import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { ApiClientError } from '../lib/api.ts';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={fromPath} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(fromPath, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal terhubung ke server. Silakan coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Left Panel: Navy Branding */}
      <div className="bg-[#0F1E36] text-white px-8 py-12 sm:px-14 lg:px-16 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">NOTARYDUTTY</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </Link>
        </div>

        <div className="my-12 lg:my-0 max-w-lg">
          <p className="text-xs font-semibold tracking-wide uppercase text-orange-400 mb-3">
            Sistem Administrasi Kantor Notaris & PPAT
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-white [text-wrap:balance]">
            Tata kelola akta, klien, dan keuangan kantor dalam satu ruang kerja.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            Dirancang untuk menjaga ketertiban arsip akta, pemantauan tenggat penyelesaian,
            dan akurasi penagihan klien secara terpusat.
          </p>

          <div className="mt-10 pt-8 border-t border-white/15 space-y-4 text-sm text-slate-200">
            <div>
              <p className="font-semibold text-white">01. Basis Data Klien Tervalidasi</p>
              <p className="text-slate-300 mt-0.5">
                Validasi NIK dan NPWP 16 digit otomatis serta riwayat akta per klien.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">02. Pemantauan Jatuh Tempo Real-Time</p>
              <p className="text-slate-300 mt-0.5">
                Pengingat akta mendekati target selesai, siap serah terima, dan tagihan tertunggak.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">03. Kontrol Akses Berbasis Peran</p>
              <p className="text-slate-300 mt-0.5">
                Pemisahan wewenang tegas antara Notaris (Admin) dan Staf Administrasi.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          NOTARYDUTTY · Akses terbatas khusus personel kantor terdaftar.
        </p>
      </div>

      {/* Right Panel: White Login Form */}
      <div className="bg-white px-6 py-12 sm:px-12 lg:px-20 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Masuk ke Akun Anda</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Gunakan email dan kata sandi yang didaftarkan oleh Notaris.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@notarydutty.test"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-11 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-3">
              Akun Demo (klik untuk mengisi otomatis):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@notarydutty.test', 'password')}
                className="px-3.5 py-2.5 text-left border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/40 transition-colors cursor-pointer"
              >
                <p className="text-xs font-semibold text-slate-900">Admin (Notaris)</p>
                <p className="text-[11px] font-mono text-slate-600 truncate mt-0.5">
                  admin@notarydutty.test
                </p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Sandinya: password
                </p>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('staf@notarydutty.test', 'password')}
                className="px-3.5 py-2.5 text-left border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/40 transition-colors cursor-pointer"
              >
                <p className="text-xs font-semibold text-slate-900">Staf Kantor</p>
                <p className="text-[11px] font-mono text-slate-600 truncate mt-0.5">
                  staf@notarydutty.test
                </p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Sandinya: password
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
