import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  Clock,
  FileCheck2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { Badge, StatCard } from '../components/ui/index.ts';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import {
  formatMetodeBayar,
  formatRupiah,
  formatStatusAkta,
  formatTanggal,
} from '../lib/format.ts';
import type { DashboardData } from '../types/index.ts';

const DONUT_COLORS = [
  '#0F1E36',
  '#2563EB',
  '#0D9488',
  '#D97706',
  '#4F46E5',
  '#64748B',
  '#DC2626',
  '#16A34A',
];

type ReminderTab = 'mendekati' | 'belum_diserahkan' | 'tagihan_terlambat';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeReminder, setActiveReminder] = useState<ReminderTab>('mendekati');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<DashboardData>('/api/dashboard');
      setData(res);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal memuat ringkasan dashboard.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const statCards = data
    ? [
        {
          label: 'Total Klien',
          value: String(data.stats.totalKlien),
          sub: 'Perorangan & perusahaan terdaftar',
        },
        {
          label: 'Total Akta',
          value: String(data.stats.totalAkta),
          sub: 'Seluruh akta dalam register',
        },
        {
          label: 'Akta Proses',
          value: String(data.stats.aktaProses),
          sub: 'Status draft & dalam proses',
        },
        {
          label: 'Akta Selesai',
          value: String(data.stats.aktaSelesai),
          sub: 'Selesai & telah diserahkan',
        },
        {
          label: 'Tagihan Belum Lunas',
          value: formatRupiah(data.stats.totalTagihanBelumLunas),
          sub: 'Akumulasi piutang jasa akta',
          accentClass: 'text-red-700',
        },
        {
          label: 'Pemasukan Bulan Ini',
          value: formatRupiah(data.stats.pemasukanBulanIni),
          sub: 'Pembayaran diterima bulan berjalan',
          accentClass: 'text-emerald-700',
        },
      ]
    : [];

  const totalAktaDonut = data
    ? data.aktaPerJenis.reduce((sum, item) => sum + item.jumlah, 0)
    : 0;

  return (
    <Layout
      title="Dashboard"
      breadcrumb="Ringkasan Operasional Kantor"
      actions={
        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      }
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={fetchDashboard}
            className="px-3 py-1.5 text-xs font-medium text-red-800 bg-white border border-red-300 rounded-lg hover:bg-red-100 cursor-pointer whitespace-nowrap"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl p-5 h-28 animate-pulse"
              >
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-7 w-36 bg-slate-200 rounded mt-3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl h-80 animate-pulse" />
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl h-80 animate-pulse" />
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Grid */}
          <section aria-label="Statistik Utama" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                sub={card.sub}
                valueClassName={card.accentClass || 'text-slate-900'}
              />
            ))}
          </section>

          {/* Charts Row */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bar Chart: Pemasukan 12 Bulan */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Pemasukan 12 Bulan Terakhir
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Akumulasi pembayaran jasa akta yang tercatat per bulan
                  </p>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.pemasukan12Bulan}
                    margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val: number) =>
                        val >= 1_000_000
                          ? `${(val / 1_000_000).toFixed(0)} jt`
                          : val > 0
                            ? `${(val / 1000).toFixed(0)} rb`
                            : '0'
                      }
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value) => [formatRupiah(Number(value) || 0), 'Pemasukan']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="total" fill="#0F1E36" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart: Akta per Jenis */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-900">Akta per Jenis</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi {totalAktaDonut} akta berdasarkan kategori layanan
                </p>
              </div>

              {data.aktaPerJenis.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                  Belum ada data akta.
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.aktaPerJenis}
                          dataKey="jumlah"
                          nameKey="jenis"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={82}
                          paddingAngle={2}
                        >
                          {data.aktaPerJenis.map((entry, index) => (
                            <Cell
                              key={entry.jenis}
                              fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value} akta`, String(name)]}
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {data.aktaPerJenis.map((item, idx) => (
                      <div
                        key={item.jenis}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{
                              backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                            }}
                          />
                          <span className="text-slate-700 truncate">{item.jenis}</span>
                        </div>
                        <span className="font-mono tabular-nums font-medium text-slate-900 shrink-0">
                          {item.jumlah}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Panel Pengingat */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Panel Pengingat & Tindak Lanjut
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prioritas pengawasan tenggat akta, penyerahan salinan, dan penagihan
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveReminder('mendekati')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    activeReminder === 'mendekati'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Target Selesai ≤ 7 Hari ({data.pengingat.mendekatiTarget.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReminder('belum_diserahkan')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    activeReminder === 'belum_diserahkan'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Selesai Belum Diserahkan ({data.pengingat.selesaiBelumDiserahkan.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReminder('tagihan_terlambat')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    activeReminder === 'tagihan_terlambat'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tagihan &gt; 30 Hari ({data.pengingat.tagihanTerlambat.length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {activeReminder === 'mendekati' && (
                <>
                  {data.pengingat.mendekatiTarget.length === 0 ? (
                    <div className="px-6 py-8 text-sm text-slate-500 text-center">
                      Tidak ada akta yang melewati atau mendekati target selesai dalam 7 hari ke depan.
                    </div>
                  ) : (
                    data.pengingat.mendekatiTarget.map((item) => {
                      const isOverdue = item.hari_tersisa < 0;
                      return (
                        <div
                          key={item.id}
                          className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Link
                                to={`/akta/${item.id}`}
                                className="font-mono font-medium text-slate-700 hover:text-blue-700 hover:underline"
                              >
                                {item.nomor_akta}
                              </Link>
                              <span aria-hidden="true">·</span>
                              <span>{item.jenis}</span>
                              <span aria-hidden="true">·</span>
                              <Link
                                to={`/klien/${item.client_id}`}
                                className="text-blue-700 hover:underline font-medium truncate"
                              >
                                {item.client_nama}
                              </Link>
                            </div>
                            <p className="text-sm font-medium text-slate-900 mt-0.5 truncate">
                              {item.judul}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 text-xs">
                            <span className="font-mono tabular-nums text-slate-500">
                              Target: {formatTanggal(item.target_selesai)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap ${
                                isOverdue ? 'text-red-700' : 'text-amber-700'
                              }`}
                            >
                              {isOverdue ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              {isOverdue
                                ? `Terlewat ${Math.abs(item.hari_tersisa)} hari`
                                : item.hari_tersisa === 0
                                  ? 'Jatuh tempo hari ini'
                                  : `${item.hari_tersisa} hari lagi`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeReminder === 'belum_diserahkan' && (
                <>
                  {data.pengingat.selesaiBelumDiserahkan.length === 0 ? (
                    <div className="px-6 py-8 text-sm text-slate-500 text-center">
                      Seluruh akta yang telah selesai sudah diserahkan kepada klien.
                    </div>
                  ) : (
                    data.pengingat.selesaiBelumDiserahkan.map((item) => (
                      <div
                        key={item.id}
                        className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Link
                              to={`/akta/${item.id}`}
                              className="font-mono font-medium text-slate-700 hover:text-blue-700 hover:underline"
                            >
                              {item.nomor_akta}
                            </Link>
                            <span aria-hidden="true">·</span>
                            <span>{item.jenis}</span>
                            <span aria-hidden="true">·</span>
                            <Link
                              to={`/klien/${item.client_id}`}
                              className="text-blue-700 hover:underline font-medium truncate"
                            >
                              {item.client_nama}
                            </Link>
                          </div>
                          <p className="text-sm font-medium text-slate-900 mt-0.5 truncate">
                            {item.judul}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 text-xs">
                          <span className="font-mono tabular-nums text-slate-500">
                            Selesai: {formatTanggal(item.tanggal_selesai || item.tanggal_akta)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 whitespace-nowrap">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            Menunggu serah terima
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {activeReminder === 'tagihan_terlambat' && (
                <>
                  {data.pengingat.tagihanTerlambat.length === 0 ? (
                    <div className="px-6 py-8 text-sm text-slate-500 text-center">
                      Tidak ada tagihan belum lunas yang berumur lebih dari 30 hari.
                    </div>
                  ) : (
                    data.pengingat.tagihanTerlambat.map((item) => (
                      <div
                        key={item.id}
                        className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Link
                              to={`/akta/${item.id}`}
                              className="font-mono font-medium text-slate-700 hover:text-blue-700 hover:underline"
                            >
                              {item.nomor_akta}
                            </Link>
                            <span aria-hidden="true">·</span>
                            <Link
                              to={`/klien/${item.client_id}`}
                              className="text-blue-700 hover:underline font-medium truncate"
                            >
                              {item.client_nama}
                            </Link>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              Umur {item.umur_hari} hari
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 mt-0.5 truncate">
                            {item.judul}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 text-xs">
                          <span className="font-mono tabular-nums font-semibold text-red-700">
                            Sisa: {formatRupiah(item.sisa_tagihan)}
                          </span>
                          <Link
                            to={`/klien/${item.client_id}`}
                            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap"
                          >
                            <span>Lihat Klien</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </section>

          {/* 5 Akta Terbaru & 5 Pembayaran Terbaru */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 5 Akta Terbaru */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">5 Akta Terbaru</h2>
                <Link
                  to="/akta"
                  className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                >
                  Lihat Semua Akta
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                      <th className="py-2.5 px-4">Akta & Klien</th>
                      <th className="py-2.5 px-3">Jenis</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.aktaTerbaru.map((akta) => {
                      const statusMeta = formatStatusAkta(akta.status);
                      return (
                        <tr key={akta.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <Link
                              to={`/akta/${akta.id}`}
                              className="font-medium text-slate-900 hover:text-blue-700 line-clamp-1"
                            >
                              {akta.judul}
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <Link
                                to={`/akta/${akta.id}`}
                                className="font-mono hover:underline"
                              >
                                {akta.nomor_akta}
                              </Link>
                              <span aria-hidden="true">·</span>
                              <Link
                                to={`/klien/${akta.client_id}`}
                                className="text-blue-700 hover:underline truncate"
                              >
                                {akta.client_nama}
                              </Link>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                            {akta.jenis}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <Badge variant={akta.status}>{statusMeta.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {data.aktaTerbaru.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-sm text-slate-500">
                          Belum ada akta tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5 Pembayaran Terbaru */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">5 Pembayaran Terbaru</h2>
                <Link
                  to="/pembayaran"
                  className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                >
                  Lihat Semua
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                      <th className="py-2.5 px-4">Kwitansi & Klien</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-4 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.pembayaranTerbaru.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {pay.nomor_kwitansi}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatMetodeBayar(pay.metode)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <Link
                              to={`/klien/${pay.client_id}`}
                              className="text-blue-700 hover:underline truncate"
                            >
                              {pay.client_nama}
                            </Link>
                            <span aria-hidden="true">·</span>
                            <Link
                              to={`/akta/${pay.akta_id}`}
                              className="font-mono hover:underline"
                            >
                              {pay.nomor_akta}
                            </Link>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatTanggal(pay.tanggal_bayar)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                          {formatRupiah(pay.jumlah)}
                        </td>
                      </tr>
                    ))}
                    {data.pembayaranTerbaru.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-sm text-slate-500">
                          Belum ada pembayaran tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </Layout>
  );
}
