import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import db, { uploadsDir } from '../db/index.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';
import { logActivity } from '../utils/audit.ts';

const router = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIMES.has(file.mimetype) || !ALLOWED_EXTS.has(ext)) {
      cb(new AppError('Tipe file tidak diizinkan. Hanya file PDF, JPG, atau PNG yang diperbolehkan.', 400));
      return;
    }
    cb(null, true);
  },
});

function handleMulterUpload(req: Request, res: Response, next: NextFunction): void {
  upload.array('files', 10)(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('Ukuran file melebihi batas maksimal 5 MB per file.', 400));
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        next(new AppError('Maksimal 10 file dapat diunggah sekaligus.', 400));
        return;
      }
      next(new AppError(`Gagal mengunggah file: ${err.message}`, 400));
      return;
    }
    next(err);
  });
}

function removeUploadedFiles(files: Express.Multer.File[]): void {
  for (const f of files) {
    if (f.path && fs.existsSync(f.path)) {
      try {
        fs.unlinkSync(f.path);
      } catch {
        // ignore cleanup error
      }
    }
  }
}

router.post(
  '/akta/:aktaId',
  requireAuth,
  handleMulterUpload,
  (req, res, next) => {
    const files = (req.files as Express.Multer.File[]) || [];
    try {
      const aktaId = Number(req.params.aktaId);
      if (!Number.isInteger(aktaId) || aktaId <= 0) {
        removeUploadedFiles(files);
        throw new AppError('ID akta tidak valid.', 400);
      }

      if (files.length === 0) {
        throw new AppError('Pilih minimal satu file untuk diunggah.', 400);
      }

      const akta = db
        .prepare('SELECT id, client_id, nomor_akta FROM akta WHERE id = ?')
        .get(aktaId) as { id: number; client_id: number; nomor_akta: string } | undefined;

      if (!akta) {
        removeUploadedFiles(files);
        throw new AppError('Akta tidak ditemukan.', 404);
      }

      const kategori = typeof req.body?.kategori === 'string' && req.body.kategori.trim()
        ? req.body.kategori.trim()
        : 'lampiran';

      const insertStmt = db.prepare(`
        INSERT INTO dokumen (akta_id, client_id, nama_file, path_file, mime_type, ukuran, kategori, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertedIds: number[] = [];
      const insertTx = db.transaction(() => {
        for (const file of files) {
          const info = insertStmt.run(
            akta.id,
            akta.client_id,
            file.originalname,
            file.filename,
            file.mimetype,
            file.size,
            kategori,
            req.user?.id ?? null
          );
          insertedIds.push(Number(info.lastInsertRowid));
        }
      });

      insertTx();

      const placeholders = insertedIds.map(() => '?').join(',');
      const created = db
        .prepare(`
          SELECT d.*, u.nama as uploaded_by_nama
          FROM dokumen d
          LEFT JOIN users u ON u.id = d.uploaded_by
          WHERE d.id IN (${placeholders})
          ORDER BY d.id DESC
        `)
        .all(...insertedIds);

      logActivity(
        req.user?.id ?? null,
        'UPLOAD',
        'dokumen',
        akta.id,
        `Mengunggah ${files.length} dokumen ke akta ${akta.nomor_akta}`
      );

      res.status(201).json({ data: created });
    } catch (err) {
      removeUploadedFiles(files);
      next(err);
    }
  }
);

router.get('/:id/file', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('ID dokumen tidak valid.', 400);
    }

    const doc = db
      .prepare('SELECT id, nama_file, path_file, mime_type FROM dokumen WHERE id = ?')
      .get(id) as
      | { id: number; nama_file: string; path_file: string; mime_type: string }
      | undefined;

    if (!doc) {
      throw new AppError('Dokumen tidak ditemukan.', 404);
    }

    const filePath = path.join(uploadsDir, path.basename(doc.path_file));
    if (!fs.existsSync(filePath)) {
      throw new AppError('File fisik tidak ditemukan di server.', 404);
    }

    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    const safeFilename = doc.nama_file.replace(/["\r\n]/g, '_');

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('ID dokumen tidak valid.', 400);
    }

    const doc = db
      .prepare('SELECT id, nama_file, path_file, akta_id FROM dokumen WHERE id = ?')
      .get(id) as { id: number; nama_file: string; path_file: string; akta_id: number } | undefined;

    if (!doc) {
      throw new AppError('Dokumen tidak ditemukan.', 404);
    }

    db.prepare('DELETE FROM dokumen WHERE id = ?').run(id);

    const filePath = path.join(uploadsDir, path.basename(doc.path_file));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fsErr) {
        console.error('Gagal menghapus file fisik:', filePath, fsErr);
      }
    }

    logActivity(
      req.user?.id ?? null,
      'DELETE',
      'dokumen',
      id,
      `Menghapus dokumen "${doc.nama_file}"`
    );

    res.json({ ok: true, message: 'Dokumen berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

export default router;
