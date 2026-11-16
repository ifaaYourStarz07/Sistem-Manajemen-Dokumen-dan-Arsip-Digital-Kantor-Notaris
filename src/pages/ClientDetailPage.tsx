import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { ClientFormModal } from '../components/ClientFormModal.tsx';
import { AktaFormModal } from '../components/AktaFormModal.tsx';
import { Badge, Button, ConfirmDialog } from '../components/ui/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import {
  formatJenisKlien,
  formatRupiah,
  formatStatusAkta,
  formatTanggal,
} from '../lib/format.ts';
import type { Akta, ClientDetailResponse } from '../types/index.ts';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const [detail, setDetail] = useState<ClientDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [aktaModalOpen, setAktaModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Akta | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<ClientDetailResponse>(`/api/clients/${id}`);
      setDetail(res);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal memuat detail klien.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleConfirmDeleteAkta = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiRequest(`/api/akta/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success(`Akta "${deleteTarget.nomor_akta}" berhasil dihapus.`);
      setDeleteTarget(null);
      loadDetail();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : `Gagal menghapus akta ${deleteTarget.nomor_akta}.`;
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout
      title={detail ? detail.client.nama : 'Detail Klien'}
      breadcrumb="Klien / Detail Profil & Riwayat Akta"
      actions={
        detail ? (
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Klien</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setAktaModalOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Tambah Akta</span>
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="mb-5">
        <Link
          to="/klien"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Klien</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !detail ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl h-24" />
            <div className="bg-white border border-slate-200 rounded-xl h-24" />
            <div className="bg-white border border-slate-200 rounded-xl h-24" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl h-64" />
        </div>
      ) : detail ? (
        <div className="space-y-6">
          {/* Financial Summary */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
              <p className="text-xs font-medium text-slate-500">Total Tagihan</p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatRupiah(detail.ringkasanKeuangan.totalTagihan)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Dari {detail.akta.length} akta terdaftar
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
              <p className="text-xs font-medium text-slate-500">Total Dibayar</p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-700">
                {formatRupiah(detail.ringkasanKeuangan.totalDibayar)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Pembayaran terverifikasi</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
              <p className="text-xs font-medium text-slate-500">Sisa Tagihan</p>
              <p
                className={`mt-1.5 text-2xl font-bold font-mono tabular-nums ${
                  detail.ringkasanKeuangan.sisaTagihan > 0 ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {formatRupiah(detail.ringkasanKeuangan.sisaTagihan)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {detail.ringkasanKeuangan.sisaTagihan > 0
                  ? 'Menunggu pelunasan klien'
                  : 'Seluruh tagihan lunas'}
              </p>
            </div>
          </section>

          {/* Client Profile Information */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
            <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Informasi Klien</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatJenisKlien(detail.client.jenis)} · Terdaftar{' '}
                  {formatTanggal(detail.client.created_at)}
                </p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Nama Lengkap / Badan Usaha</dt>
                <dd className="mt-1 font-medium text-slate-900">{detail.client.nama}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">NIK</dt>
                <dd className="mt-1 font-mono tabular-nums text-slate-900">
                  {detail.client.nik || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">NPWP</dt>
                <dd className="mt-1 font-mono tabular-nums text-slate-900">
                  {detail.client.npwp || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Email</dt>
                <dd className="mt-1 text-slate-900">{detail.client.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">No. HP / Telepon</dt>
                <dd className="mt-1 font-mono tabular-nums text-slate-900">{detail.client.hp}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  {detail.client.jenis === 'perorangan' ? 'Pekerjaan' : 'Bidang Usaha'}
                </dt>
                <dd className="mt-1 text-slate-900">{detail.client.pekerjaan || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Status Perkawinan</dt>
                <dd className="mt-1 text-slate-900">
                  {detail.client.status_perkawinan || '-'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Alamat Lengkap</dt>
                <dd className="mt-1 text-slate-900">{detail.client.alamat}</dd>
              </div>
              {detail.client.catatan && (
                <div className="sm:col-span-2 lg:col-span-3 pt-4 border-t border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Catatan Internal</dt>
                  <dd className="mt-1 text-slate-700">{detail.client.catatan}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Daftar Akta Milik Klien */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Daftar Akta Milik Klien</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seluruh akta dan status penyelesaian untuk {detail.client.nama}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAktaModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F1E36] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Akta</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Nomor & Judul Akta</th>
                    <th className="py-3 px-3">Jenis</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Biaya</th>
                    <th className="py-3 px-3 text-right">Dibayar</th>
                    <th className="py-3 px-4 text-right">Sisa</th>
                    {user?.role === 'admin' && <th className="py-3 px-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {detail.akta.length === 0 ? (
                    <tr>
                      <td
                        colSpan={user?.role === 'admin' ? 8 : 7}
                        className="py-10 px-4 text-center"
                      >
                        <p className="text-sm font-medium text-slate-700">
                          Klien ini belum memiliki akta terdaftar.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAktaModalOpen(true)}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F1E36] hover:bg-[#192F52] rounded-lg cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat Akta Pertama</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    detail.akta.map((akta) => {
                      const statusMeta = formatStatusAkta(akta.status);
                      return (
                        <tr key={akta.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4">
                            <Link
                              to={`/akta/${akta.id}`}
                              className="font-mono text-xs font-semibold text-[#0F1E36] hover:underline"
                            >
                              {akta.nomor_akta}
                            </Link>
                            <Link
                              to={`/akta/${akta.id}`}
                              className="block font-medium text-slate-900 hover:text-blue-700 mt-0.5"
                            >
                              {akta.judul}
                            </Link>
                          </td>
                          <td className="py-3.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                            {akta.jenis}
                          </td>
                          <td className="py-3.5 px-3 text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            <div>{formatTanggal(akta.tanggal_akta)}</div>
                            <div className="text-slate-400">
                              Target: {formatTanggal(akta.target_selesai)}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <Badge variant={akta.status}>{statusMeta.label}</Badge>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                            {formatRupiah(akta.biaya)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                            {formatRupiah(akta.total_dibayar ?? 0)}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                              (akta.sisa_tagihan ?? 0) > 0 ? 'text-red-700' : 'text-slate-500'
                            }`}
                          >
                            {formatRupiah(akta.sisa_tagihan ?? 0)}
                          </td>
                          {user?.role === 'admin' && (
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError('');
                                  setDeleteTarget(akta);
                                }}
                                title="Hapus akta (Khusus Admin)"
                                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <ClientFormModal
            open={editModalOpen}
            client={detail.client}
            onClose={() => setEditModalOpen(false)}
            onSaved={() => loadDetail()}
          />

          <AktaFormModal
            open={aktaModalOpen}
            lockedClient={detail.client}
            onClose={() => setAktaModalOpen(false)}
            onSaved={() => loadDetail()}
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
                ? Dokumen lampiran dan pembayaran terkait juga akan dihapus.
              </>
            }
            confirmLabel="Hapus Akta"
            loading={deleting}
            error={deleteError}
            onConfirm={handleConfirmDeleteAkta}
            onCancel={() => setDeleteTarget(null)}
          />
        </div>
      ) : null}
    </Layout>
  );
}
