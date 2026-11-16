import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Scale, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export function HomePage() {
  const { user } = useAuth();
  const targetPath = user ? '/dashboard' : '/login';
  const ctaLabel = user ? 'Buka Dashboard' : 'Masuk';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Public Navbar (Tanpa tombol daftar) */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0F1E36] flex items-center justify-center text-orange-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#0F1E36]">
              NOTARY
            </span>
          </Link>

          <Link
            to={targetPath}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors whitespace-nowrap"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="bg-[#0F1E36] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
                Sistem Administrasi Kantor Notaris & PPAT
              </p>
              <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight leading-tight text-white [text-wrap:balance]">
                Kelola register akta, arsip klien, dan penagihan kantor dengan tertib.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                NOTARY membantu Notaris dan staf administrasi memantau proses pembuatan akta,
                menyimpan dokumen legal secara terpusat, serta menerbitkan kuitansi dan laporan keuangan
                dalam satu sistem internal kantor.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to={targetPath}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-xs"
                >
                  <span>{ctaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <span className="text-xs text-slate-400">
                  Akses internal khusus Notaris dan staf terdaftar.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Tiga Ringkasan Fitur */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl font-bold text-slate-900">
              Tiga Pilar Administrasi Kenotariatan
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Alur kerja terstruktur dari pendaftaran penghadap hingga serah terima salinan akta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Register Klien & Akta
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Validasi NIK dan NPWP 16 digit, penomoran akta otomatis per tahun, pengingat tenggat
                penyelesaian, dan pencatatan riwayat perubahan status secara kronologis.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
              <div className="w-10 h-10 rounded-lg bg-[#0F1E36]/10 text-[#0F1E36] border border-[#0F1E36]/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Arsip Dokumen & Kontrol Peran
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Unggah lampiran PDF maupun foto identitas dengan pratinjau terautentikasi. Wewenang
                Admin dan Staf dipisahkan tegas di server lengkap dengan jejak log aktivitas.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Penagihan, Kuitansi & Laporan
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Pantau cicilan dan sisa tagihan per akta, terbitkan kuitansi siap cetak lengkap dengan
                kop resmi kantor serta terbilang rupiah, dan ekspor laporan CSV atau PDF.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-[#0F1E36]">
            <Scale className="w-4 h-4 text-orange-500" />
            <span>NOTARYDUTTY</span>
          </div>
          <p>
            © {new Date().getFullYear()} NOTARYDUTTY · Sistem Administrasi Kantor Notaris & PPAT.
          </p>
        </div>
      </footer>
    </div>
  );
}
