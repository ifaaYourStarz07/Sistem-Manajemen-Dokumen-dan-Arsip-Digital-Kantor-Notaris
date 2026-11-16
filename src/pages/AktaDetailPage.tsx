import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  History,
  Image as ImageIcon,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { AktaFormModal } from '../components/AktaFormModal.tsx';
import { KuitansiModal } from '../components/KuitansiModal.tsx';
import { Badge, Button, ConfirmDialog } from '../components/ui/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError, getStoredToken } from '../lib/api.ts';
import {
  formatFileSize,
  formatMetodeBayar,
  formatRupiah,
  formatStatusAkta,
  formatStatusPembayaran,
  formatTanggal,
  formatTanggalWaktu,
} from '../lib/format.ts';
import type {
  AktaDetailResponse,
  DokumenItem,
  MetodePembayaran,
  PembayaranItem,
} from '../types/index.ts';

export function AktaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [detail, setDetail] = useState<AktaDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteAktaModalOpen, setDeleteAktaModalOpen] = useState(false);
  const [deletingAkta, setDeletingAkta] = useState(false);
  const [deleteAktaError, setDeleteAktaError] = useState('');

  const [deleteDocTarget, setDeleteDocTarget] = useState<DokumenItem | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  const [deletePayTarget, setDeletePayTarget] = useState<PembayaranItem | null>(null);
  const [deletingPay, setDeletingPay] = useState(false);

  // Upload dokumen state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Preview modal state (authenticated Blob URL)
  const [previewDoc, setPreviewDoc] = useState<DokumenItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // Payment form state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payJumlah, setPayJumlah] = useState('');
  const [payTanggal, setPayTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [payMetode, setPayMetode] = useState<MetodePembayaran>('transfer');
  const [payCatatan, setPayCatatan] = useState('');
  const [payError, setPayError] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Kuitansi modal
  const [kuitansiId, setKuitansiId] = useState<number | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<AktaDetailResponse>(`/api/akta/${id}`);
      setDetail(res);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal memuat detail akta.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Cleanup preview Blob URL on close/unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleUploadFiles = (files: FileList | File[]) => {
    if (!detail || files.length === 0) return;

    const fileArray = Array.from(files);
    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    for (const f of fileArray) {
      if (!allowedTypes.has(f.type)) {
        setUploadError(`File "${f.name}" bukan PDF, JPG, atau PNG.`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setUploadError(`Ukuran file "${f.name}" melebihi batas maksimal 5 MB.`);
        return;
      }
    }

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    for (const f of fileArray) {
      formData.append('files', f);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/dokumen/akta/${detail.akta.id}`);
    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadProgress(100);
        const msg = `${fileArray.length} dokumen berhasil diunggah.`;
        setUploadSuccess(msg);
        toast.success(msg);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadDetail();
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText);
          const msg = parsed.error || 'Gagal mengunggah dokumen.';
          setUploadError(msg);
          toast.error(msg);
        } catch {
          setUploadError('Gagal mengunggah dokumen.');
          toast.error('Gagal mengunggah dokumen.');
        }
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setUploadError('Terjadi gangguan jaringan saat mengunggah dokumen.');
    };

    xhr.send(formData);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleOpenPreview = async (doc: DokumenItem) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const token = getStoredToken();
      const resp = await fetch(`/api/dokumen/${doc.id}/file`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const errPayload = await resp.json().catch(() => ({}));
        throw new Error(errPayload.error || 'Gagal memuat pratinjau dokumen.');
      }
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      setPreviewUrl(objUrl);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Gagal memuat dokumen.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewDoc(null);
    setPreviewError('');
  };

  const handleDownloadDoc = async (doc: DokumenItem) => {
    try {
      const token = getStoredToken();
      const resp = await fetch(`/api/dokumen/${doc.id}/file?download=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nama_file;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleConfirmDeleteDoc = async () => {
    if (!deleteDocTarget) return;
    setDeletingDoc(true);
    try {
      await apiRequest(`/api/dokumen/${deleteDocTarget.id}`, { method: 'DELETE' });
      toast.success(`Dokumen "${deleteDocTarget.nama_file}" berhasil dihapus.`);
      setDeleteDocTarget(null);
      loadDetail();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Gagal menghapus dokumen.';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setDeletingDoc(false);
    }
  };

  const handleOpenPayModal = () => {
    if (!detail) return;
    setPayJumlah(String(detail.ringkasanPembayaran.sisaTagihan));
    setPayTanggal(new Date().toISOString().slice(0, 10));
    setPayMetode('transfer');
    setPayCatatan('');
    setPayError('');
    setPayModalOpen(true);
  };

  const handleSubmitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;

    const nominal = Number(payJumlah);
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setPayError('Jumlah pembayaran harus lebih dari Rp 0.');
      return;
    }
    if (nominal > detail.ringkasanPembayaran.sisaTagihan) {
      setPayError(
        `Jumlah pembayaran melebihi sisa tagihan (${formatRupiah(
          detail.ringkasanPembayaran.sisaTagihan
        )}).`
      );
      return;
    }

    setPaySubmitting(true);
    setPayError('');
    try {
      await apiRequest('/api/pembayaran', {
        method: 'POST',
        body: JSON.stringify({
          akta_id: detail.akta.id,
          jumlah: nominal,
          tanggal_bayar: payTanggal,
          metode: payMetode,
          keterangan: payCatatan.trim(),
        }),
      });
      toast.success('Pembayaran berhasil dicatat.');
      setPayModalOpen(false);
      loadDetail();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setPayError(err.message);
        toast.error(err.message);
      } else {
        setPayError('Gagal mencatat pembayaran.');
        toast.error('Gagal mencatat pembayaran.');
      }
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!deletePayTarget) return;
    setDeletingPay(true);
    try {
      await apiRequest(`/api/pembayaran/${deletePayTarget.id}`, { method: 'DELETE' });
      toast.success(`Pembayaran "${deletePayTarget.nomor_kwitansi}" berhasil dihapus.`);
      setDeletePayTarget(null);
      loadDetail();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Gagal menghapus pembayaran.';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingPay(false);
    }
  };

  const handleConfirmDeleteAkta = async () => {
    if (!detail) return;
    setDeletingAkta(true);
    setDeleteAktaError('');
    try {
      await apiRequest(`/api/akta/${detail.akta.id}`, { method: 'DELETE' });
      toast.success(`Akta "${detail.akta.nomor_akta}" berhasil dihapus.`);
      navigate('/akta', { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setDeleteAktaError(err.message);
        toast.error(err.message);
      } else {
        setDeleteAktaError('Gagal menghapus akta.');
        toast.error('Gagal menghapus akta.');
      }
    } finally {
      setDeletingAkta(false);
    }
  };

  return (
    <Layout
      title={detail ? detail.akta.nomor_akta : 'Detail Akta'}
      breadcrumb="Akta / Detail Berkas, Dokumen & Pembayaran"
      actions={
        detail ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Akta</span>
            </Button>
            {user?.role === 'admin' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteAktaError('');
                  setDeleteAktaModalOpen(true);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Akta</span>
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="no-print mb-5">
        <Link
          to="/akta"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Akta</span>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !detail ? (
        <div className="space-y-6 animate-pulse">
          <div className="bg-white border border-slate-200 rounded-xl h-48" />
          <div className="bg-white border border-slate-200 rounded-xl h-56" />
        </div>
      ) : detail ? (
        <div className="no-print space-y-6">
          {/* Top Grid: Akta Info + Status Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Detail Akta */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
              <div className="pb-4 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono font-semibold text-slate-500">
                    {detail.akta.nomor_akta} · {detail.akta.jenis}
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{detail.akta.judul}</h2>
                </div>
                <Badge variant={detail.akta.status}>
                  {formatStatusAkta(detail.akta.status).label}
                </Badge>
              </div>

              <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-xs font-medium text-slate-500">Klien</dt>
                  <dd className="mt-1 font-medium">
                    <Link
                      to={`/klien/${detail.akta.client_id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {detail.akta.client_nama}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Kontak Klien</dt>
                  <dd className="mt-1 font-mono text-xs text-slate-700">
                    {detail.akta.client_hp || '-'} · {detail.akta.client_email || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Tanggal Akta</dt>
                  <dd className="mt-1 font-mono tabular-nums text-slate-900">
                    {formatTanggal(detail.akta.tanggal_akta)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Target Selesai</dt>
                  <dd className="mt-1 font-mono tabular-nums text-slate-900">
                    {formatTanggal(detail.akta.target_selesai)}
                  </dd>
                </div>
                {detail.akta.tanggal_selesai && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Tanggal Selesai Aktual</dt>
                    <dd className="mt-1 font-mono tabular-nums text-emerald-700 font-medium">
                      {formatTanggal(detail.akta.tanggal_selesai)}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Catatan</dt>
                  <dd className="mt-1 text-slate-700">{detail.akta.catatan || '-'}</dd>
                </div>
              </dl>
            </section>

            {/* Timeline Riwayat Status */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
              <div className="pb-4 border-b border-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h2 className="text-base font-semibold text-slate-900">
                  Timeline Riwayat Status
                </h2>
              </div>

              <div className="mt-4 space-y-4 max-h-72 overflow-y-auto pr-1">
                {detail.statusHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada riwayat perubahan status.</p>
                ) : (
                  detail.statusHistory.map((item) => {
                    const keLabel = formatStatusAkta(item.ke_status).label;
                    const dariLabel = item.dari_status
                      ? formatStatusAkta(item.dari_status).label
                      : null;
                    return (
                      <div
                        key={item.id}
                        className="pb-3.5 border-b border-slate-100 last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-900">
                            {dariLabel ? `${dariLabel} → ${keLabel}` : `Status Awal: ${keLabel}`}
                          </span>
                          <span className="font-mono tabular-nums text-slate-500">
                            {formatTanggalWaktu(item.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Oleh <span className="font-medium text-slate-800">{item.diubah_oleh_nama}</span>
                          {item.catatan ? ` · ${item.catatan}` : ''}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Pembayaran Section */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-slate-900">
                      Pembayaran & Penagihan
                    </h2>
                    <Badge variant={detail.ringkasanPembayaran.statusPembayaran}>
                      {
                        formatStatusPembayaran(detail.ringkasanPembayaran.statusPembayaran)
                          .label
                      }
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Rincian biaya jasa, progress pelunasan, dan kuitansi pembayaran
                  </p>
                </div>

                {detail.ringkasanPembayaran.sisaTagihan > 0 && (
                  <Button variant="primary" size="sm" onClick={handleOpenPayModal}>
                    <Plus className="w-4 h-4" />
                    <span>Tambah Pembayaran</span>
                  </Button>
                )}
              </div>

              {/* Financial Metrics + Progress Bar */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">Total Biaya</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                    {formatRupiah(detail.ringkasanPembayaran.totalBiaya)}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">Total Dibayar</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                    {formatRupiah(detail.ringkasanPembayaran.totalDibayar)}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">Sisa Tagihan</p>
                  <p
                    className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                      detail.ringkasanPembayaran.sisaTagihan > 0
                        ? 'text-red-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatRupiah(detail.ringkasanPembayaran.sisaTagihan)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                  <span>Progress Pelunasan</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {detail.ringkasanPembayaran.persentase}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      detail.ringkasanPembayaran.statusPembayaran === 'lunas'
                        ? 'bg-emerald-600'
                        : 'bg-[#0F1E36]'
                    }`}
                    style={{ width: `${detail.ringkasanPembayaran.persentase}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">No. Kuitansi</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Metode</th>
                    <th className="py-2.5 px-3">Catatan</th>
                    <th className="py-2.5 px-3 text-right">Jumlah</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {detail.pembayaran.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                        Belum ada pembayaran tercatat untuk akta ini.
                      </td>
                    </tr>
                  ) : (
                    detail.pembayaran.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                          {pay.nomor_kwitansi}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                          {formatTanggal(pay.tanggal_bayar)}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-700 whitespace-nowrap">
                          {formatMetodeBayar(pay.metode)}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600">
                          {pay.keterangan || '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                          {formatRupiah(pay.jumlah)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setKuitansiId(pay.id)}
                              title="Cetak Kuitansi"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0F1E36] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Kuitansi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletePayTarget(pay)}
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
              </table>
            </div>
          </section>

          {/* Dokumen Akta Section */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">Dokumen & Lampiran Akta</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah banyak file sekaligus (PDF, JPG, PNG · maks 5 MB per file). File hanya
                dapat diakses oleh pengguna yang masuk.
              </p>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                {uploadSuccess}
              </div>
            )}

            {/* Drag and Drop Upload Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragActive
                  ? 'border-[#0F1E36] bg-slate-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <Upload className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="mt-2 text-sm font-medium text-slate-800">
                Seret & lepas file ke sini, atau pilih dari perangkat
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Mendukung PDF, JPG, PNG · Maksimal 5 MB per file
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  if (e.target.files) {
                    handleUploadFiles(e.target.files);
                  }
                }}
                className="hidden"
              />

              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60 cursor-pointer"
              >
                {uploading ? 'Mengunggah...' : 'Pilih File Dokumen'}
              </button>

              {uploading && (
                <div className="mt-4 max-w-sm mx-auto">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Mengunggah berkas...</span>
                    <span className="font-mono tabular-nums">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0F1E36] transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* List of Uploaded Documents */}
            <div className="mt-5 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {detail.dokumen.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Belum ada dokumen diunggah untuk akta ini.
                </div>
              ) : (
                detail.dokumen.map((doc) => {
                  const isPdf = doc.mime_type === 'application/pdf';
                  return (
                    <div
                      key={doc.id}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          {isPdf ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {doc.nama_file}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                            {formatFileSize(doc.ukuran)} · Diunggah{' '}
                            {formatTanggalWaktu(doc.created_at)}
                            {doc.uploaded_by_nama ? ` · ${doc.uploaded_by_nama}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pratinjau</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDocTarget(doc)}
                          title="Hapus dokumen"
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      ) : null}

      {/* Edit Akta Modal */}
      {detail && (
        <AktaFormModal
          open={editModalOpen}
          akta={detail.akta}
          onClose={() => setEditModalOpen(false)}
          onSaved={() => loadDetail()}
        />
      )}

      {/* Tambah Pembayaran Modal */}
      {payModalOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Catat Pembayaran</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sisa tagihan: {formatRupiah(detail.ringkasanPembayaran.sisaTagihan)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              {payError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {payError}
                </div>
              )}

              <div>
                <label htmlFor="pay-jumlah" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Jumlah Pembayaran (Rp) <span className="text-red-600">*</span>
                </label>
                <input
                  id="pay-jumlah"
                  type="number"
                  min={1}
                  required
                  value={payJumlah}
                  onChange={(e) => setPayJumlah(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pay-tanggal" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tanggal Bayar <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="pay-tanggal"
                    type="date"
                    required
                    value={payTanggal}
                    onChange={(e) => setPayTanggal(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
                  />
                </div>

                <div>
                  <label htmlFor="pay-metode" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Metode <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="pay-metode"
                    value={payMetode}
                    onChange={(e) => setPayMetode(e.target.value as MetodePembayaran)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
                  >
                    <option value="transfer">Transfer Bank</option>
                    <option value="tunai">Tunai</option>
                    <option value="qris">QRIS</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="pay-catatan" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Catatan
                </label>
                <textarea
                  id="pay-catatan"
                  rows={2}
                  value={payCatatan}
                  onChange={(e) => setPayCatatan(e.target.value)}
                  placeholder="Contoh: Termin 1 / Pelunasan lunas"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  {paySubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Dokumen Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {previewDoc.nama_file}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDoc)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
                <button
                  type="button"
                  onClick={handleClosePreview}
                  aria-label="Tutup pratinjau"
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4">
              {previewLoading ? (
                <p className="text-sm text-slate-600">Memuat dokumen...</p>
              ) : previewError ? (
                <p className="text-sm text-red-700">{previewError}</p>
              ) : previewUrl ? (
                previewDoc.mime_type === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    title={previewDoc.nama_file}
                    className="w-full h-full rounded-lg bg-white border border-slate-200"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={previewDoc.nama_file}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-xs"
                  />
                )
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Delete Akta Confirmation Modal (Admin only) */}
      <ConfirmDialog
        open={Boolean(deleteAktaModalOpen && detail)}
        title="Hapus Akta Permanen"
        message={
          <>
            Apakah Anda yakin ingin menghapus akta{' '}
            <span className="font-mono font-semibold text-slate-900">
              {detail?.akta.nomor_akta}
            </span>
            ? Seluruh dokumen lampiran, file fisik, dan riwayat pembayaran juga akan dihapus.
          </>
        }
        confirmLabel="Hapus Permanen"
        loading={deletingAkta}
        error={deleteAktaError}
        onConfirm={handleConfirmDeleteAkta}
        onCancel={() => setDeleteAktaModalOpen(false)}
      />

      {/* Delete Document Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteDocTarget)}
        title="Hapus Dokumen Lampiran"
        message={
          <>
            Apakah Anda yakin ingin menghapus dokumen{' '}
            <span className="font-semibold text-slate-900">{deleteDocTarget?.nama_file}</span>?
          </>
        }
        confirmLabel="Hapus Dokumen"
        loading={deletingDoc}
        onConfirm={handleConfirmDeleteDoc}
        onCancel={() => setDeleteDocTarget(null)}
      />

      {/* Delete Payment Confirmation */}
      <ConfirmDialog
        open={Boolean(deletePayTarget)}
        title="Hapus Pembayaran"
        message={
          <>
            Apakah Anda yakin ingin menghapus catatan pembayaran{' '}
            <span className="font-mono font-semibold text-slate-900">
              {deletePayTarget?.nomor_kwitansi}
            </span>
            ?
          </>
        }
        confirmLabel="Hapus Pembayaran"
        loading={deletingPay}
        onConfirm={handleConfirmDeletePayment}
        onCancel={() => setDeletePayTarget(null)}
      />

      <KuitansiModal pembayaranId={kuitansiId} onClose={() => setKuitansiId(null)} />
    </Layout>
  );
}
