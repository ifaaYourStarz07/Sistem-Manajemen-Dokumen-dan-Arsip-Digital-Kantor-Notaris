import { z } from 'zod';

export const JENIS_AKTA_LIST = [
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

export const aktaSchema = z.object({
  nomor_akta: z.string().trim().min(3, 'Nomor akta wajib diisi').max(60, 'Nomor akta terlalu panjang'),
  judul: z.string().trim().max(200, 'Judul akta maksimal 200 karakter').optional().default(''),
  jenis: z.enum(JENIS_AKTA_LIST, {
    message: 'Jenis akta tidak valid',
  }),
  client_id: z.coerce.number().int().positive('Klien wajib dipilih'),
  tanggal_akta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal akta harus YYYY-MM-DD'),
  target_selesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format target selesai harus YYYY-MM-DD'),
  tanggal_selesai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal selesai harus YYYY-MM-DD')
    .nullable()
    .optional(),
  status: z.enum(['draft', 'proses', 'selesai', 'diserahkan']).default('draft'),
  biaya: z.coerce.number().int().min(0, 'Biaya tidak boleh negatif'),
  catatan: z.string().trim().max(1000).optional().default(''),
  status_catatan: z.string().trim().max(300).optional().default(''),
});

export type AktaInput = z.infer<typeof aktaSchema>;
