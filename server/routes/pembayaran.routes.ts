import { Router } from 'express';
import db from '../db/index.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { pembayaranSchema, type PembayaranInput } from '../schemas/pembayaran.schema.ts';
import { logActivity } from '../utils/audit.ts';

const router = Router();

function generateNextKwitansiNumber(tanggalBayar: string): string {
  const year = /^\d{4}-\d{2}-\d{2}$/.test(tanggalBayar)
    ? tanggalBayar.slice(0, 4)
    : String(new Date().getFullYear());

  const prefix = `KW/${year}/`;
  const existing = db
    .prepare('SELECT nomor_kwitansi FROM pembayaran WHERE nomor_kwitansi LIKE ?')
    .all(`${prefix}%`) as Array<{ nomor_kwitansi: string }>;

  let maxSeq = 0;
  for (const row of existing) {
    const lastPart = row.nomor_kwitansi.split('/').pop() || '';
    const num = parseInt(lastPart, 10);
    if (!Number.isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

router.get('/', requireAuth, (req, res, next) => {
  try {
    const tanggalDari = String(req.query.tanggalDari ?? '').trim();
    const tanggalSampai = String(req.query.tanggalSampai ?? '').trim();
    const metode = String(req.query.metode ?? 'semua').trim();
    const clientId = String(req.query.clientId ?? '').trim();
    const search = String(req.query.search ?? '').trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '15'), 10) || 15));

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggalDari)) {
      whereClauses.push('p.tanggal_bayar >= ?');
      params.push(tanggalDari);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggalSampai)) {
      whereClauses.push('p.tanggal_bayar <= ?');
      params.push(tanggalSampai);
    }

    if (['tunai', 'transfer', 'qris'].includes(metode)) {
      whereClauses.push('p.metode = ?');
      params.push(metode);
    }

    if (clientId && /^\d+$/.test(clientId)) {
      whereClauses.push('p.client_id = ?');
      params.push(Number(clientId));
    }

    if (search) {
      whereClauses.push('(p.nomor_kwitansi LIKE ? OR a.nomor_akta LIKE ? OR c.nama LIKE ?)');
      const pat = `%${search}%`;
      params.push(pat, pat, pat);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const summaryRow = db
      .prepare(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(p.jumlah), 0) as total_nominal
        FROM pembayaran p
        JOIN akta a ON a.id = p.akta_id
        JOIN clients c ON c.id = p.client_id
        ${whereSql}
      `)
      .get(...params) as { total: number; total_nominal: number };

    const total = summaryRow.total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const rows = db
      .prepare(`
        SELECT
          p.*,
          a.nomor_akta,
          a.judul as akta_judul,
          a.jenis as akta_jenis,
          c.nama as client_nama,
          u.nama as created_by_nama
        FROM pembayaran p
        JOIN akta a ON a.id = p.akta_id
        JOIN clients c ON c.id = p.client_id
        LEFT JOIN users u ON u.id = p.created_by
        ${whereSql}
        ORDER BY p.tanggal_bayar DESC, p.id DESC
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
      totalNominal: summaryRow.total_nominal,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/kuitansi', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('ID pembayaran tidak valid.', 400);
    }

    const payment = db
      .prepare(`
        SELECT
          p.*,
          a.nomor_akta,
          a.judul as akta_judul,
          a.jenis as akta_jenis,
          a.biaya as akta_biaya,
          c.nama as client_nama,
          c.alamat as client_alamat,
          c.hp as client_hp,
          u.nama as petugas_nama
        FROM pembayaran p
        JOIN akta a ON a.id = p.akta_id
        JOIN clients c ON c.id = p.client_id
        LEFT JOIN users u ON u.id = p.created_by
        WHERE p.id = ?
      `)
      .get(id);

    if (!payment) {
      throw new AppError('Data pembayaran tidak ditemukan.', 404);
    }

    const settingRows = db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string;
      value: string;
    }>;
    const kantor: Record<string, string> = {};
    for (const s of settingRows) {
      kantor[s.key] = s.value;
    }

    res.json({ pembayaran: payment, kantor });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validateBody(pembayaranSchema), (req, res, next) => {
  try {
    const body = req.body as PembayaranInput;

    const akta = db
      .prepare('SELECT id, client_id, nomor_akta, biaya FROM akta WHERE id = ?')
      .get(body.akta_id) as
      | { id: number; client_id: number; nomor_akta: string; biaya: number }
      | undefined;

    if (!akta) {
      throw new AppError('Akta tidak ditemukan.', 404);
    }

    const paidRow = db
      .prepare('SELECT COALESCE(SUM(jumlah), 0) as total FROM pembayaran WHERE akta_id = ?')
      .get(akta.id) as { total: number };

    const sisaTagihan = Math.max(0, akta.biaya - paidRow.total);

    if (sisaTagihan === 0) {
      throw new AppError('Tagihan untuk akta ini sudah lunas seluruhnya.', 400);
    }

    if (body.jumlah > sisaTagihan) {
      const formattedSisa = new Intl.NumberFormat('id-ID').format(sisaTagihan);
      throw new AppError(
        `Jumlah pembayaran melebihi sisa tagihan (maksimal Rp ${formattedSisa}).`,
        400,
        { jumlah: `Maksimal Rp ${formattedSisa}` }
      );
    }

    const nomorKwitansi = generateNextKwitansiNumber(body.tanggal_bayar);

    const result = db
      .prepare(`
        INSERT INTO pembayaran (akta_id, client_id, nomor_kwitansi, jumlah, metode, tanggal_bayar, keterangan, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        akta.id,
        akta.client_id,
        nomorKwitansi,
        body.jumlah,
        body.metode,
        body.tanggal_bayar,
        body.keterangan || '',
        req.user?.id ?? null
      );

    const newId = Number(result.lastInsertRowid);
    const created = db
      .prepare(`
        SELECT p.*, u.nama as created_by_nama
        FROM pembayaran p
        LEFT JOIN users u ON u.id = p.created_by
        WHERE p.id = ?
      `)
      .get(newId);

    logActivity(
      req.user?.id ?? null,
      'CREATE',
      'pembayaran',
      newId,
      `Mencatat pembayaran ${nomorKwitansi} untuk akta ${akta.nomor_akta} sebesar Rp ${body.jumlah}`
    );

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('ID pembayaran tidak valid.', 400);
    }

    const payment = db
      .prepare('SELECT id, nomor_kwitansi, jumlah FROM pembayaran WHERE id = ?')
      .get(id) as { id: number; nomor_kwitansi: string; jumlah: number } | undefined;

    if (!payment) {
      throw new AppError('Data pembayaran tidak ditemukan.', 404);
    }

    db.prepare('DELETE FROM pembayaran WHERE id = ?').run(id);

    logActivity(
      req.user?.id ?? null,
      'DELETE',
      'pembayaran',
      id,
      `Menghapus pembayaran ${payment.nomor_kwitansi} sebesar Rp ${payment.jumlah}`
    );

    res.json({ ok: true, message: 'Pembayaran berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

export default router;
