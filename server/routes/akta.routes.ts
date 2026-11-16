import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import db, { uploadsDir } from '../db/index.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { aktaSchema, type AktaInput } from '../schemas/akta.schema.ts';
import { logActivity } from '../utils/audit.ts';

const router = Router();

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const ALLOWED_SORT: Record<string, string> = {
  nomor_akta: 'a.nomor_akta',
  jenis: 'a.jenis',
  tanggal_akta: 'a.tanggal_akta',
  target_selesai: 'a.target_selesai',
  status: 'a.status',
  biaya: 'a.biaya',
  created_at: 'a.created_at',
};

function generateNextAktaNumber(tanggalStr?: string): string {
  const dateObj =
    tanggalStr && /^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)
      ? new Date(`${tanggalStr}T00:00:00`)
      : new Date();
  const year = dateObj.getFullYear();
  const monthIdx = dateObj.getMonth();
  const romanMonth = ROMAN_MONTHS[monthIdx] || 'I';

  const existing = db
    .prepare(`SELECT nomor_akta FROM akta WHERE nomor_akta LIKE ?`)
    .all(`%/${year}`) as Array<{ nomor_akta: string }>;

  let maxSeq = 0;
  for (const row of existing) {
    const firstPart = row.nomor_akta.split('/')[0];
    const num = parseInt(firstPart, 10);
    if (!Number.isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${nextSeq}/AKTA/${romanMonth}/${year}`;
}

router.get('/generate-number', requireAuth, (req, res) => {
  const tanggal = typeof req.query.tanggal === 'string' ? req.query.tanggal : undefined;
  const nomor_akta = generateNextAktaNumber(tanggal);
  res.json({ nomor_akta });
});

router.get('/', requireAuth, (req, res, next) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const status = String(req.query.status ?? 'semua').trim();
    const tanggalDari = String(req.query.tanggalDari ?? '').trim();
    const tanggalSampai = String(req.query.tanggalSampai ?? '').trim();
    const sortByRaw = String(req.query.sortBy ?? 'tanggal_akta');
    const sortOrderRaw = String(req.query.sortOrder ?? 'desc').toLowerCase();
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10));

    const sortCol = ALLOWED_SORT[sortByRaw] || 'a.tanggal_akta';
    const sortDir = sortOrderRaw === 'asc' ? 'ASC' : 'DESC';

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (search) {
      whereClauses.push('(a.nomor_akta LIKE ? OR a.jenis LIKE ? OR a.judul LIKE ? OR c.nama LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (['draft', 'proses', 'selesai', 'diserahkan'].includes(status)) {
      whereClauses.push('a.status = ?');
      params.push(status);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggalDari)) {
      whereClauses.push('a.tanggal_akta >= ?');
      params.push(tanggalDari);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggalSampai)) {
      whereClauses.push('a.tanggal_akta <= ?');
      params.push(tanggalSampai);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db
      .prepare(`
        SELECT COUNT(*) as total
        FROM akta a
        JOIN clients c ON c.id = a.client_id
        ${whereSql}
      `)
      .get(...params) as { total: number };

    const total = countRow.total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const rows = db
      .prepare(`
        SELECT
          a.*,
          c.nama as client_nama,
          c.jenis as client_jenis,
          COALESCE(p.dibayar, 0) as total_dibayar,
          MAX(a.biaya - COALESCE(p.dibayar, 0), 0) as sisa_tagihan,
          COALESCE(d.jml_dokumen, 0) as total_dokumen
        FROM akta a
        JOIN clients c ON c.id = a.client_id
        LEFT JOIN (
          SELECT akta_id, SUM(jumlah) as dibayar
          FROM pembayaran
          GROUP BY akta_id
        ) p ON p.akta_id = a.id
        LEFT JOIN (
          SELECT akta_id, COUNT(*) as jml_dokumen
          FROM dokumen
          GROUP BY akta_id
        ) d ON d.akta_id = a.id
        ${whereSql}
        ORDER BY ${sortCol} ${sortDir}, a.id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, offset);

    res.json({
      data: rows,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('ID akta tidak valid.', 400);
    }

    const akta = db
      .prepare(`
        SELECT
          a.*,
          c.nama as client_nama,
          c.jenis as client_jenis,
          c.nik as client_nik,
          c.email as client_email,
          c.hp as client_hp,
          c.alamat as client_alamat
        FROM akta a
        JOIN clients c ON c.id = a.client_id
        WHERE a.id = ?
      `)
      .get(id) as
      | {
          id: number;
          biaya: number;
          [key: string]: unknown;
        }
      | undefined;

    if (!akta) {
      throw new AppError('Akta tidak ditemukan.', 404);
    }

    const dokumen = db
      .prepare(`
        SELECT d.*, u.nama as uploaded_by_nama
        FROM dokumen d
        LEFT JOIN users u ON u.id = d.uploaded_by
        WHERE d.akta_id = ?
        ORDER BY d.id DESC
      `)
      .all(id);

    const pembayaran = db
      .prepare(`
        SELECT p.*, u.nama as created_by_nama
        FROM pembayaran p
        LEFT JOIN users u ON u.id = p.created_by
        WHERE p.akta_id = ?
        ORDER BY p.tanggal_bayar DESC, p.id DESC
      `)
      .all(id) as Array<{ jumlah: number; [key: string]: unknown }>;

    const statusHistory = db
      .prepare(`
        SELECT *
        FROM akta_status_history
        WHERE akta_id = ?
        ORDER BY created_at DESC, id DESC
      `)
      .all(id);

    const totalBiaya = akta.biaya || 0;
    const totalDibayar = pembayaran.reduce((sum, p) => sum + (p.jumlah || 0), 0);
    const sisaTagihan = Math.max(0, totalBiaya - totalDibayar);
    const persentase =
      totalBiaya > 0 ? Math.min(100, Math.round((totalDibayar / totalBiaya) * 100)) : 100;

    let statusPembayaran: 'lunas' | 'sebagian' | 'belum_lunas' = 'belum_lunas';
    if (sisaTagihan === 0) {
      statusPembayaran = 'lunas';
    } else if (totalDibayar > 0) {
      statusPembayaran = 'sebagian';
    }

    res.json({
      akta,
      dokumen,
      pembayaran,
      statusHistory,
      ringkasanPembayaran: {
        totalBiaya,
        totalDibayar,
        sisaTagihan,
        persentase,
        statusPembayaran,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validateBody(aktaSchema), (req, res, next) => {
  try {
    const body = req.body as AktaInput;

    const client = db.prepare('SELECT id, nama FROM clients WHERE id = ?').get(body.client_id) as
      | { id: number; nama: string }
      | undefined;
    if (!client) {
      throw new AppError('Klien tidak ditemukan.', 404);
    }

    const dup = db.prepare('SELECT id FROM akta WHERE nomor_akta = ?').get(body.nomor_akta);
    if (dup) {
      throw new AppError('Nomor akta sudah digunakan.', 409, {
        nomor_akta: 'Nomor akta sudah terdaftar',
      });
    }

    const finalJudul = body.judul.trim() || `${body.jenis} — ${client.nama}`;
    const tanggalSelesai =
      body.status === 'selesai' || body.status === 'diserahkan'
        ? body.tanggal_selesai || new Date().toISOString().slice(0, 10)
        : null;

    const actorId = req.user?.id ?? null;
    const actorName = req.user?.nama ?? 'Sistem';

    const createTx = db.transaction(() => {
      const result = db
        .prepare(`
          INSERT INTO akta (nomor_akta, judul, jenis, client_id, tanggal_akta, target_selesai, tanggal_selesai, status, biaya, catatan, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          body.nomor_akta,
          finalJudul,
          body.jenis,
          body.client_id,
          body.tanggal_akta,
          body.target_selesai,
          tanggalSelesai,
          body.status,
          body.biaya,
          body.catatan || '',
          actorId
        );

      const newId = Number(result.lastInsertRowid);

      db.prepare(`
        INSERT INTO akta_status_history (akta_id, dari_status, ke_status, diubah_oleh, diubah_oleh_nama, catatan)
        VALUES (?, NULL, ?, ?, ?, ?)
      `).run(newId, body.status, actorId, actorName, body.status_catatan || 'Akta dibuat');

      return newId;
    });

    const newId = createTx();
    const created = db.prepare('SELECT * FROM akta WHERE id = ?').get(newId);

    logActivity(
      actorId,
      'CREATE',
      'akta',
      newId,
      `Membuat akta ${body.nomor_akta} (${body.jenis}) untuk ${client.nama}`
    );

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, validateBody(aktaSchema), (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('ID akta tidak valid.', 400);
    }

    const existing = db.prepare('SELECT * FROM akta WHERE id = ?').get(id) as
      | {
          id: number;
          status: string;
          tanggal_selesai: string | null;
        }
      | undefined;

    if (!existing) {
      throw new AppError('Akta tidak ditemukan.', 404);
    }

    const body = req.body as AktaInput;

    const client = db.prepare('SELECT id, nama FROM clients WHERE id = ?').get(body.client_id) as
      | { id: number; nama: string }
      | undefined;
    if (!client) {
      throw new AppError('Klien tidak ditemukan.', 404);
    }

    const dup = db
      .prepare('SELECT id FROM akta WHERE nomor_akta = ? AND id != ?')
      .get(body.nomor_akta, id);
    if (dup) {
      throw new AppError('Nomor akta sudah digunakan oleh akta lain.', 409, {
        nomor_akta: 'Nomor akta sudah terdaftar',
      });
    }

    const finalJudul = body.judul.trim() || `${body.jenis} — ${client.nama}`;
    let tanggalSelesai = existing.tanggal_selesai;
    if (body.status === 'selesai' || body.status === 'diserahkan') {
      tanggalSelesai = body.tanggal_selesai || existing.tanggal_selesai || new Date().toISOString().slice(0, 10);
    } else {
      tanggalSelesai = null;
    }

    const actorId = req.user?.id ?? null;
    const actorName = req.user?.nama ?? 'Sistem';

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE akta
        SET nomor_akta = ?, judul = ?, jenis = ?, client_id = ?, tanggal_akta = ?, target_selesai = ?, tanggal_selesai = ?, status = ?, biaya = ?, catatan = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.nomor_akta,
        finalJudul,
        body.jenis,
        body.client_id,
        body.tanggal_akta,
        body.target_selesai,
        tanggalSelesai,
        body.status,
        body.biaya,
        body.catatan || '',
        id
      );

      if (existing.status !== body.status) {
        db.prepare(`
          INSERT INTO akta_status_history (akta_id, dari_status, ke_status, diubah_oleh, diubah_oleh_nama, catatan)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          id,
          existing.status,
          body.status,
          actorId,
          actorName,
          body.status_catatan || `Perubahan status dari ${existing.status} ke ${body.status}`
        );
      }
    });

    updateTx();
    const updated = db.prepare('SELECT * FROM akta WHERE id = ?').get(id);

    logActivity(
      actorId,
      'UPDATE',
      'akta',
      id,
      `Memperbarui akta ${body.nomor_akta}`
    );

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// Hanya Admin (Notaris) yang boleh menghapus akta beserta dokumen, pembayaran, dan file fisiknya
router.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('ID akta tidak valid.', 400);
    }

    const akta = db.prepare('SELECT id, nomor_akta FROM akta WHERE id = ?').get(id) as
      | { id: number; nomor_akta: string }
      | undefined;

    if (!akta) {
      throw new AppError('Akta tidak ditemukan.', 404);
    }

    const docs = db
      .prepare('SELECT id, path_file FROM dokumen WHERE akta_id = ?')
      .all(id) as Array<{ id: number; path_file: string }>;

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM akta WHERE id = ?').run(id);
    });
    deleteTx();

    // Hapus file fisik secara aman setelah transaksi database berhasil
    for (const doc of docs) {
      const fullPath = path.join(uploadsDir, path.basename(doc.path_file));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (fsErr) {
          console.error('Gagal menghapus file fisik:', fullPath, fsErr);
        }
      }
    }

    logActivity(
      req.user?.id ?? null,
      'DELETE',
      'akta',
      id,
      `Menghapus akta ${akta.nomor_akta} beserta ${docs.length} dokumen dan pembayaran terkait`
    );

    res.json({ ok: true, message: 'Akta beserta dokumen dan pembayaran terkait berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

export default router;
