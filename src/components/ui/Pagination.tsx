import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../../types/index.ts';

interface PaginationProps {
  pagination: PaginationMeta;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

export function Pagination({
  pagination,
  itemLabel = 'data',
  onPageChange,
}: PaginationProps) {
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
      <p className="tabular-nums">
        Menampilkan <span className="font-semibold text-slate-900">{startItem}</span>–
        <span className="font-semibold text-slate-900">{endItem}</span> dari{' '}
        <span className="font-semibold text-slate-900">{pagination.total}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Sebelumnya</span>
        </button>

        <span className="px-3 py-1.5 font-mono tabular-nums text-slate-700">
          Hal {pagination.page} / {pagination.totalPages}
        </span>

        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <span>Berikutnya</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
