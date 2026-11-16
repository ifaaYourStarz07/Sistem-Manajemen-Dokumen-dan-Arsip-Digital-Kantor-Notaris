import { Router } from 'express';
import db from '../db/index.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({
        clients: [],
        akta: [],
        kuitansi: [],
      });
      return;
    }

    const like = `%${q}%`;

    const clients = db
      .prepare(
        `
        SELECT id, jenis, nama, nik, hp, email
        FROM clients
        WHERE nama LIKE ? OR COALESCE(nik, '') LIKE ? OR hp LIKE ? OR email LIKE ?
        ORDER BY nama ASC
        LIMIT 6
        `
      )
      .all(like, like, like, like);

    const akta = db
      .prepare(
        `
        SELECT a.id, a.nomor_akta, a.judul, a.jenis, a.status, a.tanggal_akta,
               c.id as client_id, c.nama as client_nama
        FROM akta a
        JOIN clients c ON c.id = a.client_id
        WHERE a.nomor_akta LIKE ? OR a.judul LIKE ? OR a.jenis LIKE ? OR c.nama LIKE ?
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT 6
        `
      )
      .all(like, like, like, like);

    const kuitansi = db
      .prepare(
        `
        SELECT p.id, p.nomor_kwitansi, p.jumlah, p.metode, p.tanggal_bayar,
               p.akta_id, a.nomor_akta, c.id as client_id, c.nama as client_nama
        FROM pembayaran p
        JOIN akta a ON a.id = p.akta_id
        JOIN clients c ON c.id = p.client_id
        WHERE p.nomor_kwitansi LIKE ? OR a.nomor_akta LIKE ? OR c.nama LIKE ?
        ORDER BY p.tanggal_bayar DESC, p.id DESC
        LIMIT 6
        `
      )
      .all(like, like, like);

    res.json({
      clients,
      akta,
      kuitansi,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
