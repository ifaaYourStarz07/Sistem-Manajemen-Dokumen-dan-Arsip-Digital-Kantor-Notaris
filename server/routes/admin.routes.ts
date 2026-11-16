import { Router, type NextFunction, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import db, { uploadsDir } from '../db/index.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import {
  createUserSchema,
  resetPasswordSchema,
  updateSettingsSchema,
  updateUserSchema,
  type CreateUserInput,
  type ResetPasswordInput,
  type UpdateSettingsInput,
  type UpdateUserInput,
} from '../schemas/admin.schema.ts';
import { logActivity } from '../utils/audit.ts';

const router = Router();

// Seluruh route di sini dibatasi khusus Admin (Notaris) di level middleware backend
router.use(requireAuth, requireRole('admin'));

// Multer config for Office Logo upload (max 2 MB, PNG/JPG/WEBP)
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `office-logo-${Date.now()}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = new Set(['image/png', 'image/jpeg', 'image/webp']);
    const allowedExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMimes.has(file.mimetype) || !allowedExts.has(ext)) {
      cb(new AppError('Logo harus berupa gambar PNG, JPG, atau WEBP.', 400));
      return;
    }
    cb(null, true);
  },
});

function handleLogoMulter(req: Request, res: Response, next: NextFunction): void {
  uploadLogo.single('logo')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('Ukuran logo maksimal 2 MB.', 400));
        return;
      }
      next(new AppError(`Gagal mengunggah logo: ${err.message}`, 400));
      return;
    }
    next(err);
  });
}

function getKantorSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

// =======================
// 7. LAPORAN (ADMIN)
// =======================
router.get('/reports', (req, res, next) => {
  try {
    const jenis = String(req.query.jenis ?? 'akta');
    const tahun = String(req.query.tahun ?? String(new Date().getFullYear()));
    const bulan = String(req.query.bulan ?? 'all');

    const kantor = getKantorSettings();

    const yearsRows = db
      .prepare(`
        SELECT DISTINCT substr(tanggal_akta, 1, 4) as yr FROM akta
        UNION
        SELECT DISTINCT substr(tanggal_bayar, 1, 4) as yr FROM pembayaran
        ORDER BY yr DESC
      `)
      .all() as Array<{ yr: string }>;
    const availableYears = yearsRows.map((r) => r.yr).filter(Boolean);
    const currentYear = String(new Date().getFullYear());
    if (!availableYears.includes(currentYear)) {
      availableYears.unshift(currentYear);
    }

    const periodPrefix =
      tahun !== 'all' && /^\d{4}$/.test(tahun)
        ? bulan !== 'all' && /^\d{2}$/.test(bulan)
          ? `${tahun}-${bulan}`
          : tahun
        : null;

    if (jenis === 'pemasukan') {
      const whereSql = periodPrefix ? 'WHERE p.tanggal_bayar LIKE ?' : '';
      const params = periodPrefix ? [`${periodPrefix}%`] : [];

      const rows = db
        .prepare(`
          SELECT
            p.id,
            p.nomor_kwitansi,
            p.tanggal_bayar,
            p.jumlah,
            p.metode,
            p.keterangan,
            a.nomor_akta,
            a.jenis as akta_jenis,
            c.nama as client_nama
          FROM pembayaran p
          JOIN akta a ON a.id = p.akta_id
          JOIN clients c ON c.id = p.client_id
          ${whereSql}
          ORDER BY p.tanggal_bayar DESC, p.id DESC
        `)
        .all(...params) as Array<{ jumlah: number; metode: string; [key: string]: unknown }>;

      const perMetode: Record<string, number> = { transfer: 0, tunai: 0, qris: 0 };
      let totalPemasukan = 0;
      for (const r of rows) {
        totalPemasukan += r.jumlah || 0;
        const m = r.metode in perMetode ? r.metode : 'transfer';
        perMetode[m] = (perMetode[m] || 0) + (r.jumlah || 0);
      }

      res.json({
        jenis: 'pemasukan',
        kantor,
        availableYears,
        data: rows,
        ringkasan: {
          totalTransaksi: rows.length,
          totalPemasukan,
          perMetode,
        },
      });
      return;
    }

    if (jenis === 'tagihan') {
      const whereClauses = ['(a.biaya - COALESCE(p.dibayar, 0)) > 0'];
      const params: unknown[] = [];
      if (periodPrefix) {
        whereClauses.push('a.tanggal_akta LIKE ?');
        params.push(`${periodPrefix}%`);
      }

      const rows = db
        .prepare(`
          SELECT
            a.id,
            a.nomor_akta,
            a.judul,
            a.jenis,
            a.tanggal_akta,
            a.target_selesai,
            a.status,
            a.biaya,
            COALESCE(p.dibayar, 0) as total_dibayar,
            (a.biaya - COALESCE(p.dibayar, 0)) as sisa_tagihan,
            c.nama as client_nama,
            c.hp as client_hp
          FROM akta a
          JOIN clients c ON c.id = a.client_id
          LEFT JOIN (
            SELECT akta_id, SUM(jumlah) as dibayar
            FROM pembayaran
            GROUP BY akta_id
          ) p ON p.akta_id = a.id
          WHERE ${whereClauses.join(' AND ')}
          ORDER BY a.tanggal_akta ASC, a.id DESC
        `)
        .all(...params) as Array<{
        biaya: number;
        total_dibayar: number;
        sisa_tagihan: number;
        [key: string]: unknown;
      }>;

      const totalTagihan = rows.reduce((s, r) => s + (r.biaya || 0), 0);
      const totalDibayar = rows.reduce((s, r) => s + (r.total_dibayar || 0), 0);
      const totalSisa = rows.reduce((s, r) => s + (r.sisa_tagihan || 0), 0);

      res.json({
        jenis: 'tagihan',
        kantor,
        availableYears,
        data: rows,
        ringkasan: {
          totalAkta: rows.length,
          totalTagihan,
          totalDibayar,
          totalSisa,
        },
      });
      return;
    }

    // Default: Laporan Akta per Periode
    const whereSql = periodPrefix ? 'WHERE a.tanggal_akta LIKE ?' : '';
    const params = periodPrefix ? [`${periodPrefix}%`] : [];

    const rows = db
      .prepare(`
        SELECT
          a.id,
          a.nomor_akta,
          a.judul,
          a.jenis,
          a.tanggal_akta,
          a.target_selesai,
          a.status,
          a.biaya,
          COALESCE(p.dibayar, 0) as total_dibayar,
          MAX(a.biaya - COALESCE(p.dibayar, 0), 0) as sisa_tagihan,
          c.nama as client_nama
        FROM akta a
        JOIN clients c ON c.id = a.client_id
        LEFT JOIN (
          SELECT akta_id, SUM(jumlah) as dibayar
          FROM pembayaran
          GROUP BY akta_id
        ) p ON p.akta_id = a.id
        ${whereSql}
        ORDER BY a.tanggal_akta DESC, a.id DESC
      `)
      .all(...params) as Array<{
      biaya: number;
      status: string;
      jenis: string;
      [key: string]: unknown;
    }>;

    const perStatus: Record<string, number> = {
      draft: 0,
      proses: 0,
      selesai: 0,
      diserahkan: 0,
    };
    const perJenis: Record<string, number> = {};
    let totalBiaya = 0;

    for (const r of rows) {
      totalBiaya += r.biaya || 0;
      perStatus[r.status] = (perStatus[r.status] || 0) + 1;
      perJenis[r.jenis] = (perJenis[r.jenis] || 0) + 1;
    }

    res.json({
      jenis: 'akta',
      kantor,
      availableYears,
      data: rows,
      ringkasan: {
        totalAkta: rows.length,
        totalBiaya,
        perStatus,
        perJenis,
      },
    });
  } catch (err) {
    next(err);
  }
});

// =======================
// 8. LOG AKTIVITAS (ADMIN)
// =======================
router.get('/logs', (req, res, next) => {
  try {
    const userId = String(req.query.userId ?? '').trim();
    const tanggalDari = String(req.query.tanggalDari ?? '').trim();
    const tanggalSampai = String(req.query.tanggalSampai ?? '').trim();
    const search = String(req.query.search ?? '').trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (userId && /^\d+$/.test(userId)) {
      whereClauses.push('l.user_id = ?');
      params.push(Number(userId));
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggalDari)) {
      whereClauses.push('substr(l.created_at, 1, 10) >= ?');
      params.push(tanggalDari);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggalSampai)) {
      whereClauses.push('substr(l.created_at, 1, 10) <= ?');
      params.push(tanggalSampai);
    }

    if (search) {
      whereClauses.push('(l.detail LIKE ? OR l.aksi LIKE ? OR l.entitas LIKE ? OR u.nama LIKE ?)');
      const pat = `%${search}%`;
      params.push(pat, pat, pat, pat);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db
      .prepare(`
        SELECT COUNT(*) as total
        FROM activity_logs l
        LEFT JOIN users u ON u.id = l.user_id
        ${whereSql}
      `)
      .get(...params) as { total: number };

    const total = countRow.total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const logs = db
      .prepare(`
        SELECT l.*, u.nama as user_nama, u.email as user_email, u.role as user_role
        FROM activity_logs l
        LEFT JOIN users u ON u.id = l.user_id
        ${whereSql}
        ORDER BY l.id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, offset);

    const users = db
      .prepare('SELECT id, nama, email, role FROM users ORDER BY nama ASC')
      .all();

    res.json({
      data: logs,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
      users,
    });
  } catch (err) {
    next(err);
  }
});

