import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { OfficeLogo } from './OfficeLogo.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import {
  formatMetodeBayar,
  formatRupiah,
  formatTanggal,
  terbilangRupiah,
} from '../lib/format.ts';
import type { KuitansiResponse } from '../types/index.ts';

interface KuitansiModalProps {
  pembayaranId: number | null;
  onClose: () => void;
}

export function KuitansiModal({ pembayaranId, onClose }: KuitansiModalProps) {
  const [data, setData] = useState<KuitansiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pembayaranId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
    apiRequest<KuitansiResponse>(`/api/pembayaran/${pembayaranId}/kuitansi`)
      .then((res) => setData(res))
      .catch((err) => {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Gagal memuat data kuitansi.');
        }
      })
      .finally(() => setLoading(false));
  }, [pembayaranId]);

  if (!pembayaranId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 print:static print:p-0 print:bg-white">
      <div
        role="dialog"
        aria-modal="true"
        className="print-only-sheet bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="no-print px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-base font-semibold text-slate-900">Pratinjau Kuitansi Pembayaran</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!data}
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-[#0F1E36] hover:bg-[#192F52] rounded-lg disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau"
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto print:overflow-visible print:p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Memuat kuitansi...</div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          ) : data ? (
            <div className="border border-slate-300 p-6 sm:p-8 bg-white text-slate-900">
              {/* Kop Kantor dari Pengaturan */}
              <div className="pb-4 border-b-2 border-[#0F1E36] flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <OfficeLogo logoFilename={data.kantor.logo_kantor} sizeClass="w-14 h-14" />
                  <div>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#0F1E36]">
                      {data.kantor.nama_kantor || 'Kantor Notaris & PPAT'}
                    </h3>
                    {data.kantor.nama_notaris && (
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">
                        Notaris & PPAT: {data.kantor.nama_notaris}
                      </p>
                    )}
                    {data.kantor.sk_pengangkatan && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        SK Pengangkatan: {data.kantor.sk_pengangkatan}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      {data.kantor.alamat_kantor || '-'}
                    </p>
                    <p className="text-xs text-slate-600">
                      Telp: {data.kantor.telepon_kantor || '-'} · Email:{' '}
                      {data.kantor.email_kantor || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Judul & Nomor Kuitansi */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xl font-bold tracking-tight text-slate-900">
                    KUITANSI PEMBAYARAN
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bukti Pembayaran Jasa Kenotariatan
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-slate-500">Nomor Kuitansi</p>
                  <p className="text-base font-mono font-bold text-[#0F1E36]">
                    {data.pembayaran.nomor_kwitansi}
                  </p>
                </div>
              </div>

              {/* Isi Kuitansi */}
              <dl className="mt-6 border-t border-b border-slate-200 divide-y divide-slate-100 text-sm">
                <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <dt className="text-slate-500 font-medium">Telah Terima Dari</dt>
                  <dd className="sm:col-span-2 font-semibold text-slate-900">
                    {data.pembayaran.client_nama}
                    <span className="block text-xs font-normal text-slate-500 mt-0.5">
                      {data.pembayaran.client_alamat}
                    </span>
                  </dd>
                </div>

                <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <dt className="text-slate-500 font-medium">Uang Sejumlah</dt>
                  <dd className="sm:col-span-2 font-semibold italic text-slate-900 bg-slate-50 px-3 py-2 border border-slate-200 rounded-md">
                    {terbilangRupiah(data.pembayaran.jumlah)}
                  </dd>
                </div>

                <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <dt className="text-slate-500 font-medium">Untuk Pembayaran</dt>
                  <dd className="sm:col-span-2 text-slate-900">
                    <span className="font-medium">{data.pembayaran.akta_judul}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      No. Akta: <span className="font-mono">{data.pembayaran.nomor_akta}</span> ·
                      Jenis: {data.pembayaran.akta_jenis}
                    </span>
                    {data.pembayaran.keterangan && (
                      <span className="block text-xs text-slate-600 mt-1">
                        Catatan: {data.pembayaran.keterangan}
                      </span>
                    )}
                  </dd>
                </div>

                <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <dt className="text-slate-500 font-medium">Metode Pembayaran</dt>
                  <dd className="sm:col-span-2 text-slate-900">
                    {formatMetodeBayar(data.pembayaran.metode)} · Tanggal:{' '}
                    <span className="font-mono">{formatTanggal(data.pembayaran.tanggal_bayar)}</span>
                  </dd>
                </div>
              </dl>

              {/* Nominal & Tanda Tangan */}
              <div className="mt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-8">
                <div className="border-2 border-[#0F1E36] bg-slate-50 px-5 py-3 inline-block">
                  <p className="text-xs font-medium text-slate-500">Jumlah Diterima</p>
                  <p className="text-2xl font-mono tabular-nums font-bold text-[#0F1E36] mt-0.5">
                    {formatRupiah(data.pembayaran.jumlah)}
                  </p>
                </div>

                <div className="text-center sm:min-w-[220px]">
                  <p className="text-xs text-slate-600">
                    {formatTanggal(data.pembayaran.tanggal_bayar)}
                  </p>
                  <p className="text-xs font-medium text-slate-700 mt-1">Penerima / Kasir Kantor,</p>
                  <div className="h-16" />
                  <p className="text-sm font-semibold text-slate-900 border-t border-slate-300 pt-1.5">
                    {data.pembayaran.petugas_nama || data.kantor.nama_notaris || 'Sekretariat Kantor Notaris'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
