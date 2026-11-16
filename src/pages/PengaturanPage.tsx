import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { OfficeLogo } from '../components/OfficeLogo.tsx';
import { Button, ConfirmDialog } from '../components/ui/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError, getStoredToken } from '../lib/api.ts';

export function PengaturanPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);

  const [namaKantor, setNamaKantor] = useState('');
  const [namaNotaris, setNamaNotaris] = useState('');
  const [skPengangkatan, setSkPengangkatan] = useState('');
  const [alamatKantor, setAlamatKantor] = useState('');
  const [teleponKantor, setTeleponKantor] = useState('');
  const [emailKantor, setEmailKantor] = useState('');
  const [logoFilename, setLogoFilename] = useState('');
  const [logoRefreshKey, setLogoRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const applySettings = (data: Record<string, string>) => {
    setNamaKantor(data.nama_kantor || '');
    setNamaNotaris(data.nama_notaris || '');
    setSkPengangkatan(data.sk_pengangkatan || '');
    setAlamatKantor(data.alamat_kantor || '');
    setTeleponKantor(data.telepon_kantor || '');
    setEmailKantor(data.email_kantor || '');
    setLogoFilename(data.logo_kantor || '');
  };

  useEffect(() => {
    setLoading(true);
    apiRequest<{ data: Record<string, string> }>('/api/admin/settings')
      .then((res) => applySettings(res.data))
      .catch((err) => {
        if (err instanceof ApiClientError) setError(err.message);
        else setError('Gagal memuat pengaturan kantor.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiRequest<{ data: Record<string, string> }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          nama_kantor: namaKantor.trim(),
          nama_notaris: namaNotaris.trim(),
          sk_pengangkatan: skPengangkatan.trim(),
          alamat_kantor: alamatKantor.trim(),
          telepon_kantor: teleponKantor.trim(),
          email_kantor: emailKantor.trim(),
        }),
      });
      applySettings(res.data);
      setSuccess('Pengaturan kantor berhasil disimpan.');
      toast.success('Pengaturan kantor berhasil disimpan.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError('Gagal menyimpan pengaturan kantor.');
        toast.error('Gagal menyimpan pengaturan kantor.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const token = getStoredToken();
      const resp = await fetch('/api/admin/settings/logo', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(payload.error || 'Gagal mengunggah logo.');
      }
      applySettings(payload.data);
      setLogoRefreshKey((k) => k + 1);
      setSuccess('Logo kantor berhasil diperbarui.');
      toast.success('Logo kantor berhasil diperbarui.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah logo.';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest<{ data: Record<string, string> }>('/api/admin/settings/logo', {
        method: 'DELETE',
      });
      applySettings(res.data);
      setLogoRefreshKey((k) => k + 1);
      setSuccess('Logo kantor berhasil dihapus.');
      toast.success('Logo kantor berhasil dihapus.');
      setConfirmRemoveLogo(false);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Gagal menghapus logo.';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <Layout
      title="Pengaturan Kantor"
      breadcrumb="Administrasi Notaris / Profil & Kop Surat"
    >
      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-80 animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Pengaturan */}
          <form
            onSubmit={handleSaveSettings}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Identitas Kantor Notaris</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Informasi ini otomatis digunakan pada kop kuitansi pembayaran dan kop laporan.
              </p>
            </div>

            <div>
              <label htmlFor="set-nama-kantor" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nama Kantor <span className="text-red-600">*</span>
              </label>
              <input
                id="set-nama-kantor"
                type="text"
                required
                value={namaKantor}
                onChange={(e) => setNamaKantor(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="set-notaris" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nama Notaris <span className="text-red-600">*</span>
                </label>
                <input
                  id="set-notaris"
                  type="text"
                  required
                  value={namaNotaris}
                  onChange={(e) => setNamaNotaris(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="set-sk" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nomor SK Pengangkatan
                </label>
                <input
                  id="set-sk"
                  type="text"
                  value={skPengangkatan}
                  onChange={(e) => setSkPengangkatan(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="set-telp" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Telepon <span className="text-red-600">*</span>
                </label>
                <input
                  id="set-telp"
                  type="text"
                  required
                  value={teleponKantor}
                  onChange={(e) => setTeleponKantor(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="set-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Kantor <span className="text-red-600">*</span>
                </label>
                <input
                  id="set-email"
                  type="email"
                  required
                  value={emailKantor}
                  onChange={(e) => setEmailKantor(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="set-alamat" className="block text-sm font-medium text-slate-700 mb-1.5">
                Alamat Kantor <span className="text-red-600">*</span>
              </label>
              <textarea
                id="set-alamat"
                rows={3}
                required
                value={alamatKantor}
                onChange={(e) => setAlamatKantor(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </div>
          </form>

          {/* Logo & Live Kop Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900">Logo Kantor</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Format PNG, JPG, atau WEBP (maksimal 2 MB).
              </p>

              <div className="mt-4 flex items-center gap-4">
                <OfficeLogo
                  logoFilename={logoFilename}
                  sizeClass="w-16 h-16"
                  refreshKey={logoRefreshKey}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadLogo(f);
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingLogo ? 'Mengunggah...' : 'Unggah Logo'}</span>
                  </Button>

                  {logoFilename && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={uploadingLogo}
                      onClick={() => setConfirmRemoveLogo(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-medium text-slate-500 mb-3">
                Pratinjau Kop Kuitansi & Laporan
              </p>
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="pb-3 border-b-2 border-[#0F1E36] flex items-start gap-3">
                  <OfficeLogo
                    logoFilename={logoFilename}
                    sizeClass="w-12 h-12"
                    refreshKey={logoRefreshKey}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0F1E36]">
                      {namaKantor || 'Nama Kantor Notaris'}
                    </p>
                    {namaNotaris && (
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">
                        Notaris & PPAT: {namaNotaris}
                      </p>
                    )}
                    {skPengangkatan && (
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        SK: {skPengangkatan}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-600 mt-1">
                      {alamatKantor || '-'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Telp: {teleponKantor || '-'} · Email: {emailKantor || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRemoveLogo}
        title="Hapus Logo Kantor"
        message="Apakah Anda yakin ingin menghapus logo kantor? Kop kuitansi dan laporan akan tampil tanpa logo hingga logo baru diunggah."
        confirmLabel="Hapus Logo"
        loading={uploadingLogo}
        onConfirm={handleRemoveLogo}
        onCancel={() => setConfirmRemoveLogo(false)}
      />
    </Layout>
  );
}
