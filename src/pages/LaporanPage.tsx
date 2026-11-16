import { useCallback, useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { OfficeLogo } from '../components/OfficeLogo.tsx';
import { Badge, Button, Card } from '../components/ui/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import {
  formatMetodeBayar,
  formatRupiah,
  formatStatusAkta,
  formatTanggal,
} from '../lib/format.ts';
import type { AktaStatus } from '../types/index.ts';

type ReportType = 'akta' | 'pemasukan' | 'tagihan';

const BULAN_OPTIONS = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

interface ReportResponse {
  jenis: ReportType;
  kantor: Record<string, string>;
  availableYears: string[];
  data: Array<Record<string, unknown>>;
  ringkasan: Record<string, unknown>;
}

function escapeCsvCell(val: unknown): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function LaporanPage() {
  const toast = useToast();
  const [jenis, setJenis] = useState<ReportType>('akta');
  const [bulan, setBulan] = useState<string>('all');
  const [tahun, setTahun] = useState<string>(String(new Date().getFullYear()));

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        jenis,
        bulan,
        tahun,
      });
      const res = await apiRequest<ReportResponse>(`/api/admin/reports?${params.toString()}`);
      setReport(res);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal memuat laporan.');
      }
    } finally {
      setLoading(false);
    }
  }, [jenis, bulan, tahun]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const periodeLabel =
    tahun === 'all'
      ? 'Semua Tahun'
      : bulan === 'all'
        ? `Tahun ${tahun}`
        : `${BULAN_OPTIONS.find((b) => b.value === bulan)?.label || bulan} ${tahun}`;

  const reportTitle =
    jenis === 'akta'
      ? 'Laporan Akta per Periode'
      : jenis === 'pemasukan'
        ? 'Laporan Pemasukan Kantor'
        : 'Laporan Tagihan Belum Lunas';

  const handleExportCsv = () => {
    if (!report) return;

    let headers: string[] = [];
    let rows: Array<Array<unknown>> = [];

    if (jenis === 'akta') {
      headers = [
        'Nomor Akta',
        'Judul',
        'Jenis',
        'Klien',
        'Tanggal Akta',
        'Target Selesai',
        'Status',
        'Biaya (Rp)',
        'Dibayar (Rp)',
        'Sisa Tagihan (Rp)',
      ];
      rows = report.data.map((r) => [
        r.nomor_akta,
        r.judul,
        r.jenis,
        r.client_nama,
        r.tanggal_akta,
        r.target_selesai,
        formatStatusAkta(r.status as AktaStatus).label,
        r.biaya,
        r.total_dibayar,
        r.sisa_tagihan,
      ]);
    } else if (jenis === 'pemasukan') {
      headers = [
        'No. Kwitansi',
        'Tanggal Bayar',
        'Klien',
        'No. Akta',
        'Jenis Akta',
        'Metode',
        'Jumlah (Rp)',
        'Catatan',
      ];
      rows = report.data.map((r) => [
        r.nomor_kwitansi,
        r.tanggal_bayar,
        r.client_nama,
        r.nomor_akta,
        r.akta_jenis,
        formatMetodeBayar(String(r.metode || '')),
        r.jumlah,
        r.keterangan,
      ]);
    } else {
      headers = [
        'Nomor Akta',
        'Judul',
        'Jenis',
        'Klien',
        'No. HP Klien',
        'Tanggal Akta',
        'Biaya (Rp)',
        'Sudah Dibayar (Rp)',
        'Sisa Tagihan (Rp)',
      ];
      rows = report.data.map((r) => [
        r.nomor_akta,
        r.judul,
        r.jenis,
        r.client_nama,
        r.client_hp,
        r.tanggal_akta,
        r.biaya,
        r.total_dibayar,
        r.sisa_tagihan,
      ]);
    }

    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((row) => row.map(escapeCsvCell).join(',')),
    ];
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${jenis}-${tahun}-${bulan}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Laporan CSV (${reportTitle}) berhasil diunduh.`);
  };

  return (
    <Layout
      title="Laporan Kantor"
      breadcrumb="Administrasi Notaris / Laporan & Ekspor"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!report || report.data.length === 0}
            onClick={handleExportCsv}
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!report}
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </Button>
        </div>
      }
    >
      {/* Controls (Hidden on Print) */}
      <div className="no-print mb-6 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(
            [
              { key: 'akta', label: 'Akta per Periode' },
              { key: 'pemasukan', label: 'Pemasukan' },
              { key: 'tagihan', label: 'Tagihan Belum Lunas' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setJenis(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                jenis === tab.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="font-medium text-slate-600" htmlFor="lap-bulan">
            Periode:
          </label>
          <select
            id="lap-bulan"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            disabled={tahun === 'all'}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 disabled:bg-slate-100"
          >
            {BULAN_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Tahun laporan"
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-700"
          >
            <option value="all">Semua Tahun</option>
            {(report?.availableYears || [String(new Date().getFullYear())]).map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="no-print mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Printable Report Sheet */}
      <Card padding="lg" className="print-only-sheet">
        {loading && !report ? (
          <div className="py-12 text-center text-sm text-slate-500">Memuat laporan...</div>
        ) : report ? (
          <div className="space-y-6">
            {/* Kop Kantor dari Pengaturan */}
            <div className="pb-5 border-b-2 border-[#0F1E36] flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <OfficeLogo logoFilename={report.kantor.logo_kantor} sizeClass="w-14 h-14" />
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#0F1E36]">
                    {report.kantor.nama_kantor || 'Kantor Notaris & PPAT'}
                  </h2>
                  {report.kantor.nama_notaris && (
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      Notaris & PPAT: {report.kantor.nama_notaris}
                    </p>
                  )}
                  {report.kantor.sk_pengangkatan && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      SK Pengangkatan: {report.kantor.sk_pengangkatan}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">
                    {report.kantor.alamat_kantor || '-'}
                  </p>
                  <p className="text-xs text-slate-600">
                    Telp: {report.kantor.telepon_kantor || '-'} · Email:{' '}
                    {report.kantor.email_kantor || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Report Heading */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{reportTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Periode: {periodeLabel}</p>
              </div>
              <p className="text-xs font-mono text-slate-500">
                Dicetak: {formatTanggal(new Date().toISOString().slice(0, 10))}
              </p>
            </div>

            {/* Summary Strip */}
            {jenis === 'akta' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-slate-500">Total Akta</p>
                  <p className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                    {String(report.ringkasan.totalAkta ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Nilai Jasa</p>
                  <p className="font-mono tabular-nums font-bold text-[#0F1E36] mt-0.5">
                    {formatRupiah(Number(report.ringkasan.totalBiaya ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Draft / Proses</p>
                  <p className="font-mono tabular-nums font-bold text-amber-700 mt-0.5">
                    {Number((report.ringkasan.perStatus as Record<string, number>)?.draft ?? 0) +
                      Number((report.ringkasan.perStatus as Record<string, number>)?.proses ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Selesai / Diserahkan</p>
                  <p className="font-mono tabular-nums font-bold text-emerald-700 mt-0.5">
                    {Number((report.ringkasan.perStatus as Record<string, number>)?.selesai ?? 0) +
                      Number(
                        (report.ringkasan.perStatus as Record<string, number>)?.diserahkan ?? 0
                      )}
                  </p>
                </div>
              </div>
            )}

            {jenis === 'pemasukan' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-slate-500">Jumlah Transaksi</p>
                  <p className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                    {String(report.ringkasan.totalTransaksi ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Pemasukan</p>
                  <p className="font-mono tabular-nums font-bold text-emerald-700 mt-0.5">
                    {formatRupiah(Number(report.ringkasan.totalPemasukan ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Transfer Bank</p>
                  <p className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                    {formatRupiah(
                      Number((report.ringkasan.perMetode as Record<string, number>)?.transfer ?? 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tunai & QRIS</p>
                  <p className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                    {formatRupiah(
                      Number((report.ringkasan.perMetode as Record<string, number>)?.tunai ?? 0) +
                        Number((report.ringkasan.perMetode as Record<string, number>)?.qris ?? 0)
                    )}
                  </p>
                </div>
              </div>
            )}

            {jenis === 'tagihan' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-slate-500">Akta Belum Lunas</p>
                  <p className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                    {String(report.ringkasan.totalAkta ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Biaya</p>
                  <p className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                    {formatRupiah(Number(report.ringkasan.totalTagihan ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sudah Dibayar</p>
                  <p className="font-mono tabular-nums font-bold text-emerald-700 mt-0.5">
                    {formatRupiah(Number(report.ringkasan.totalDibayar ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sisa Piutang</p>
                  <p className="font-mono tabular-nums font-bold text-red-700 mt-0.5">
                    {formatRupiah(Number(report.ringkasan.totalSisa ?? 0))}
                  </p>
                </div>
              </div>
            )}

            {/* Report Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              {jenis === 'akta' && (
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      <th className="py-2.5 px-3">Nomor Akta</th>
                      <th className="py-2.5 px-3">Klien</th>
                      <th className="py-2.5 px-3">Jenis</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Tidak ada data akta pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      report.data.map((r) => {
                        const statusMeta = formatStatusAkta(r.status as AktaStatus);
                        return (
                          <tr key={String(r.id)}>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {String(r.nomor_akta)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">
                              {String(r.client_nama)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {String(r.jenis)}
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {formatTanggal(String(r.tanggal_akta))}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <Badge variant={r.status as AktaStatus}>{statusMeta.label}</Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                              {formatRupiah(Number(r.biaya))}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {jenis === 'pemasukan' && (
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      <th className="py-2.5 px-3">No. Kwitansi</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Klien</th>
                      <th className="py-2.5 px-3">No. Akta</th>
                      <th className="py-2.5 px-3">Metode</th>
                      <th className="py-2.5 px-3 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Tidak ada transaksi pemasukan pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      report.data.map((r) => (
                        <tr key={String(r.id)}>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {String(r.nomor_kwitansi)}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {formatTanggal(String(r.tanggal_bayar))}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">{String(r.client_nama)}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {String(r.nomor_akta)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {formatMetodeBayar(String(r.metode))}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(Number(r.jumlah))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {jenis === 'tagihan' && (
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      <th className="py-2.5 px-3">Nomor Akta</th>
                      <th className="py-2.5 px-3">Klien & Kontak</th>
                      <th className="py-2.5 px-3">Tanggal Akta</th>
                      <th className="py-2.5 px-3 text-right">Total Biaya</th>
                      <th className="py-2.5 px-3 text-right">Dibayar</th>
                      <th className="py-2.5 px-3 text-right">Sisa Tagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Tidak ada tagihan belum lunas pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      report.data.map((r) => (
                        <tr key={String(r.id)}>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {String(r.nomor_akta)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            <div>{String(r.client_nama)}</div>
                            <div className="text-xs font-mono text-slate-500">
                              {String(r.client_hp || '')}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {formatTanggal(String(r.tanggal_akta))}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                            {formatRupiah(Number(r.biaya))}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                            {formatRupiah(Number(r.total_dibayar))}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-red-700 whitespace-nowrap">
                            {formatRupiah(Number(r.sisa_tagihan))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </Card>
    </Layout>
  );
}
