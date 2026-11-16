import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import db, { uploadsDir } from '../db/index.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

router.get('/kantor', requireAuth, (_req, res, next) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string;
      value: string;
    }>;
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
});

router.get('/logo', requireAuth, (_req, res, next) => {
  try {
    const row = db
      .prepare("SELECT value FROM settings WHERE key = 'logo_kantor'")
      .get() as { value: string } | undefined;

    if (!row || !row.value) {
      throw new AppError('Logo kantor belum diunggah.', 404);
    }

    const filePath = path.join(uploadsDir, path.basename(row.value));
    if (!fs.existsSync(filePath)) {
      throw new AppError('File logo kantor tidak ditemukan.', 404);
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

export default router;
