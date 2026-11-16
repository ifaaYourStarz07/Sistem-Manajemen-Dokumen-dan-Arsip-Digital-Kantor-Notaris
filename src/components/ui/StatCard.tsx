import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  valueClassName?: string;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  valueClassName = 'text-slate-900',
}: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs px-5 py-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p
          className={`mt-1.5 text-2xl font-bold font-mono tabular-nums tracking-tight ${valueClassName}`}
        >
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      </div>
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-slate-100 text-[#0F1E36] flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
}
