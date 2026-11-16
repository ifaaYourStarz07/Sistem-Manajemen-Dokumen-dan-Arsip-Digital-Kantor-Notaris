import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'draft'
  | 'proses'
  | 'selesai'
  | 'diserahkan'
  | 'lunas'
  | 'sebagian'
  | 'belum_lunas'
  | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  proses: 'bg-slate-200/80 text-slate-800 border border-slate-300',
  selesai: 'bg-orange-50 text-orange-700 border border-orange-200',
  diserahkan: 'bg-[#0F1E36]/10 text-[#0F1E36] border border-[#0F1E36]/20',
  lunas: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  sebagian: 'bg-amber-50 text-amber-800 border border-amber-200',
  belum_lunas: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap ${BADGE_VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
