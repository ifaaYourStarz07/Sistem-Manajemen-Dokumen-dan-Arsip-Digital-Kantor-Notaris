import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { ClientFormModal } from '../components/ClientFormModal.tsx';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Pagination,
} from '../components/ui/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import { formatJenisKlien, formatTanggal } from '../lib/format.ts';
import type { Client, PaginationMeta } from '../types/index.ts';

type JenisFilter = 'semua' | 'perorangan' | 'perusahaan';
type SortKey = 'nama' | 'jenis' | 'nik' | 'total_akta' | 'created_at';

export function ClientsPage() {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState<JenisFilter>('semua');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        sortBy,
        sortOrder,
        jenis: jenisFilter,
      });
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      const res = await apiRequest<{ data: Client[]; pagination: PaginationMeta }>(
        `/api/clients?${params.toString()}`
      );
      setClients(res.data);
      setPagination(res.pagination);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal memuat data klien.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, jenisFilter, debouncedSearch]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleSort = (col: SortKey) => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder(col === 'created_at' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const renderSortIcon = (col: SortKey) => {
    if (sortBy !== col) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#0F1E36]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#0F1E36]" />
    );
  };

  const handleOpenCreate = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiRequest(`/api/clients/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success(`Klien "${deleteTarget.nama}" berhasil dihapus.`);
      setDeleteTarget(null);
      loadClients();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setDeleteError(err.message);
        toast.error(err.message);
      } else {
        setDeleteError('Gagal menghapus data klien.');
        toast.error('Gagal menghapus data klien.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout
      title="Data Klien"
      breadcrumb="Administrasi Klien Kantor Notaris"
      actions={
        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4" />
          <span>Tambah Klien</span>
        </Button>
      }
    >
      <Card padding="none" className="overflow-hidden">
        {/* Toolbar: Search & Filter */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama, NIK, atau nomor HP..."
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

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
            {(
              [
                { key: 'semua', label: 'Semua' },
                { key: 'perorangan', label: 'Perorangan' },
                { key: 'perusahaan', label: 'Perusahaan' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setJenisFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  jenisFilter === tab.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
                    onClick={() => handleSort('nama')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Nama Klien</span>
                    {renderSortIcon('nama')}
                  </button>
                </th>
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
                    onClick={() => handleSort('nik')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>NIK / NPWP</span>
                    {renderSortIcon('nik')}
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Kontak</th>
                <th className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('total_akta')}
                    className="inline-flex items-center justify-end gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Akta</span>
                    {renderSortIcon('total_akta')}
                  </button>
                </th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('created_at')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Terdaftar</span>
                    {renderSortIcon('created_at')}
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
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="Tidak ada data klien yang sesuai"
                      description="Ubah kata kunci pencarian atau tambahkan klien baru."
                    />
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-100/60 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/klien/${client.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-700 hover:underline"
                      >
                        {client.nama}
                      </Link>
                      {client.pekerjaan && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[260px]">
                          {client.pekerjaan}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {formatJenisKlien(client.jenis)}
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      <div>{client.nik || '-'}</div>
                      {client.npwp && (
                        <div className="text-slate-400 mt-0.5">NPWP: {client.npwp}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-700 whitespace-nowrap">
                      <div className="font-mono tabular-nums">{client.hp}</div>
                      <div className="text-slate-500 truncate max-w-[200px]">{client.email}</div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                      {client.total_akta ?? 0}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {formatTanggal(client.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Link
                          to={`/klien/${client.id}`}
                          title="Lihat detail klien"
                          className="p-1.5 text-slate-600 hover:text-[#0F1E36] hover:bg-slate-100 rounded-md"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(client)}
                          title="Edit klien"
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('');
                            setDeleteTarget(client);
                          }}
                          title="Hapus klien"
                          className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          pagination={pagination}
          itemLabel="klien"
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      </Card>

      {/* Create / Edit Modal */}
      <ClientFormModal
        open={modalOpen}
        client={editingClient}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          loadClients();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Data Klien"
        message={
          <>
            Apakah Anda yakin ingin menghapus klien{' '}
            <span className="font-semibold text-slate-900">{deleteTarget?.nama}</span>? Tindakan
            ini tidak dapat dibatalkan.
          </>
        }
        confirmLabel="Hapus Klien"
        loading={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
