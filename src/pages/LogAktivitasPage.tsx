import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { Card, EmptyState, Pagination } from '../components/ui/index.ts';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import { formatRoleLabel, formatTanggalWaktu } from '../lib/format.ts';
import type { PaginationMeta, UserRole } from '../types/index.ts';

interface ActivityLogItem {
  id: number;
  user_id: number | null;
  aksi: string;
  entitas: string;
  entitas_id: number | null;
  detail: string | null;
  created_at: string;
  user_nama: string | null;
  user_email: string | null;
  user_role: UserRole | null;
}

interface LogUserOption {
  id: number;
  nama: string;
  email: string;
  role: UserRole;
}

export function LogAktivitasPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [users, setUsers] = useState<LogUserOption[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [userIdFilter, setUserIdFilter] = useState('');
  const [tanggalDari, setTanggalDari] = useState('');
  const [tanggalSampai, setTanggalSampai] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (userIdFilter) params.set('userId', userIdFilter);
      if (tanggalDari) params.set('tanggalDari', tanggalDari);
      if (tanggalSampai) params.set('tanggalSampai', tanggalSampai);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await apiRequest<{
        data: ActivityLogItem[];
        pagination: PaginationMeta;
        users: LogUserOption[];
      }>(`/api/admin/logs?${params.toString()}`);

      setLogs(res.data);
      setPagination(res.pagination);
      setUsers(res.users);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal memuat log aktivitas.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, userIdFilter, tanggalDari, tanggalSampai, debouncedSearch]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleReset = () => {
    setUserIdFilter('');
    setTanggalDari('');
    setTanggalSampai('');
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };

  return (
    <Layout
      title="Log Aktivitas"
      breadcrumb="Administrasi Notaris / Jejak Audit Sistem"
    >
      <Card padding="none" className="overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari detail aktivitas atau entitas..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
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

          <select
            aria-label="Filter Pengguna"
            value={userIdFilter}
            onChange={(e) => {
              setUserIdFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700"
          >
            <option value="">Semua Pengguna</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama} ({formatRoleLabel(u.role)})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Tanggal dari"
              value={tanggalDari}
              onChange={(e) => {
                setTanggalDari(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-700"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              aria-label="Tanggal sampai"
              value={tanggalSampai}
              onChange={(e) => {
                setTanggalSampai(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-700"
            />
          </div>

          {(userIdFilter || tanggalDari || tanggalSampai || searchInput) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {error && (
          <div className="m-4 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-3">Pengguna</th>
                <th className="py-3 px-3">Aksi</th>
                <th className="py-3 px-3">Entitas</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="py-3.5 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="Tidak ada catatan aktivitas yang sesuai dengan filter"
                      description="Coba ubah rentang tanggal, pengguna, atau kata kunci."
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-100/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                      {formatTanggalWaktu(log.created_at)}
                    </td>
                    <td className="py-3 px-3 text-xs whitespace-nowrap">
                      <p className="font-semibold text-slate-900">
                        {log.user_nama || 'Sistem'}
                      </p>
                      {log.user_role && (
                        <p className="text-slate-500">{formatRoleLabel(log.user_role)}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-[#0F1E36] whitespace-nowrap">
                      {log.aksi}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                      {log.entitas}
                      {log.entitas_id ? ` #${log.entitas_id}` : ''}
                    </td>
                    <td className="py-3 px-4 text-xs sm:text-sm text-slate-700">
                      {log.detail || '-'}
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
          itemLabel="catatan"
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      </Card>
    </Layout>
  );
}
