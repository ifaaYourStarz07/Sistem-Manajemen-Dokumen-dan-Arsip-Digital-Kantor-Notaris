import type { AktaStatus, ClientJenis, UserRole } from '../types/index.ts';

export function formatRupiah(amount: number): string {
  const num = Math.round(Number(amount) || 0);
  const abs = Math.abs(num).toLocaleString('id-ID');
  return num < 0 ? `-Rp ${abs}` : `Rp ${abs}`;
}

export function formatTanggal(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const normalized =
    dateStr.includes('T') || dateStr.includes(' ')
      ? dateStr.replace(' ', 'T') + (dateStr.includes('Z') || dateStr.includes('+') ? '' : 'Z')
      : `${dateStr}T00:00:00Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return dateStr;

  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const year = parsed.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTanggalWaktu(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const normalized =
    dateStr.includes('T') || dateStr.includes(' ')
      ? dateStr.replace(' ', 'T') + (dateStr.includes('Z') || dateStr.includes('+') ? '' : 'Z')
      : dateStr;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return dateStr;

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatRoleLabel(role: UserRole): string {
  return role === 'admin' ? 'Admin (Notaris)' : 'Staf';
}

export function formatJenisKlien(jenis: ClientJenis): string {
  return jenis === 'perorangan' ? 'Perorangan' : 'Perusahaan';
}

export function formatStatusAkta(status: AktaStatus): {
  label: string;
  textClass: string;
  badgeClass: string;
} {
  switch (status) {
    case 'draft':
      return {
        label: 'Draft',
        textClass: 'text-slate-600',
        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
      };
    case 'proses':
      return {
        label: 'Proses',
        textClass: 'text-slate-800',
        badgeClass: 'bg-slate-200/80 text-slate-800 border border-slate-300',
      };
    case 'selesai':
      return {
        label: 'Selesai',
        textClass: 'text-orange-700',
        badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
      };
    case 'diserahkan':
      return {
        label: 'Diserahkan',
        textClass: 'text-[#0F1E36]',
        badgeClass: 'bg-[#0F1E36]/10 text-[#0F1E36] border border-[#0F1E36]/20',
      };
    default:
      return {
        label: status,
        textClass: 'text-slate-600',
        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
      };
  }
}

export function formatStatusPembayaran(status: 'lunas' | 'sebagian' | 'belum_lunas'): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'lunas':
      return {
        label: 'Lunas',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    case 'sebagian':
      return {
        label: 'Sebagian',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      };
    default:
      return {
        label: 'Belum Lunas',
        badgeClass: 'bg-red-50 text-red-700 border border-red-200',
      };
  }
}

export function formatMetodeBayar(metode: string): string {
  switch (metode) {
    case 'transfer':
      return 'Transfer Bank';
    case 'tunai':
      return 'Tunai';
    case 'qris':
      return 'QRIS';
    case 'giro':
      return 'Bilyet Giro';
    default:
      return metode;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const SATUAN = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
];

function terbilangRekursif(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} Belas`;
  if (n < 100) {
    const puluh = Math.floor(n / 10);
    const sisa = n % 10;
    return `${SATUAN[puluh]} Puluh${sisa > 0 ? ' ' + terbilangRekursif(sisa) : ''}`;
  }
  if (n < 200) {
    const sisa = n - 100;
    return `Seratus${sisa > 0 ? ' ' + terbilangRekursif(sisa) : ''}`;
  }
  if (n < 1000) {
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;
    return `${SATUAN[ratus]} Ratus${sisa > 0 ? ' ' + terbilangRekursif(sisa) : ''}`;
  }
  if (n < 2000) {
    const sisa = n - 1000;
    return `Seribu${sisa > 0 ? ' ' + terbilangRekursif(sisa) : ''}`;
  }
  if (n < 1_000_000) {
    const ribu = Math.floor(n / 1000);
    const sisa = n % 1000;
    return `${terbilangRekursif(ribu)} Ribu${sisa > 0 ? ' ' + terbilangRekursif(sisa) : ''}`;
  }
  if (n < 1_000_000_000) {
    const juta = Math.floor(n / 1_000_000);
    const sisa = n % 1_000_000;
    return `${terbilangRekursif(juta)} Juta${sisa > 0 ? ' ' + terbilangRekursif(sisa) : ''}`;
  }
  if (n < 1_000_000_000_000) {
    const miliar = Math.floor(n / 1_000_000_000);
    const sisa = n % 1_000_000_000;
    return `${terbilangRekursif(miliar)} Miliar${sisa > 0 ? ' ' + terbilangRekursif(sisa) : ''}`;
  }
  const triliun = Math.floor(n / 1_000_000_000_000);
  const sisa = n % 1_000_000_000_000;
  return `${terbilangRekursif(triliun)} Triliun${sisa > 0 ? ' ' + terbilangRekursif(sisa) : ''}`;
}

export function terbilangRupiah(amount: number): string {
  const num = Math.floor(Math.abs(amount || 0));
  if (num === 0) return 'Nol Rupiah';
  return `${terbilangRekursif(num).replace(/\s+/g, ' ').trim()} Rupiah`;
}
