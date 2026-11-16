import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import type { Client, ClientJenis } from '../types/index.ts';

interface ClientFormModalProps {
  open: boolean;
  client?: Client | null;
  onClose: () => void;
  onSaved: (saved: Client) => void;
}

interface FormState {
  jenis: ClientJenis;
  nama: string;
  nik: string;
  npwp: string;
  email: string;
  hp: string;
  alamat: string;
  pekerjaan: string;
  status_perkawinan: string;
  catatan: string;
}

const EMPTY_FORM: FormState = {
  jenis: 'perorangan',
  nama: '',
  nik: '',
  npwp: '',
  email: '',
  hp: '',
  alamat: '',
  pekerjaan: '',
  status_perkawinan: 'Belum Kawin',
  catatan: '',
};

const MARITAL_OPTIONS = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];

export function ClientFormModal({ open, client, onClose, onSaved }: ClientFormModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (client) {
      setForm({
        jenis: client.jenis,
        nama: client.nama || '',
        nik: client.nik || '',
        npwp: client.npwp || '',
        email: client.email || '',
        hp: client.hp || '',
        alamat: client.alamat || '',
        pekerjaan: client.pekerjaan || '',
        status_perkawinan:
          client.status_perkawinan || (client.jenis === 'perorangan' ? 'Belum Kawin' : 'Tidak Berlaku'),
        catatan: client.catatan || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setGeneralError('');
  }, [open, client]);

  if (!open) return null;

  const validateClientForm = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (form.nama.trim().length < 2) {
      errs.nama = 'Nama minimal 2 karakter';
    }
    if (form.jenis === 'perorangan') {
      if (!/^\d{16}$/.test(form.nik.trim())) {
        errs.nik = 'NIK perorangan harus tepat 16 digit angka';
      }
      if (!/^\d{16}$/.test(form.npwp.trim())) {
        errs.npwp = 'NPWP perorangan harus tepat 16 digit angka';
      }
    } else {
      if (form.nik.trim() && !/^\d{16}$/.test(form.nik.trim())) {
        errs.nik = 'NIK penanggung jawab harus 16 digit angka jika diisi';
      }
      if (form.npwp.trim() && !/^\d{15,16}$/.test(form.npwp.trim())) {
        errs.npwp = 'NPWP perusahaan harus 15 atau 16 digit angka jika diisi';
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Format email tidak valid';
    }
    if (form.hp.trim().length < 8 || !/^[0-9+\-\s]+$/.test(form.hp.trim())) {
      errs.hp = 'Nomor HP minimal 8 digit dan hanya berisi angka/+/strip';
    }
    if (form.alamat.trim().length < 5) {
      errs.alamat = 'Alamat minimal 5 karakter';
    }
    return errs;
  };

  const handleJenisChange = (jenis: ClientJenis) => {
    setForm((prev) => ({
      ...prev,
      jenis,
      status_perkawinan:
        jenis === 'perusahaan'
          ? 'Tidak Berlaku'
          : prev.status_perkawinan === 'Tidak Berlaku' || !prev.status_perkawinan
            ? 'Belum Kawin'
            : prev.status_perkawinan,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.nik;
      delete next.npwp;
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const localErrors = validateClientForm();
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setGeneralError('Mohon periksa kembali isian yang ditandai.');
      return;
    }

    setSubmitting(true);
    setErrors({});
    setGeneralError('');

    try {
      const payload = {
        ...form,
        nik: form.nik.trim(),
        npwp: form.npwp.trim(),
        email: form.email.trim(),
        hp: form.hp.trim(),
        alamat: form.alamat.trim(),
        pekerjaan: form.pekerjaan.trim(),
        status_perkawinan:
          form.jenis === 'perusahaan' ? 'Tidak Berlaku' : form.status_perkawinan,
        catatan: form.catatan.trim(),
      };

      const res = client
        ? await apiRequest<{ data: Client }>(`/api/clients/${client.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ data: Client }>('/api/clients', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      toast.success(
        client
          ? `Data klien "${res.data.nama}" berhasil diperbarui.`
          : `Klien baru "${res.data.nama}" berhasil ditambahkan.`
      );
      onSaved(res.data);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setGeneralError(err.message);
        if (err.details) {
          setErrors(err.details);
        }
        toast.error(err.message);
      } else {
        setGeneralError('Gagal menyimpan data klien.');
        toast.error('Gagal menyimpan data klien.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
        className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="client-modal-title" className="text-lg font-semibold text-slate-900">
            {client ? 'Edit Data Klien' : 'Tambah Klien Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {generalError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {generalError}
            </div>
          )}

          {/* Jenis Klien */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Jenis Klien <span className="text-red-600">*</span>
            </label>
            <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
              {(['perorangan', 'perusahaan'] as ClientJenis[]).map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => handleJenisChange(j)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    form.jenis === j
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {j === 'perorangan' ? 'Perorangan' : 'Perusahaan'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="client-nama" className="block text-sm font-medium text-slate-700 mb-1.5">
                {form.jenis === 'perorangan' ? 'Nama Lengkap' : 'Nama Perusahaan / Badan Usaha'}{' '}
                <span className="text-red-600">*</span>
              </label>
              <input
                id="client-nama"
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder={
                  form.jenis === 'perorangan'
                    ? 'Contoh: Ahmad Fauzi Pratama'
                    : 'Contoh: PT Nusantara Maju Sejahtera'
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
              {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="client-nik" className="block text-sm font-medium text-slate-700">
                  {form.jenis === 'perorangan' ? 'NIK (16 Digit)' : 'NIK Penanggung Jawab'}
                  {form.jenis === 'perorangan' && <span className="text-red-600"> *</span>}
                </label>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {form.nik.length}/16
                </span>
              </div>
              <input
                id="client-nik"
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={form.nik}
                onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, '') })}
                placeholder="3174011505850001"
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
              {errors.nik && <p className="mt-1 text-xs text-red-600">{errors.nik}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="client-npwp" className="block text-sm font-medium text-slate-700">
                  {form.jenis === 'perorangan' ? 'NPWP (16 Digit)' : 'NPWP Perusahaan'}
                  {form.jenis === 'perorangan' && <span className="text-red-600"> *</span>}
                </label>
                {form.jenis === 'perorangan' && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, npwp: prev.nik }))}
                    className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                  >
                    Samakan dengan NIK
                  </button>
                )}
              </div>
              <input
                id="client-npwp"
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={form.npwp}
                onChange={(e) => setForm({ ...form, npwp: e.target.value.replace(/\D/g, '') })}
                placeholder="16 digit angka NPWP"
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
              {errors.npwp && <p className="mt-1 text-xs text-red-600">{errors.npwp}</p>}
            </div>

            <div>
              <label htmlFor="client-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@domain.com"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="client-hp" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nomor HP / Telepon <span className="text-red-600">*</span>
              </label>
              <input
                id="client-hp"
                type="text"
                value={form.hp}
                onChange={(e) => setForm({ ...form, hp: e.target.value })}
                placeholder="081234567890"
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
              {errors.hp && <p className="mt-1 text-xs text-red-600">{errors.hp}</p>}
            </div>

            <div>
              <label htmlFor="client-pekerjaan" className="block text-sm font-medium text-slate-700 mb-1.5">
                {form.jenis === 'perorangan' ? 'Pekerjaan' : 'Bidang Usaha'}
              </label>
              <input
                id="client-pekerjaan"
                type="text"
                value={form.pekerjaan}
                onChange={(e) => setForm({ ...form, pekerjaan: e.target.value })}
                placeholder={
                  form.jenis === 'perorangan' ? 'Contoh: Wiraswasta' : 'Contoh: Perdagangan & Logistik'
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
            </div>

            <div>
              <label htmlFor="client-status" className="block text-sm font-medium text-slate-700 mb-1.5">
                Status Perkawinan
              </label>
              {form.jenis === 'perorangan' ? (
                <select
                  id="client-status"
                  value={form.status_perkawinan}
                  onChange={(e) => setForm({ ...form, status_perkawinan: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
                >
                  {MARITAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="client-status"
                  type="text"
                  value="Tidak Berlaku"
                  disabled
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="client-alamat" className="block text-sm font-medium text-slate-700 mb-1.5">
                Alamat Lengkap <span className="text-red-600">*</span>
              </label>
              <textarea
                id="client-alamat"
                rows={2}
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                placeholder="Jl. Sudirman No. 10, Jakarta Selatan"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
              {errors.alamat && <p className="mt-1 text-xs text-red-600">{errors.alamat}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="client-catatan" className="block text-sm font-medium text-slate-700 mb-1.5">
                Catatan
              </label>
              <textarea
                id="client-catatan"
                rows={2}
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                placeholder="Catatan tambahan mengenai klien atau keperluan akta..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'Menyimpan...' : client ? 'Simpan Perubahan' : 'Simpan Klien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
