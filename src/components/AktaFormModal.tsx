import { useEffect, useState, type FormEvent } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import { JENIS_AKTA_OPTIONS, type Akta, type AktaStatus, type Client } from '../types/index.ts';

interface AktaFormModalProps {
  open: boolean;
  lockedClient?: Client | null;
  akta?: Akta | null;
  onClose: () => void;
  onSaved: (akta: Akta) => void;
}

export function AktaFormModal({
  open,
  lockedClient,
  akta,
  onClose,
  onSaved,
}: AktaFormModalProps) {
  const toast = useToast();
  const todayISO = new Date().toISOString().slice(0, 10);
  const plus14 = new Date();
  plus14.setDate(plus14.getDate() + 14);
  const defaultTargetISO = plus14.toISOString().slice(0, 10);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>('');
  const [nomorAkta, setNomorAkta] = useState('');
  const [judul, setJudul] = useState('');
  const [jenis, setJenis] = useState<string>(JENIS_AKTA_OPTIONS[0]);
  const [tanggalAkta, setTanggalAkta] = useState(todayISO);
  const [targetSelesai, setTargetSelesai] = useState(defaultTargetISO);
  const [status, setStatus] = useState<AktaStatus>('draft');
  const [biaya, setBiaya] = useState('5000000');
  const [catatan, setCatatan] = useState('');
  const [statusCatatan, setStatusCatatan] = useState('');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleGenerateNumber = async (tanggalRef?: string) => {
    setGenerating(true);
    try {
      const tgl = tanggalRef || tanggalAkta || todayISO;
      const res = await apiRequest<{ nomor_akta: string }>(
        `/api/akta/generate-number?tanggal=${encodeURIComponent(tgl)}`
      );
      setNomorAkta(res.nomor_akta);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.nomor_akta;
        return next;
      });
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    setError('');
    setFieldErrors({});
    setStatusCatatan('');

    if (!lockedClient) {
      apiRequest<{ data: Client[] }>('/api/clients?limit=50&sortBy=nama&sortOrder=asc')
        .then((res) => {
          setClients(res.data);
          if (!akta && res.data.length > 0) {
            setClientId((prev) => prev || String(res.data[0].id));
          }
        })
        .catch(() => {});
    }

    if (akta) {
      setClientId(String(akta.client_id));
      setNomorAkta(akta.nomor_akta);
      setJudul(akta.judul || '');
      setJenis(
        JENIS_AKTA_OPTIONS.includes(akta.jenis as (typeof JENIS_AKTA_OPTIONS)[number])
          ? akta.jenis
          : 'Lainnya'
      );
      setTanggalAkta(akta.tanggal_akta);
      setTargetSelesai(akta.target_selesai);
      setStatus(akta.status);
      setBiaya(String(akta.biaya ?? 0));
      setCatatan(akta.catatan || '');
    } else {
      setClientId(lockedClient ? String(lockedClient.id) : '');
      setNomorAkta('');
      setJudul('');
      setJenis(JENIS_AKTA_OPTIONS[0]);
      setTanggalAkta(todayISO);
      setTargetSelesai(defaultTargetISO);
      setStatus('draft');
      setBiaya('5000000');
      setCatatan('');
      handleGenerateNumber(todayISO);
    }
  }, [open, lockedClient, akta, todayISO, defaultTargetISO]);

  if (!open) return null;

  const isStatusChanged = Boolean(akta && akta.status !== status);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});

    try {
      const payload = {
        client_id: lockedClient ? lockedClient.id : Number(clientId),
        nomor_akta: nomorAkta.trim(),
        judul: judul.trim(),
        jenis,
        tanggal_akta: tanggalAkta,
        target_selesai: targetSelesai,
        status,
        biaya: Number(biaya) || 0,
        catatan: catatan.trim(),
        status_catatan: statusCatatan.trim(),
      };

      const res = akta
        ? await apiRequest<{ data: Akta }>(`/api/akta/${akta.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ data: Akta }>('/api/akta', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      toast.success(
        akta
          ? `Akta "${res.data.nomor_akta}" berhasil diperbarui.`
          : `Akta baru "${res.data.nomor_akta}" berhasil disimpan.`
      );
      onSaved(res.data);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        if (err.details) {
          setFieldErrors(err.details);
        }
        toast.error(err.message);
      } else {
        setError('Gagal menyimpan data akta.');
        toast.error('Gagal menyimpan data akta.');
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
        aria-labelledby="akta-modal-title"
        className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="akta-modal-title" className="text-lg font-semibold text-slate-900">
              {akta ? 'Edit Data Akta' : 'Tambah Akta Baru'}
            </h2>
            {lockedClient && (
              <p className="text-xs text-slate-500 mt-0.5">
                Klien terpilih: <span className="font-medium text-slate-800">{lockedClient.nama}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!lockedClient && (
              <div className="sm:col-span-2">
                <label htmlFor="akta-klien" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Klien <span className="text-red-600">*</span>
                </label>
                <select
                  id="akta-klien"
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
                >
                  <option value="">-- Pilih Klien --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama} ({c.jenis === 'perorangan' ? 'Perorangan' : 'Perusahaan'})
                    </option>
                  ))}
                </select>
                {fieldErrors.client_id && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.client_id}</p>
                )}
              </div>
            )}

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="akta-nomor" className="block text-sm font-medium text-slate-700">
                  Nomor Akta <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleGenerateNumber()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#0F1E36] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generating ? 'Membuat...' : 'Generate nomor'}</span>
                </button>
              </div>
              <input
                id="akta-nomor"
                type="text"
                required
                value={nomorAkta}
                onChange={(e) => setNomorAkta(e.target.value)}
                placeholder="001/AKTA/XI/2026"
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Format: NNN/AKTA/BULAN-ROMAWI/TAHUN (reset tiap tahun, dapat diedit manual).
              </p>
              {fieldErrors.nomor_akta && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.nomor_akta}</p>
              )}
            </div>

            <div>
              <label htmlFor="akta-jenis" className="block text-sm font-medium text-slate-700 mb-1.5">
                Jenis Akta <span className="text-red-600">*</span>
              </label>
              <select
                id="akta-jenis"
                value={jenis}
                onChange={(e) => setJenis(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              >
                {JENIS_AKTA_OPTIONS.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="akta-status" className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                id="akta-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AktaStatus)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              >
                <option value="draft">Draft</option>
                <option value="proses">Proses</option>
                <option value="selesai">Selesai</option>
                <option value="diserahkan">Diserahkan</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="akta-judul" className="block text-sm font-medium text-slate-700 mb-1.5">
                Judul / Perihal Akta
              </label>
              <input
                id="akta-judul"
                type="text"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Kosongkan untuk otomatis dari jenis & nama klien"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
            </div>

            <div>
              <label htmlFor="akta-tanggal" className="block text-sm font-medium text-slate-700 mb-1.5">
                Tanggal Akta <span className="text-red-600">*</span>
              </label>
              <input
                id="akta-tanggal"
                type="date"
                required
                value={tanggalAkta}
                onChange={(e) => setTanggalAkta(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
            </div>

            <div>
              <label htmlFor="akta-target" className="block text-sm font-medium text-slate-700 mb-1.5">
                Target Selesai <span className="text-red-600">*</span>
              </label>
              <input
                id="akta-target"
                type="date"
                required
                value={targetSelesai}
                onChange={(e) => setTargetSelesai(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="akta-biaya" className="block text-sm font-medium text-slate-700 mb-1.5">
                Biaya Jasa (Rp) <span className="text-red-600">*</span>
              </label>
              <input
                id="akta-biaya"
                type="number"
                min={0}
                step={50000}
                required
                value={biaya}
                onChange={(e) => setBiaya(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
              />
            </div>

            {isStatusChanged && (
              <div className="sm:col-span-2">
                <label htmlFor="akta-status-catatan" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Keterangan Perubahan Status
                </label>
                <input
                  id="akta-status-catatan"
                  type="text"
                  value={statusCatatan}
                  onChange={(e) => setStatusCatatan(e.target.value)}
                  placeholder="Contoh: Minuta ditandatangani oleh para pihak"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="akta-catatan" className="block text-sm font-medium text-slate-700 mb-1.5">
                Catatan
              </label>
              <textarea
                id="akta-catatan"
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan kelengkapan berkas atau keterangan tambahan..."
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
              {submitting ? 'Menyimpan...' : akta ? 'Simpan Perubahan' : 'Simpan Akta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
