import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Receipt, Search, Users, X } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import {
  formatJenisKlien,
  formatRupiah,
  formatStatusAkta,
  formatTanggal,
} from '../lib/format.ts';
import type { GlobalSearchResponse } from '../types/index.ts';
import { Badge } from './ui/index.ts';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResponse>({
    clients: [],
    akta: [],
    kuitansi: [],
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery('');
      setResults({ clients: [], akta: [], kuitansi: [] });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ clients: [], akta: [], kuitansi: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      apiRequest<GlobalSearchResponse>(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => setResults(res))
        .catch(() => setResults({ clients: [], akta: [], kuitansi: [] }))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const totalResults =
    results.clients.length + results.akta.length + results.kuitansi.length;

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-slate-900/55"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian Global"
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-orange-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama klien, NIK, nomor akta, atau nomor kuitansi..."
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Bersihkan kata kunci"
              className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-[11px] font-mono text-slate-500 bg-slate-100 rounded border border-slate-200 cursor-pointer hover:bg-slate-200"
          >
            ESC
          </button>
        </div>

        {/* Grouped Results */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
          {!hasQuery ? (
            <div className="py-10 px-6 text-center text-sm text-slate-500">
              Ketik kata kunci untuk mencari <span className="font-medium text-slate-700">Klien</span>,{' '}
              <span className="font-medium text-slate-700">Akta</span>, atau{' '}
              <span className="font-medium text-slate-700">Kuitansi</span> secara cepat.
            </div>
          ) : loading ? (
            <div className="py-10 px-6 text-center text-sm text-slate-500">
              Mencari data...
            </div>
          ) : totalResults === 0 ? (
            <div className="py-10 px-6 text-center text-sm text-slate-500">
              Tidak ditemukan hasil untuk <span className="font-semibold text-slate-800">"{query}"</span>.
            </div>
          ) : (
            <>
              {/* Group 1: Klien */}
              {results.clients.length > 0 && (
                <div className="p-3">
                  <div className="px-2.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    <span>Klien ({results.clients.length})</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {results.clients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => goTo(`/klien/${c.id}`)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{c.nama}</p>
                          <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                            {formatJenisKlien(c.jenis)} · {c.nik || '-'} · {c.hp}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-orange-600 shrink-0">
                          Lihat Klien
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 2: Akta */}
              {results.akta.length > 0 && (
                <div className="p-3">
                  <div className="px-2.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-[#0F1E36]" />
                    <span>Akta ({results.akta.length})</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {results.akta.map((a) => {
                      const statusMeta = formatStatusAkta(a.status);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => goTo(`/akta/${a.id}`)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-[#0F1E36]">
                                {a.nomor_akta}
                              </span>
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-slate-600">{a.jenis}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 truncate mt-0.5">
                              {a.judul}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              Klien: {a.client_nama} · {formatTanggal(a.tanggal_akta)}
                            </p>
                          </div>
                          <Badge variant={a.status}>{statusMeta.label}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group 3: Kuitansi */}
              {results.kuitansi.length > 0 && (
                <div className="p-3">
                  <div className="px-2.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kuitansi ({results.kuitansi.length})</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {results.kuitansi.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => goTo(`/pembayaran?kwitansi=${k.id}`)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-[#0F1E36]">
                            {k.nomor_kwitansi}
                          </p>
                          <p className="text-xs text-slate-600 truncate mt-0.5">
                            {k.client_nama} · Akta {k.nomor_akta} · {formatTanggal(k.tanggal_bayar)}
                          </p>
                        </div>
                        <span className="font-mono tabular-nums text-xs font-semibold text-emerald-700 shrink-0">
                          {formatRupiah(k.jumlah)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
