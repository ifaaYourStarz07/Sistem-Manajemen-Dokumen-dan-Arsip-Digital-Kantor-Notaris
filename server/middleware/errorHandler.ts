import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details ?? null,
    });
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    const firstMessage = err.issues[0]?.message || 'Data yang dikirim tidak valid.';
    res.status(400).json({
      error: firstMessage,
      details: fieldErrors,
    });
    return;
  }

  if (err && typeof err === 'object' && 'code' in err) {
    const sqliteErr = err as { code?: string; message?: string };
    if (sqliteErr.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({
        error: 'Data duplikat terdeteksi (misalnya NIK, email, atau nomor sudah terdaftar).',
      });
      return;
    }
    if (sqliteErr.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      res.status(400).json({
        error: 'Data masih terhubung dengan entitas lain sehingga tidak dapat diproses.',
      });
      return;
    }
  }

  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Terjadi kesalahan internal pada server.',
  });
}