// =======================
// 9. KELOLA PENGGUNA (ADMIN)
// =======================
router.get('/users', (_req, res, next) => {
  try {
    const users = db
      .prepare('SELECT id, nama, email, role, aktif, created_at, updated_at FROM users ORDER BY id ASC')
      .all();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

router.post('/users', validateBody(createUserSchema), (req, res, next) => {
  try {
    const body = req.body as CreateUserInput;
    const normalizedEmail = body.email.toLowerCase();

    const dup = db
      .prepare('SELECT id FROM users WHERE lower(email) = ?')
      .get(normalizedEmail);
    if (dup) {
      throw new AppError('Email sudah digunakan oleh pengguna lain.', 409, {
        email: 'Email sudah terdaftar',
      });
    }

    const passwordHash = bcrypt.hashSync(body.password, 10);
    const result = db
      .prepare(`
        INSERT INTO users (nama, email, password_hash, role, aktif)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(body.nama, normalizedEmail, passwordHash, body.role, body.aktif ? 1 : 0);

    const newId = Number(result.lastInsertRowid);
    const created = db
      .prepare('SELECT id, nama, email, role, aktif, created_at, updated_at FROM users WHERE id = ?')
      .get(newId);

    logActivity(
      req.user?.id ?? null,
      'CREATE',
      'users',
      newId,
      `Menambahkan pengguna baru: ${body.nama} (${body.role})`
    );

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id', validateBody(updateUserSchema), (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError('ID pengguna tidak valid.', 400);
    }

    const existing = db
      .prepare('SELECT id, nama, email, role, aktif FROM users WHERE id = ?')
      .get(targetId) as
      | { id: number; nama: string; email: string; role: string; aktif: number }
      | undefined;

    if (!existing) {
      throw new AppError('Pengguna tidak ditemukan.', 404);
    }

    const body = req.body as UpdateUserInput;

    // Admin tidak boleh menurunkan peran atau menonaktifkan dirinya sendiri
    if (req.user && req.user.id === targetId) {
      if (body.role !== 'admin') {
        throw new AppError('Anda tidak dapat menurunkan peran akun Anda sendiri.', 400, {
          role: 'Tidak dapat menurunkan peran sendiri',
        });
      }
      if (!body.aktif) {
        throw new AppError('Anda tidak dapat menonaktifkan akun Anda sendiri.', 400);
      }
    }

    const normalizedEmail = body.email.toLowerCase();
    const dup = db
      .prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?')
      .get(normalizedEmail, targetId);
    if (dup) {
      throw new AppError('Email sudah digunakan oleh pengguna lain.', 409, {
        email: 'Email sudah terdaftar',
      });
    }

    db.prepare(`
      UPDATE users
      SET nama = ?, email = ?, role = ?, aktif = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(body.nama, normalizedEmail, body.role, body.aktif ? 1 : 0, targetId);

    const updated = db
      .prepare('SELECT id, nama, email, role, aktif, created_at, updated_at FROM users WHERE id = ?')
      .get(targetId);

    const changes: string[] = [];
    if (existing.role !== body.role) changes.push(`peran ${existing.role} → ${body.role}`);
    if (Boolean(existing.aktif) !== body.aktif) {
      changes.push(body.aktif ? 'akun diaktifkan' : 'akun dinonaktifkan');
    }
    const detailSuffix = changes.length > 0 ? ` (${changes.join(', ')})` : '';

    logActivity(
      req.user?.id ?? null,
      'UPDATE',
      'users',
      targetId,
      `Memperbarui data pengguna ${body.nama}${detailSuffix}`
    );

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/password', validateBody(resetPasswordSchema), (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError('ID pengguna tidak valid.', 400);
    }

    const existing = db
      .prepare('SELECT id, nama FROM users WHERE id = ?')
      .get(targetId) as { id: number; nama: string } | undefined;

    if (!existing) {
      throw new AppError('Pengguna tidak ditemukan.', 404);
    }

    const { password } = req.body as ResetPasswordInput;
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
      passwordHash,
      targetId
    );

    logActivity(
      req.user?.id ?? null,
      'RESET_PASSWORD',
      'users',
      targetId,
      `Mereset kata sandi pengguna: ${existing.nama}`
    );

    res.json({ ok: true, message: 'Kata sandi pengguna berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError('ID pengguna tidak valid.', 400);
    }

    if (req.user && req.user.id === targetId) {
      throw new AppError('Anda tidak dapat menghapus akun Anda sendiri.', 400);
    }

    const existing = db
      .prepare('SELECT id, nama, email FROM users WHERE id = ?')
      .get(targetId) as { id: number; nama: string; email: string } | undefined;

    if (!existing) {
      throw new AppError('Pengguna tidak ditemukan.', 404);
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

    logActivity(
      req.user?.id ?? null,
      'DELETE',
      'users',
      targetId,
      `Menghapus pengguna: ${existing.nama} (${existing.email})`
    );

    res.json({ ok: true, message: 'Pengguna berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

// =======================
// 10. PENGATURAN KANTOR (ADMIN)
// =======================
router.get('/settings', (_req, res, next) => {
  try {
    res.json({ data: getKantorSettings() });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', validateBody(updateSettingsSchema), (req, res, next) => {
  try {
    const body = req.body as UpdateSettingsInput;

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);

    const tx = db.transaction(() => {
      upsert.run('nama_kantor', body.nama_kantor);
      upsert.run('nama_notaris', body.nama_notaris);
      upsert.run('sk_pengangkatan', body.sk_pengangkatan || '');
      upsert.run('alamat_kantor', body.alamat_kantor);
      upsert.run('telepon_kantor', body.telepon_kantor);
      upsert.run('email_kantor', body.email_kantor);
    });
    tx();

    logActivity(
      req.user?.id ?? null,
      'UPDATE',
      'settings',
      null,
      'Memperbarui pengaturan profil & kop kantor'
    );

    res.json({ data: getKantorSettings() });
  } catch (err) {
    next(err);
  }
});

router.post('/settings/logo', handleLogoMulter, (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError('File logo wajib dipilih.', 400);
    }

    const oldRow = db
      .prepare("SELECT value FROM settings WHERE key = 'logo_kantor'")
      .get() as { value: string } | undefined;

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('logo_kantor', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(file.filename);

    if (oldRow?.value && oldRow.value !== file.filename) {
      const oldPath = path.join(uploadsDir, path.basename(oldRow.value));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // ignore
        }
      }
    }

    logActivity(
      req.user?.id ?? null,
      'UPDATE',
      'settings',
      null,
      `Mengunggah logo kantor baru (${file.originalname})`
    );

    res.json({ data: getKantorSettings() });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore
      }
    }
    next(err);
  }
});

router.delete('/settings/logo', (req, res, next) => {
  try {
    const oldRow = db
      .prepare("SELECT value FROM settings WHERE key = 'logo_kantor'")
      .get() as { value: string } | undefined;

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('logo_kantor', '', datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = '', updated_at = datetime('now')
    `).run();

    if (oldRow?.value) {
      const oldPath = path.join(uploadsDir, path.basename(oldRow.value));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // ignore
        }
      }
    }

    logActivity(
      req.user?.id ?? null,
      'UPDATE',
      'settings',
      null,
      'Menghapus logo kantor'
    );

    res.json({ data: getKantorSettings() });
  } catch (err) {
    next(err);
  }
});

export default router;
