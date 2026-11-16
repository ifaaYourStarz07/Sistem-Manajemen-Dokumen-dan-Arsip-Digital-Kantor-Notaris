import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { requireAuth, signToken, type AuthUser } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import {
  loginSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from '../schemas/auth.schema.ts';
import { logActivity } from '../utils/audit.ts';

const router = Router();

interface UserRow extends AuthUser {
  password_hash: string;
}

router.post('/login', validateBody(loginSchema), (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const normalizedEmail = email.toLowerCase();

    const userRow = db
      .prepare('SELECT id, nama, email, password_hash, role, aktif FROM users WHERE lower(email) = ?')
      .get(normalizedEmail) as UserRow | undefined;

    if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
      throw new AppError('Email atau kata sandi salah.', 401);
    }

    if (!userRow.aktif) {
      throw new AppError('Akun Anda sedang dinonaktifkan. Hubungi Notaris.', 403);
    }

    const user: AuthUser = {
      id: userRow.id,
      nama: userRow.nama,
      email: userRow.email,
      role: userRow.role,
      aktif: userRow.aktif,
    };

    const token = signToken(user);
    logActivity(user.id, 'LOGIN', 'auth', user.id, `Login berhasil oleh ${user.email}`);

    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', requireAuth, validateBody(updateProfileSchema), (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Sesi tidak valid.', 401);
    }
    const { nama, email } = req.body as { nama: string; email: string };
    const normalizedEmail = email.toLowerCase();

    const conflict = db
      .prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?')
      .get(normalizedEmail, req.user.id);
    if (conflict) {
      throw new AppError('Email tersebut sudah digunakan oleh pengguna lain.', 409);
    }

    db.prepare(
      `
      UPDATE users
      SET nama = ?, email = ?, updated_at = datetime('now')
      WHERE id = ?
      `
    ).run(nama, normalizedEmail, req.user.id);

    const updated = db
      .prepare('SELECT id, nama, email, role, aktif FROM users WHERE id = ?')
      .get(req.user.id) as AuthUser;

    logActivity(
      req.user.id,
      'UPDATE_PROFIL',
      'user',
      req.user.id,
      `Memperbarui profil akun (${updated.nama} / ${updated.email})`
    );

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

router.put('/password', requireAuth, validateBody(updatePasswordSchema), (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Sesi tidak valid.', 401);
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const userRow = db
      .prepare('SELECT id, password_hash FROM users WHERE id = ?')
      .get(req.user.id) as { id: number; password_hash: string } | undefined;

    if (!userRow || !bcrypt.compareSync(currentPassword, userRow.password_hash)) {
      throw new AppError('Kata sandi saat ini tidak sesuai.', 400);
    }

    const nextHash = bcrypt.hashSync(newPassword, 10);
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(
      nextHash,
      req.user.id
    );

    logActivity(
      req.user.id,
      'UPDATE_PASSWORD',
      'user',
      req.user.id,
      `Mengubah kata sandi akun sendiri (${req.user.email})`
    );

    res.json({ ok: true, message: 'Kata sandi berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, (req, res) => {
  if (req.user) {
    logActivity(req.user.id, 'LOGOUT', 'auth', req.user.id, `Logout oleh ${req.user.email}`);
  }
  res.json({ ok: true });
});

export default router;
