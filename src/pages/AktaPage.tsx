import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { AktaFormModal } from '../components/AktaFormModal.tsx';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Pagination,
} from '../components/ui/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import { formatRupiah, formatStatusAkta, formatTanggal } from '../lib/format.ts';
import type { Akta, AktaStatus, PaginationMeta } from '../types/index.ts';

type StatusFilter = 'semua' | AktaStatus;
type SortKey = 'nomor_akta' | 'jenis' | 'tanggal_akta' | 'target_selesai' | 'status' | 'biaya';

export function AktaPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [aktaList, setAktaList] = useState<Akta[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua');
  const [tanggalDari, setTanggalDari] = useState('');
  const [tanggalSampai, setTanggalSampai] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('tanggal_akta');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAkta, setEditingAkta] = useState<Akta | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Akta | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadAkta = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        sortBy,
        sortOrder,
        status: statusFilter,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (tanggalDari) params.set('tanggalDari', tanggalDari);
      if (tanggalSampai) params.set('tanggalSampai', tanggalSampai);

      const res = await apiRequest<{ data: Akta[]; pagination: PaginationMeta }>(
        `/api/akta?${params.toString()}`
      );
      setAktaList(res.data);
      setPagination(res.pagination);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal memuat daftar akta.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, statusFilter, debouncedSearch, tanggalDari, tanggalSampai]);

  useEffect(() => {
    loadAkta();
  }, [loadAkta]);

  const handleSort = (col: SortKey) => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder(col === 'tanggal_akta' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const renderSortIcon = (col: SortKey) => {
    if (sortBy !== col) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#0F1E36]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#0F1E36]" />
    );
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('semua');
    setTanggalDari('');
    setTanggalSampai('');
    setPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiRequest(`/api/akta/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success(`Akta "${deleteTarget.nomor_akta}" berhasil dihapus permanen.`);
      setDeleteTarget(null);
      loadAkta();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setDeleteError(err.message);
        toast.error(err.message);
      } else {
        setDeleteError('Gagal menghapus akta.');
        toast.error('Gagal menghapus akta.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout
      title="Daftar Akta"
      breadcrumb="Register & Pemantauan Akta Notaris"
      actions={
        <Button
          variant="primary"
          onClick={() => {
            setEditingAkta(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akta</span>
        </Button>
      }
    >
      <Card padding="none" className="overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari no. akta, jenis, atau nama klien..."
                className="w-full pl-10 pr-9 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              {(
                [
                  { key: 'semua', label: 'Semua' },
                  { key: 'draft', label: 'Draft' },
                  { key: 'proses', label: 'Proses' },
                  { key: 'selesai', label: 'Selesai' },
                  { key: 'diserahkan', label: 'Diserahkan' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-slate-600">Rentang Tanggal Akta:</span>
            <input
              type="date"
              aria-label="Tanggal akta dari"
              value={tanggalDari}
              onChange={(e) => {
                setTanggalDari(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              aria-label="Tanggal akta sampai"
              value={tanggalSampai}
              onChange={(e) => {
                setTanggalSampai(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
            />
            {(searchInput || statusFilter !== 'semua' || tanggalDari || tanggalSampai) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
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
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('nomor_akta')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Nomor & Perihal Akta</span>
                    {renderSortIcon('nomor_akta')}
                  </button>
                </th>
                <th className="py-3 px-3">Klien</th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('jenis')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Jenis</span>
                    {renderSortIcon('jenis')}
                  </button>
                </th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('tanggal_akta')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Tanggal</span>
                    {renderSortIcon('tanggal_akta')}
                  </button>
                </th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('biaya')}
                    className="inline-flex items-center justify-end gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Biaya & Sisa</span>
                    {renderSortIcon('biaya')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
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
              ) : aktaList.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="Tidak ada akta yang sesuai dengan filter"
                      description="Ubah kata kunci pencarian atau buat akta baru."
                    />
                  </td>
                </tr>
              ) : (
                aktaList.map((item) => {
                  const statusMeta = formatStatusAkta(item.status);
                  const sisa = item.sisa_tagihan ?? 0;
                  return (
                    <tr
                      key={item.id}
                      className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-100/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/akta/${item.id}`}
                          className="font-mono text-xs font-semibold text-[#0F1E36] hover:underline"
                        >
                          {item.nomor_akta}
                        </Link>
                        <p className="font-medium text-slate-900 mt-0.5 line-clamp-1">
                          {item.judul}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-xs">
                        <Link
                          to={`/klien/${item.client_id}`}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {item.client_nama}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-700 whitespace-nowrap">
                        {item.jenis}
                      </td>
                      <td className="py-3.5 px-3 text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        <div>{formatTanggal(item.tanggal_akta)}</div>
                        <div className="text-slate-400">
                          Target: {formatTanggal(item.target_selesai)}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <Badge variant={item.status}>{statusMeta.label}</Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatRupiah(item.biaya)}</div>
                        <div className={sisa > 0 ? 'text-red-700 mt-0.5' : 'text-emerald-700 mt-0.5'}>
                          {sisa > 0 ? `Sisa: ${formatRupiah(sisa)}` : 'Lunas'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Link
                            to={`/akta/${item.id}`}
                            title="Detail akta, dokumen & pembayaran"
                            className="p-1.5 text-slate-600 hover:text-[#0F1E36] hover:bg-slate-100 rounded-md"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAkta(item);
                              setModalOpen(true);
                            }}
                            title="Edit akta"
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError('');
                                setDeleteTarget(item);
                              }}
                              title="Hapus akta (Khusus Admin)"
                              className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          pagination={pagination}
          itemLabel="akta"
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      </Card>

      <AktaFormModal
        open={modalOpen}
        akta={editingAkta}
        onClose={() => setModalOpen(false)}
        onSaved={() => loadAkta()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Akta Permanen"
        message={
          <>
            Apakah Anda yakin ingin menghapus akta{' '}
            <span className="font-mono font-semibold text-slate-900">
              {deleteTarget?.nomor_akta}
            </span>
            ? Seluruh dokumen lampiran, file fisik di server, dan riwayat pembayaran terkait juga
            akan dihapus permanen.
          </>
        }
        confirmLabel="Hapus Permanen"
        loading={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
