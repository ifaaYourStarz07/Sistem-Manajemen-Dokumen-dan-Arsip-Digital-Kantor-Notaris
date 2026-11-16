import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/index.ts';
import { AppError } from './errorHandler.ts';

export type UserRole = 'admin' | 'staf';

export interface AuthUser {
  id: number;
  nama: string;
  email: string;
  role: UserRole;
  aktif: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'notarydutty-dev-secret-key-change-in-production-2026';
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    getJwtSecret(),
    { expiresIn: '12h' }
  );
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Sesi berakhir atau tidak valid. Silakan login kembali.', 401));
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const payload = jwt.verify(token, getJwtSecret()) as unknown as { sub: number };
    const user = db
      .prepare('SELECT id, nama, email, role, aktif FROM users WHERE id = ?')
      .get(payload.sub) as AuthUser | undefined;

    if (!user || !user.aktif) {
      next(new AppError('Akun tidak ditemukan atau telah dinonaktifkan.', 401));
      return;
    }

    req.user = user;
    next();
  } catch {
    next(new AppError('Token autentikasi tidak valid atau telah kedaluwarsa.', 401));
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Autentikasi diperlukan.', 401));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          'Akses ditolak. Peran Anda tidak memiliki izin untuk tindakan ini.',
          403
        )
      );
      return;
    }
    next();
  };
}
