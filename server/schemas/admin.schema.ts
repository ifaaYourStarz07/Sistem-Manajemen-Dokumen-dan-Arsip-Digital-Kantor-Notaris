import { z } from 'zod';

export const createUserSchema = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter').max(100),
  role: z.enum(['admin', 'staf'], { message: 'Peran harus admin atau staf' }),
  aktif: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().email('Format email tidak valid'),
  role: z.enum(['admin', 'staf'], { message: 'Peran harus admin atau staf' }),
  aktif: z.boolean(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Kata sandi baru minimal 6 karakter').max(100),
});

export const updateSettingsSchema = z.object({
  nama_kantor: z.string().trim().min(2, 'Nama kantor wajib diisi').max(200),
  nama_notaris: z.string().trim().min(2, 'Nama notaris wajib diisi').max(200),
  sk_pengangkatan: z.string().trim().max(200).optional().default(''),
  alamat_kantor: z.string().trim().min(5, 'Alamat kantor minimal 5 karakter').max(500),
  telepon_kantor: z.string().trim().min(5, 'Telepon kantor wajib diisi').max(50),
  email_kantor: z.string().trim().email('Format email kantor tidak valid'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
