export type UserRole = 'admin' | 'staf';

export interface User {
  id: number;
  nama: string;
  email: string;
  role: UserRole;
  aktif: number;
}

export type ClientJenis = 'perorangan' | 'perusahaan';

export interface Client {
  id: number;
  jenis: ClientJenis;
  nama: string;
  nik: string | null;
  npwp: string | null;
  email: string;
  hp: string;
  alamat: string;
  pekerjaan: string;
  status_perkawinan: string;
  catatan: string;
  created_at: string;
  updated_at: string;
  total_akta?: number;
}

export type AktaStatus = 'draft' | 'proses' | 'selesai' | 'diserahkan';

export const JENIS_AKTA_OPTIONS = [
  'Pendirian PT',
  'Pendirian CV',
  'Jual Beli',
  'Hibah',
  'Kuasa',
  'Fidusia',
  'Waris',
  'Perjanjian',
  'Lainnya',
] as const;

export type JenisAkta = (typeof JENIS_AKTA_OPTIONS)[number];

export interface Akta {
  id: number;
  nomor_akta: string;
  judul: string;
  jenis: string;
  client_id: number;
  client_nama?: string;
  client_jenis?: ClientJenis;
  client_nik?: string | null;
  client_email?: string;
  client_hp?: string;
  client_alamat?: string;
  tanggal_akta: string;
  target_selesai: string;
  tanggal_selesai: string | null;
  status: AktaStatus;
  biaya: number;
  catatan: string;
  created_at: string;
  total_dibayar?: number;
  sisa_tagihan?: number;
  total_dokumen?: number;
}

export interface DokumenItem {
  id: number;
  akta_id: number;
  client_id: number;
  nama_file: string;
  path_file: string;
  mime_type: string;
  ukuran: number;
  kategori: string;
  uploaded_by: number | null;
  uploaded_by_nama?: string | null;
  created_at: string;
}

export type MetodePembayaran = 'tunai' | 'transfer' | 'qris';

export interface PembayaranItem {
  id: number;
  akta_id: number;
  client_id: number;
  nomor_kwitansi: string;
  jumlah: number;
  metode: MetodePembayaran | string;
  tanggal_bayar: string;
  keterangan: string;
  created_by: number | null;
  created_by_nama?: string | null;
  created_at: string;
  nomor_akta?: string;
  akta_judul?: string;
  akta_jenis?: string;
  client_nama?: string;
}

export interface AktaStatusHistoryItem {
  id: number;
  akta_id: number;
  dari_status: AktaStatus | null;
  ke_status: AktaStatus;
  diubah_oleh: number | null;
  diubah_oleh_nama: string;
  catatan: string | null;
  created_at: string;
}

export interface AktaDetailResponse {
  akta: Akta;
  dokumen: DokumenItem[];
  pembayaran: PembayaranItem[];
  statusHistory: AktaStatusHistoryItem[];
  ringkasanPembayaran: {
    totalBiaya: number;
    totalDibayar: number;
    sisaTagihan: number;
    persentase: number;
    statusPembayaran: 'lunas' | 'sebagian' | 'belum_lunas';
  };
}

export interface KuitansiResponse {
  pembayaran: PembayaranItem & {
    akta_biaya: number;
    client_alamat: string;
    client_hp: string;
    petugas_nama: string | null;
  };
  kantor: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardData {
  stats: {
    totalKlien: number;
    totalAkta: number;
    aktaProses: number;
    aktaSelesai: number;
    totalTagihanBelumLunas: number;
    pemasukanBulanIni: number;
  };
  pemasukan12Bulan: Array<{
    bulan: string;
    label: string;
    total: number;
  }>;
  aktaPerJenis: Array<{
    jenis: string;
    jumlah: number;
  }>;
  aktaTerbaru: Array<{
    id: number;
    nomor_akta: string;
    judul: string;
    jenis: string;
    status: AktaStatus;
    tanggal_akta: string;
    target_selesai: string;
    biaya: number;
    client_id: number;
    client_nama: string;
  }>;
  pembayaranTerbaru: Array<{
    id: number;
    nomor_kwitansi: string;
    jumlah: number;
    metode: string;
    tanggal_bayar: string;
    akta_id: number;
    client_id: number;
    nomor_akta: string;
    client_nama: string;
  }>;
  pengingat: {
    mendekatiTarget: Array<{
      id: number;
      nomor_akta: string;
      judul: string;
      jenis: string;
      status: AktaStatus;
      target_selesai: string;
      client_id: number;
      client_nama: string;
      hari_tersisa: number;
    }>;
    selesaiBelumDiserahkan: Array<{
      id: number;
      nomor_akta: string;
      judul: string;
      jenis: string;
      tanggal_selesai: string | null;
      tanggal_akta: string;
      client_id: number;
      client_nama: string;
    }>;
    tagihanTerlambat: Array<{
      id: number;
      nomor_akta: string;
      judul: string;
      tanggal_akta: string;
      biaya: number;
      total_dibayar: number;
      sisa_tagihan: number;
      client_id: number;
      client_nama: string;
      umur_hari: number;
    }>;
  };
}

export interface ClientDetailResponse {
  client: Client;
  akta: Akta[];
  ringkasanKeuangan: {
    totalTagihan: number;
    totalDibayar: number;
    sisaTagihan: number;
  };
}

export interface GlobalSearchResponse {
  clients: Array<{
    id: number;
    jenis: ClientJenis;
    nama: string;
    nik: string | null;
    hp: string;
    email: string;
  }>;
  akta: Array<{
    id: number;
    nomor_akta: string;
    judul: string;
    jenis: string;
    status: AktaStatus;
    tanggal_akta: string;
    client_id: number;
    client_nama: string;
  }>;
  kuitansi: Array<{
    id: number;
    nomor_kwitansi: string;
    jumlah: number;
    metode: string;
    tanggal_bayar: string;
    akta_id: number;
    nomor_akta: string;
    client_id: number;
    client_nama: string;
  }>;
}

