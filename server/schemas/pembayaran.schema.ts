import { z } from 'zod';

export const pembayaranSchema = z.object({
  akta_id: z.coerce.number().int().positive('Akta wajib dipilih'),
  jumlah: z.coerce.number().int().positive('Jumlah pembayaran harus lebih dari Rp 0'),
  tanggal_bayar: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal bayar harus YYYY-MM-DD'),
  metode: z.enum(['tunai', 'transfer', 'qris'], {
    message: 'Metode pembayaran harus tunai, transfer, atau qris',
  }),
  keterangan: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional().default(''),
});

export type PembayaranInput = z.infer<typeof pembayaranSchema>;
