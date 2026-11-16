import { Router } from 'express';
import db from '../db/index.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

const BULAN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

router.get('/', requireAuth, (_req, res, next) => {
  try {
    const now = new Date();
    const currentYM = now.toISOString().slice(0, 7);
    const todayStr = formatDateISO(now);

    const plus7 = new Date(now);
    plus7.setDate(plus7.getDate() + 7);
    const plus7Str = formatDateISO(plus7);

    const minus30 = new Date(now);
    minus30.setDate(minus30.getDate() - 30);
    const minus30Str = formatDateISO(minus30);

    const totalKlien = (db.prepare('SELECT COUNT(*) as cnt FROM clients').get() as { cnt: number }).cnt;
    const totalAkta = (db.prepare('SELECT COUNT(*) as cnt FROM akta').get() as { cnt: number }).cnt;
    const aktaProses = (
      db.prepare("SELECT COUNT(*) as cnt FROM akta WHERE status IN ('draft', 'proses')").get() as { cnt: number }
    ).cnt;
    const aktaSelesai = (
      db.prepare("SELECT COUNT(*) as cnt FROM akta WHERE status IN ('selesai', 'diserahkan')").get() as { cnt: number }
    ).cnt;

    const totalTagihanRow = db
      .prepare(`
        SELECT COALESCE(SUM(MAX(a.biaya - COALESCE(p.dibayar, 0), 0)), 0) as total
        FROM akta a
        LEFT JOIN (
          SELECT akta_id, SUM(jumlah) as dibayar
          FROM pembayaran
          GROUP BY akta_id
        ) p ON p.akta_id = a.id
      `)
      .get() as { total: number };

    const pemasukanBulanIniRow = db
      .prepare(`
        SELECT COALESCE(SUM(jumlah), 0) as total
        FROM pembayaran
        WHERE substr(tanggal_bayar, 1, 7) = ?
      `)
      .get(currentYM) as { total: number };

    // 12 months revenue
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const startDateStr = formatDateISO(firstMonth);

    const monthlyRows = db
      .prepare(`
        SELECT substr(tanggal_bayar, 1, 7) as ym, COALESCE(SUM(jumlah), 0) as total
        FROM pembayaran
        WHERE tanggal_bayar >= ?
        GROUP BY ym
      `)
      .all(startDateStr) as Array<{ ym: string; total: number }>;

    const monthlyMap = new Map<string, number>();
    for (const r of monthlyRows) {
      monthlyMap.set(r.ym, r.total);
    }

    const pemasukan12Bulan: Array<{ bulan: string; label: string; total: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const ym = `${y}-${m}`;
      const label = `${BULAN_SHORT[d.getMonth()]} '${String(y).slice(2)}`;
      pemasukan12Bulan.push({
        bulan: ym,
        label,
        total: monthlyMap.get(ym) ?? 0,
      });
    }

    const aktaPerJenis = db
      .prepare(`
        SELECT jenis, COUNT(*) as jumlah
        FROM akta
        GROUP BY jenis
        ORDER BY jumlah DESC
      `)
      .all() as Array<{ jenis: string; jumlah: number }>;

    const aktaTerbaru = db
      .prepare(`
        SELECT a.id, a.nomor_akta, a.judul, a.jenis, a.status, a.tanggal_akta, a.target_selesai, a.biaya, a.client_id, c.nama as client_nama
        FROM akta a
        JOIN clients c ON c.id = a.client_id
        ORDER BY a.tanggal_akta DESC, a.id DESC
        LIMIT 5
      `)
      .all();

    const pembayaranTerbaru = db
      .prepare(`
        SELECT p.id, p.nomor_kwitansi, p.jumlah, p.metode, p.tanggal_bayar, p.akta_id, p.client_id, a.nomor_akta, c.nama as client_nama
        FROM pembayaran p
        JOIN akta a ON a.id = p.akta_id
        JOIN clients c ON c.id = p.client_id
        ORDER BY p.tanggal_bayar DESC, p.id DESC
        LIMIT 5
      `)
      .all();

    const rawMendekatiTarget = db
      .prepare(`
        SELECT a.id, a.nomor_akta, a.judul, a.jenis, a.status, a.target_selesai, a.client_id, c.nama as client_nama
        FROM akta a
        JOIN clients c ON c.id = a.client_id
        WHERE a.status IN ('draft', 'proses')
          AND a.target_selesai <= ?
        ORDER BY a.target_selesai ASC
      `)
      .all(plus7Str) as Array<{
      id: number;
      nomor_akta: string;
      judul: string;
      jenis: string;
      status: string;
      target_selesai: string;
      client_id: number;
      client_nama: string;
    }>;

    const todayMs = new Date(todayStr).getTime();
    const mendekatiTarget = rawMendekatiTarget.map((item) => {
      const targetMs = new Date(item.target_selesai).getTime();
      const hariTersisa = Math.round((targetMs - todayMs) / 86400000);
      return {
        ...item,
        hari_tersisa: hariTersisa,
      };
    });

    const selesaiBelumDiserahkan = db
      .prepare(`
        SELECT a.id, a.nomor_akta, a.judul, a.jenis, a.tanggal_selesai, a.tanggal_akta, a.client_id, c.nama as client_nama
        FROM akta a
        JOIN clients c ON c.id = a.client_id
        WHERE a.status = 'selesai'
        ORDER BY COALESCE(a.tanggal_selesai, a.tanggal_akta) ASC
      `)
      .all();

    const rawTagihanTerlambat = db
      .prepare(`
        SELECT
          a.id,
          a.nomor_akta,
          a.judul,
          a.tanggal_akta,
          a.biaya,
          COALESCE(p.dibayar, 0) as total_dibayar,
          (a.biaya - COALESCE(p.dibayar, 0)) as sisa_tagihan,
          a.client_id,
          c.nama as client_nama
        FROM akta a
        JOIN clients c ON c.id = a.client_id
        LEFT JOIN (
          SELECT akta_id, SUM(jumlah) as dibayar
          FROM pembayaran
          GROUP BY akta_id
        ) p ON p.akta_id = a.id
        WHERE (a.biaya - COALESCE(p.dibayar, 0)) > 0
          AND a.tanggal_akta <= ?
        ORDER BY a.tanggal_akta ASC
      `)
      .all(minus30Str) as Array<{
      id: number;
      nomor_akta: string;
      judul: string;
      tanggal_akta: string;
      biaya: number;
      total_dibayar: number;
      sisa_tagihan: number;
      client_id: number;
      client_nama: string;
    }>;

    const tagihanTerlambat = rawTagihanTerlambat.map((item) => {
      const aktaMs = new Date(item.tanggal_akta).getTime();
      const umurHari = Math.round((todayMs - aktaMs) / 86400000);
      return {
        ...item,
        umur_hari: umurHari,
      };
    });

    res.json({
      stats: {
        totalKlien,
        totalAkta,
        aktaProses,
        aktaSelesai,
        totalTagihanBelumLunas: totalTagihanRow.total,
        pemasukanBulanIni: pemasukanBulanIniRow.total,
      },
      pemasukan12Bulan,
      aktaPerJenis,
      aktaTerbaru,
      pembayaranTerbaru,
      pengingat: {
        mendekatiTarget,
        selesaiBelumDiserahkan,
        tagihanTerlambat,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
