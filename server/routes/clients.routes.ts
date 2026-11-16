import { Router } from 'express';
import db from '../db/index.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { clientSchema, type ClientInput } from '../schemas/client.schema.ts';
import { logActivity } from '../utils/audit.ts';

const router = Router();

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  nama: 'c.nama',
  jenis: 'c.jenis',
  nik: 'c.nik',
  created_at: 'c.created_at',
  total_akta: 'total_akta',
};

router.get('/', requireAuth, (req, res, next) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const jenis = String(req.query.jenis ?? 'semua').trim();
    const sortByRaw = String(req.query.sortBy ?? 'created_at');
    const sortOrderRaw = String(req.query.sortOrder ?? 'desc').toLowerCase();
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10));

    const sortCol = ALLOWED_SORT_COLUMNS[sortByRaw] || 'c.created_at';
    const sortDir = sortOrderRaw === 'asc' ? 'ASC' : 'DESC';

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (search) {
      whereClauses.push('(c.nama LIKE ? OR c.nik LIKE ? OR c.hp LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (jenis === 'perorangan' || jenis === 'perusahaan') {
      whereClauses.push('c.jenis = ?');
      params.push(jenis);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM clients c ${whereSql}`)
      .get(...params) as { total: number };

    const total = countRow.total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const rows = db
      .prepare(`
        SELECT
          c.*,
          COUNT(a.id) as total_akta
        FROM clients c
        LEFT JOIN akta a ON a.client_id = c.id
        ${whereSql}
        GROUP BY c.id
        ORDER BY ${sortCol} ${sortDir}, c.id DESC
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
      throw new AppError('ID klien tidak valid.', 400);
    }

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    if (!client) {
      throw new AppError('Klien tidak ditemukan.', 404);
    }

    const aktaList = db
      .prepare(`
        SELECT
          a.*,
          COALESCE(p.dibayar, 0) as total_dibayar,
          MAX(a.biaya - COALESCE(p.dibayar, 0), 0) as sisa_tagihan
        FROM akta a
        LEFT JOIN (
          SELECT akta_id, SUM(jumlah) as dibayar
          FROM pembayaran
          GROUP BY akta_id
        ) p ON p.akta_id = a.id
        WHERE a.client_id = ?
        ORDER BY a.tanggal_akta DESC, a.id DESC
      `)
      .all(id) as Array<{
      id: number;
      biaya: number;
      total_dibayar: number;
      sisa_tagihan: number;
    }>;

    const totalTagihan = aktaList.reduce((acc, item) => acc + (item.biaya || 0), 0);
    const totalDibayar = aktaList.reduce((acc, item) => acc + (item.total_dibayar || 0), 0);
    const sisaTagihan = Math.max(0, totalTagihan - totalDibayar);

    res.json({
      client,
      akta: aktaList,
      ringkasanKeuangan: {
        totalTagihan,
        totalDibayar,
        sisaTagihan,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validateBody(clientSchema), (req, res, next) => {
  try {
    const body = req.body as ClientInput;
    const nikVal = body.nik ? body.nik.trim() : null;
    const npwpVal = body.npwp ? body.npwp.trim() : null;

    if (nikVal) {
      const existing = db.prepare('SELECT id FROM clients WHERE nik = ?').get(nikVal);
      if (existing) {
        throw new AppError('NIK sudah terdaftar pada klien lain.', 409, {
          nik: 'NIK sudah terdaftar pada klien lain',
        });
      }
    }

    const result = db
      .prepare(`
        INSERT INTO clients (jenis, nama, nik, npwp, email, hp, alamat, pekerjaan, status_perkawinan, catatan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        body.jenis,
        body.nama,
        nikVal,
        npwpVal,
        body.email,
        body.hp,
        body.alamat,
        body.pekerjaan || '',
        body.status_perkawinan || (body.jenis === 'perusahaan' ? 'Tidak Berlaku' : ''),
        body.catatan || ''
      );

    const newId = Number(result.lastInsertRowid);
    const created = db.prepare('SELECT * FROM clients WHERE id = ?').get(newId);

    logActivity(
      req.user?.id ?? null,
      'CREATE',
      'clients',
      newId,
      `Menambahkan klien baru: ${body.nama}`
    );

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, validateBody(clientSchema), (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('ID klien tidak valid.', 400);
    }

    const existingClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    if (!existingClient) {
      throw new AppError('Klien tidak ditemukan.', 404);
    }

    const body = req.body as ClientInput;
    const nikVal = body.nik ? body.nik.trim() : null;
    const npwpVal = body.npwp ? body.npwp.trim() : null;

    if (nikVal) {
      const dup = db.prepare('SELECT id FROM clients WHERE nik = ? AND id != ?').get(nikVal, id);
      if (dup) {
        throw new AppError('NIK sudah terdaftar pada klien lain.', 409, {
          nik: 'NIK sudah terdaftar pada klien lain',
        });
      }
    }

    db.prepare(`
      UPDATE clients
      SET jenis = ?, nama = ?, nik = ?, npwp = ?, email = ?, hp = ?, alamat = ?, pekerjaan = ?, status_perkawinan = ?, catatan = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      body.jenis,
      body.nama,
      nikVal,
      npwpVal,
      body.email,
      body.hp,
      body.alamat,
      body.pekerjaan || '',
      body.status_perkawinan || (body.jenis === 'perusahaan' ? 'Tidak Berlaku' : ''),
      body.catatan || '',
      id
    );

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

    logActivity(
      req.user?.id ?? null,
      'UPDATE',
      'clients',
      id,
      `Memperbarui data klien: ${body.nama}`
    );

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('ID klien tidak valid.', 400);
    }

    const client = db.prepare('SELECT id, nama FROM clients WHERE id = ?').get(id) as
      | { id: number; nama: string }
      | undefined;

    if (!client) {
      throw new AppError('Klien tidak ditemukan.', 404);
    }

    const aktaCount = db
      .prepare('SELECT COUNT(*) as cnt FROM akta WHERE client_id = ?')
      .get(id) as { cnt: number };

    if (aktaCount.cnt > 0) {
      throw new AppError(
        `Klien "${client.nama}" tidak dapat dihapus karena masih memiliki ${aktaCount.cnt} akta terdaftar.`,
        409
      );
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);

    logActivity(
      req.user?.id ?? null,
      'DELETE',
      'clients',
      id,
      `Menghapus klien: ${client.nama}`
    );

    res.json({ ok: true, message: 'Klien berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

export default router;
