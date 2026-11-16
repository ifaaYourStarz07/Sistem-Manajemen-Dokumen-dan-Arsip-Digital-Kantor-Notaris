import { z } from 'zod';

export const clientSchema = z
  .object({
    jenis: z.enum(['perorangan', 'perusahaan'], {
      message: 'Jenis klien harus perorangan atau perusahaan',
    }),
    nama: z.string().trim().min(2, 'Nama minimal 2 karakter').max(150, 'Nama maksimal 150 karakter'),
    nik: z.string().trim().optional().default(''),
    npwp: z.string().trim().optional().default(''),
    email: z.string().trim().email('Format email tidak valid'),
    hp: z
      .string()
      .trim()
      .min(8, 'Nomor HP minimal 8 karakter')
      .max(20, 'Nomor HP maksimal 20 karakter')
      .regex(/^[0-9+\-\s]+$/, 'Nomor HP hanya boleh berisi angka, +, -, atau spasi'),
    alamat: z.string().trim().min(5, 'Alamat minimal 5 karakter').max(500, 'Alamat maksimal 500 karakter'),
    pekerjaan: z.string().trim().max(120, 'Pekerjaan maksimal 120 karakter').optional().default(''),
    status_perkawinan: z
      .string()
      .trim()
      .max(50, 'Status perkawinan maksimal 50 karakter')
      .optional()
      .default(''),
    catatan: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.jenis === 'perorangan') {
      if (!/^\d{16}$/.test(data.nik)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nik'],
          message: 'NIK perorangan harus tepat 16 digit angka',
        });
      }
      if (!/^\d{16}$/.test(data.npwp)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['npwp'],
          message: 'NPWP perorangan harus tepat 16 digit angka',
        });
      }
    } else {
      if (data.nik && !/^\d{16}$/.test(data.nik)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nik'],
          message: 'NIK penanggung jawab harus 16 digit angka jika diisi',
        });
      }
      if (data.npwp && !/^\d{15,16}$/.test(data.npwp)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['npwp'],
          message: 'NPWP perusahaan harus 15 atau 16 digit angka jika diisi',
        });
      }
    }
  });

export type ClientInput = z.infer<typeof clientSchema>;
