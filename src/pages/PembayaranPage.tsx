import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { KuitansiModal } from '../components/KuitansiModal.tsx';
import {
  Card,
  ConfirmDialog,
  EmptyState,
  Pagination,
} from '../components/ui/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import { formatMetodeBayar, formatRupiah, formatTanggal } from '../lib/format.ts';
import type { Client, PaginationMeta, PembayaranItem } from '../types/index.ts';

type MetodeFilter = 'semua' | 'tunai' | 'transfer' | 'qris';

export function PembayaranPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState<PembayaranItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [totalNominal, setTotalNominal] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [metodeFilter, setMetodeFilter] = useState<MetodeFilter>('semua');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [tanggalDari, setTanggalDari] = useState('');
  const [tanggalSampai, setTanggalSampai] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [kuitansiId, setKuitansiId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PembayaranItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const kwParam = searchParams.get('kwitansi');
    if (kwParam) {
      const parsed = Number(kwParam);
      if (Number.isInteger(parsed) && parsed > 0) {
        setKuitansiId(parsed);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    apiRequest<{ data: Client[] }>('/api/clients?limit=50&sortBy=nama&sortOrder=asc')
      .then((res) => setClients(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        metode: metodeFilter,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (clientIdFilter) params.set('clientId', clientIdFilter);
      if (tanggalDari) params.set('tanggalDari', tanggalDari);
      if (tanggalSampai) params.set('tanggalSampai', tanggalSampai);

      const res = await apiRequest<{
        data: PembayaranItem[];
        pagination: PaginationMeta;
        totalNominal: number;
      }>(`/api/pembayaran?${params.toString()}`);

      setPayments(res.data);
      setPagination(res.pagination);
      setTotalNominal(res.totalNominal);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal memuat daftar pembayaran.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, metodeFilter, debouncedSearch, clientIdFilter, tanggalDari, tanggalSampai]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setMetodeFilter('semua');
    setClientIdFilter('');
    setTanggalDari('');
    setTanggalSampai('');
    setPage(1);
  };

  const handleConfirmDeletePayment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/pembayaran/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success(`Pembayaran "${deleteTarget.nomor_kwitansi}" berhasil dihapus.`);
      setDeleteTarget(null);
      loadPayments();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Gagal menghapus pembayaran.';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout
      title="Pembayaran & Kuitansi"
      breadcrumb="Catatan Penerimaan Jasa Kenotariatan"
    >
      <Card padding="none" className="no-print overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari no. kwitansi, no. akta, atau nama klien..."
                className="w-full pl-10 pr-9 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              {(
                [
                  { key: 'semua', label: 'Semua Metode' },
                  { key: 'transfer', label: 'Transfer' },
                  { key: 'tunai', label: 'Tunai' },
                  { key: 'qris', label: 'QRIS' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setMetodeFilter(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    metodeFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <select
              aria-label="Filter Klien"
              value={clientIdFilter}
              onChange={(e) => {
                setClientIdFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
            >
              <option value="">Semua Klien</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>

            <span className="font-medium text-slate-600 ml-1">Tanggal:</span>
            <input
              type="date"
              aria-label="Tanggal bayar dari"
              value={tanggalDari}
              onChange={(e) => {
                setTanggalDari(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-700 bg-white"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              aria-label="Tanggal bayar sampai"
              value={tanggalSampai}
              onChange={(e) => {
                setTanggalSampai(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-700 bg-white"
            />

            {(searchInput ||
              metodeFilter !== 'semua' ||
              clientIdFilter ||
              tanggalDari ||
              tanggalSampai) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="m-4 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">No. Kuitansi</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Klien</th>
                <th className="py-3 px-3">Akta</th>
                <th className="py-3 px-3">Metode</th>
                <th className="py-3 px-3 text-right">Jumlah</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="Tidak ada transaksi pembayaran yang sesuai dengan filter"
                      description="Ubah filter tanggal, metode, atau nama klien."
                    />
                  </td>
                </tr>
              ) : (
                payments.map((pay) => (
                  <tr
                    key={pay.id}
                    className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-100/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#0F1E36] whitespace-nowrap">
                      {pay.nomor_kwitansi}
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                      {formatTanggal(pay.tanggal_bayar)}
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      <Link
                        to={`/klien/${pay.client_id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {pay.client_nama}
                      </Link>
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      <Link
                        to={`/akta/${pay.akta_id}`}
                        className="font-mono font-medium text-slate-800 hover:text-blue-700 hover:underline"
                      >
                        {pay.nomor_akta}
                      </Link>
                      {pay.keterangan && (
                        <p className="text-slate-500 mt-0.5 line-clamp-1">{pay.keterangan}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-700 whitespace-nowrap">
                      {formatMetodeBayar(pay.metode)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                      {formatRupiah(pay.jumlah)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setKuitansiId(pay.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0F1E36] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Kuitansi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(pay)}
                          title="Hapus pembayaran"
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={5} className="py-3.5 px-4 text-sm font-semibold text-slate-900">
                  Total Pembayaran (Sesuai Filter · {pagination.total} transaksi)
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums text-base font-bold text-[#0F1E36] whitespace-nowrap">
                  {formatRupiah(totalNominal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          pagination={pagination}
          itemLabel="transaksi"
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      </Card>

      <KuitansiModal pembayaranId={kuitansiId} onClose={() => setKuitansiId(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Pembayaran"
        message={
          <>
            Apakah Anda yakin ingin menghapus catatan pembayaran{' '}
            <span className="font-mono font-semibold text-slate-900">
              {deleteTarget?.nomor_kwitansi}
            </span>
            ?
          </>
        }
        confirmLabel="Hapus Pembayaran"
        loading={deleting}
        onConfirm={handleConfirmDeletePayment}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
