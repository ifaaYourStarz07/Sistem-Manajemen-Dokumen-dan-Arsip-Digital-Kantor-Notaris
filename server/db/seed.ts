import bcrypt from 'bcryptjs';
import db from './index.ts';

function daysOffsetISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthsAgoDayISO(monthsAgo: number, dayOfMonth = 15): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(Math.min(dayOfMonth, 28));
  return d.toISOString().slice(0, 10);
}

export function runSeed(): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return;
  }

  const insertSeed = db.transaction(() => {
    const adminHash = bcrypt.hashSync('password', 10);
    const stafHash = bcrypt.hashSync('password', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (nama, email, password_hash, role, aktif)
      VALUES (?, ?, ?, ?, 1)
    `);

    const adminName = 'Dr. Hendra Wijaya, S.H., M.Kn.';
    const stafName = 'Siti Rahmawati';

    const adminRes = insertUser.run(adminName, 'admin@notarydutty.test', adminHash, 'admin');
    const stafRes = insertUser.run(stafName, 'staf@notarydutty.test', stafHash, 'staf');

    const adminId = Number(adminRes.lastInsertRowid);
    const stafId = Number(stafRes.lastInsertRowid);

    const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
    insertSetting.run('nama_kantor', 'Kantor Notaris & PPAT Dr. Hendra Wijaya, S.H., M.Kn.');
    insertSetting.run('nama_notaris', 'Dr. Hendra Wijaya, S.H., M.Kn.');
    insertSetting.run('alamat_kantor', 'Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan 12190');
    insertSetting.run('telepon_kantor', '(021) 5150-8842');
    insertSetting.run('email_kantor', 'sekretariat@notarydutty.test');
    insertSetting.run('sk_pengangkatan', 'AHU-00412.AH.02.01.Tahun 2019');
    insertSetting.run('logo_kantor', '');

    const insertClient = db.prepare(`
      INSERT INTO clients (jenis, nama, nik, npwp, email, hp, alamat, pekerjaan, status_perkawinan, catatan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 8 klien (campuran perorangan dan perusahaan, NIK 16 digit)
    const clientsData = [
      ['perorangan', 'Ahmad Fauzi Pratama', '3174011505850001', '3174011505850001', 'ahmad.fauzi@gmail.com', '081288990011', 'Jl. Kemang Raya No. 45, Jakarta Selatan', 'Wiraswasta', 'Kawin', 'Klien prioritas transaksi properti Kemang.', monthsAgoDayISO(11, 5)],
      ['perusahaan', 'PT Nusantara Maju Sejahtera', '3171022003780002', '0134567890120001', 'legal@nusantaramaju.co.id', '02155667788', 'Menara Sudirman Lt. 14, Jakarta Pusat', 'Perdagangan & Logistik', 'Tidak Berlaku', 'Akta pendirian dan perubahan AD berkala.', monthsAgoDayISO(10, 10)],
      ['perorangan', 'Ratna Dewi Kusuma', '3273045208900003', '3273045208900003', 'ratna.kusuma@yahoo.com', '081322334455', 'Jl. Dago Pakar Barat No. 12, Bandung', 'Dokter Spesialis', 'Kawin', 'Memerlukan akta hibah keluarga.', monthsAgoDayISO(9, 12)],
      ['perusahaan', 'CV Karya Abadi Sentosa', '3578051109820004', '0245678901230002', 'admin@karyaabadi.id', '03177889900', 'Jl. Basuki Rahmat No. 88, Surabaya', 'Konstruksi & Pengadaan', 'Tidak Berlaku', 'Pengurusan akta perjanjian kerjasama.', monthsAgoDayISO(8, 18)],
      ['perorangan', 'Hendra Gunawan', '3173060707790005', '3173060707790005', 'hendra.gunawan@outlook.com', '081599887766', 'Jl. Puri Indah Blok K2 No. 9, Jakarta Barat', 'Direktur Perusahaan', 'Kawin', 'Jual beli ruko dan aset di Jakarta Barat.', monthsAgoDayISO(7, 4)],
      ['perorangan', 'Nadia Putri Maharani', '3674076404940006', '3674076404940006', 'nadia.maharani@gmail.com', '081766554433', 'BSD City Cluster The Zora No. 21, Tangerang Selatan', 'Arsitek', 'Belum Kawin', 'Perjanjian sewa menyewa jangka panjang.', monthsAgoDayISO(6, 20)],
      ['perusahaan', 'PT Global Teknologi Indonesia', '3174081212800007', '0356789012340003', 'corpsec@globaltech.co.id', '02129004411', 'SCBD Lot 28 Equity Tower Lt. 22, Jakarta Selatan', 'Teknologi Informasi', 'Tidak Berlaku', 'RUPS tahunan dan perubahan susunan direksi.', monthsAgoDayISO(5, 8)],
      ['perorangan', 'Bambang Sudirman', '3374090303650008', '3374090303650008', 'bambang.sudirman@gmail.com', '081122334466', 'Jl. Pemuda No. 102, Semarang', 'Pensiunan BUMN', 'Kawin', 'Pembuatan akta wasiat dan pembagian waris.', monthsAgoDayISO(4, 14)],
    ];

    const clientIds: number[] = [];
    for (const c of clientsData) {
      const res = insertClient.run(...c);
      clientIds.push(Number(res.lastInsertRowid));
    }

    const insertAkta = db.prepare(`
      INSERT INTO akta (nomor_akta, judul, jenis, client_id, tanggal_akta, target_selesai, tanggal_selesai, status, biaya, catatan, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 15 akta dengan status bervariasi dan beberapa melewati target selesai
    const aktaData = [
      ['001/AKTA/XI/2025', 'Akta Jual Beli Tanah & Bangunan Kemang', 'Jual Beli', clientIds[0], monthsAgoDayISO(11, 8), monthsAgoDayISO(11, 22), monthsAgoDayISO(11, 20), 'diserahkan', 18500000, 'AJB selesai dan salinan telah diserahkan.', adminId, monthsAgoDayISO(11, 8)],
      ['002/AKTA/XII/2025', 'Akta Pendirian PT Nusantara Maju Sejahtera', 'Pendirian PT', clientIds[1], monthsAgoDayISO(10, 12), monthsAgoDayISO(10, 26), monthsAgoDayISO(10, 25), 'diserahkan', 12000000, 'SK Kemenkumham terbit.', adminId, monthsAgoDayISO(10, 12)],
      ['001/AKTA/I/2026', 'Akta Hibah Tanah Dago Pakar', 'Hibah', clientIds[2], monthsAgoDayISO(9, 14), monthsAgoDayISO(9, 28), monthsAgoDayISO(9, 27), 'diserahkan', 14500000, 'Proses balik nama selesai.', adminId, monthsAgoDayISO(9, 14)],
      ['002/AKTA/II/2026', 'Perjanjian Kerjasama Proyek Infrastruktur', 'Perjanjian', clientIds[3], monthsAgoDayISO(8, 20), monthsAgoDayISO(7, 5), monthsAgoDayISO(7, 3), 'diserahkan', 16000000, 'Dokumen asli disimpan klien.', stafId, monthsAgoDayISO(8, 20)],
      ['003/AKTA/III/2026', 'Akta Jual Beli Ruko Puri Indah', 'Jual Beli', clientIds[4], monthsAgoDayISO(7, 6), monthsAgoDayISO(7, 21), monthsAgoDayISO(7, 19), 'diserahkan', 22000000, 'Pajak BPHTB & PPh lunas.', adminId, monthsAgoDayISO(7, 6)],
      ['004/AKTA/IV/2026', 'Perjanjian Sewa Menyewa Ruang Usaha BSD', 'Perjanjian', clientIds[5], monthsAgoDayISO(6, 21), monthsAgoDayISO(5, 4), monthsAgoDayISO(5, 2), 'diserahkan', 8500000, 'Sewa tenor 5 tahun.', stafId, monthsAgoDayISO(6, 21)],
      ['005/AKTA/V/2026', 'Akta Pernyataan Keputusan RUPS Tahunan', 'Lainnya', clientIds[6], monthsAgoDayISO(5, 10), monthsAgoDayISO(5, 24), monthsAgoDayISO(5, 22), 'diserahkan', 15000000, 'Pelaporan AHU selesai.', adminId, monthsAgoDayISO(5, 10)],
      ['006/AKTA/VI/2026', 'Akta Wasiat & Pembagian Waris Keluarga Sudirman', 'Waris', clientIds[7], monthsAgoDayISO(4, 15), monthsAgoDayISO(4, 29), monthsAgoDayISO(4, 28), 'diserahkan', 9500000, 'Terdaftar di Daftar Pusat Wasiat.', adminId, monthsAgoDayISO(4, 15)],
      ['007/AKTA/VIII/2026', 'Akta Kuasa Menjual Aset Puri Indah', 'Kuasa', clientIds[4], daysOffsetISO(-46), daysOffsetISO(-15), daysOffsetISO(-16), 'selesai', 7500000, 'Menunggu pelunasan termin kedua dan serah terima.', stafId, daysOffsetISO(-46)],
      ['008/AKTA/IX/2026', 'Pendirian PT Nusantara Ekspansi Logistik', 'Pendirian PT', clientIds[1], daysOffsetISO(-38), daysOffsetISO(-8), daysOffsetISO(-10), 'selesai', 14000000, 'Minuta selesai, menunggu pengambilan salinan akta.', adminId, daysOffsetISO(-38)],
      ['009/AKTA/X/2026', 'Akta Jaminan Fidusia Pembiayaan Alat Berat', 'Fidusia', clientIds[3], daysOffsetISO(-22), daysOffsetISO(-4), daysOffsetISO(-2), 'selesai', 13500000, 'Sertifikat fidusia sudah terbit.', adminId, daysOffsetISO(-22)],
      ['010/AKTA/XI/2026', 'Akta Perubahan Direksi & Komisaris PT Global', 'Lainnya', clientIds[6], daysOffsetISO(-16), daysOffsetISO(-3), null, 'proses', 19500000, 'Verifikasi AHU Kemenkumham melewati target karena revisi data pemegang saham.', stafId, daysOffsetISO(-16)],
      ['011/AKTA/XI/2026', 'Akta Pendirian CV Karya Abadi Cabang Barat', 'Pendirian CV', clientIds[3], daysOffsetISO(-12), daysOffsetISO(-1), null, 'proses', 8000000, 'Melewati target selesai 1 hari, menunggu tanda tangan direksi.', stafId, daysOffsetISO(-12)],
      ['012/AKTA/XI/2026', 'Akta Perjanjian Kerjasama Studio Arsitektur', 'Perjanjian', clientIds[5], daysOffsetISO(-5), daysOffsetISO(4), null, 'proses', 11000000, 'Review final draft oleh kedua belah pihak.', adminId, daysOffsetISO(-5)],
      ['013/AKTA/XI/2026', 'Akta Hibah Aset Keluarga Pratama', 'Hibah', clientIds[0], daysOffsetISO(-2), daysOffsetISO(12), null, 'draft', 12500000, 'Belum ada pembayaran, menunggu kelengkapan KTP ahli waris.', stafId, daysOffsetISO(-2)],
    ];

    const insertHistory = db.prepare(`
      INSERT INTO akta_status_history (akta_id, dari_status, ke_status, diubah_oleh, diubah_oleh_nama, catatan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const aktaIds: number[] = [];
    for (const a of aktaData) {
      const res = insertAkta.run(...a);
      const id = Number(res.lastInsertRowid);
      aktaIds.push(id);

      const status = a[7] as string;
      const actorId = a[10] as number;
      const actorNama = actorId === adminId ? adminName : stafName;
      const created = a[11] as string;

      insertHistory.run(id, null, 'draft', actorId, actorNama, 'Akta terdaftar dalam sistem', created);
      if (status !== 'draft') {
        insertHistory.run(id, 'draft', 'proses', actorId, actorNama, 'Penyusunan minuta akta dimulai', created);
      }
      if (status === 'selesai' || status === 'diserahkan') {
        insertHistory.run(id, 'proses', 'selesai', adminId, adminName, 'Minuta & salinan akta selesai ditandatangani', (a[6] as string) || created);
      }
      if (status === 'diserahkan') {
        insertHistory.run(id, 'selesai', 'diserahkan', actorId, actorNama, 'Salinan akta diserahkan kepada klien', (a[6] as string) || created);
      }
    }

    const insertPembayaran = db.prepare(`
      INSERT INTO pembayaran (akta_id, client_id, nomor_kwitansi, jumlah, metode, tanggal_bayar, keterangan, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Campuran lunas, sebagian, dan akta tanpa pembayaran (belum lunas)
    const paymentsData = [
      [aktaIds[0], clientIds[0], 'KW/2025/0001', 18500000, 'transfer', monthsAgoDayISO(11, 12), 'Pelunasan penuh AJB Kemang', adminId, monthsAgoDayISO(11, 12)],
      [aktaIds[1], clientIds[1], 'KW/2025/0002', 12000000, 'transfer', monthsAgoDayISO(10, 15), 'Pelunasan pendirian PT', adminId, monthsAgoDayISO(10, 15)],
      [aktaIds[2], clientIds[2], 'KW/2026/0001', 14500000, 'transfer', monthsAgoDayISO(9, 18), 'Pelunasan akta hibah', stafId, monthsAgoDayISO(9, 18)],
      [aktaIds[3], clientIds[3], 'KW/2026/0002', 16000000, 'transfer', monthsAgoDayISO(8, 25), 'Pelunasan kerjasama infrastruktur', adminId, monthsAgoDayISO(8, 25)],
      [aktaIds[4], clientIds[4], 'KW/2026/0003', 22000000, 'transfer', monthsAgoDayISO(7, 10), 'Pelunasan AJB Ruko Puri Indah', adminId, monthsAgoDayISO(7, 10)],
      [aktaIds[5], clientIds[5], 'KW/2026/0004', 8500000, 'qris', monthsAgoDayISO(6, 22), 'Pembayaran QRIS lunas', stafId, monthsAgoDayISO(6, 22)],
      [aktaIds[6], clientIds[6], 'KW/2026/0005', 15000000, 'transfer', monthsAgoDayISO(5, 14), 'Invoice RUPS lunas', adminId, monthsAgoDayISO(5, 14)],
      [aktaIds[7], clientIds[7], 'KW/2026/0006', 9500000, 'tunai', monthsAgoDayISO(4, 18), 'Pembayaran tunai di kantor', stafId, monthsAgoDayISO(4, 18)],
      [aktaIds[8], clientIds[4], 'KW/2026/0007', 4000000, 'transfer', daysOffsetISO(-42), 'Uang muka termin 1 (sebagian)', adminId, daysOffsetISO(-42)],
      [aktaIds[9], clientIds[1], 'KW/2026/0008', 6000000, 'transfer', daysOffsetISO(-35), 'DP pendirian cabang (sebagian)', stafId, daysOffsetISO(-35)],
      [aktaIds[10], clientIds[3], 'KW/2026/0009', 13500000, 'transfer', daysOffsetISO(-3), 'Pelunasan akta jaminan fidusia', adminId, daysOffsetISO(-3)],
      [aktaIds[11], clientIds[6], 'KW/2026/0010', 10000000, 'transfer', daysOffsetISO(-2), 'Termin 1 perubahan direksi (sebagian)', stafId, daysOffsetISO(-2)],
      [aktaIds[12], clientIds[3], 'KW/2026/0011', 4000000, 'qris', daysOffsetISO(-1), 'DP Pendirian CV (sebagian)', stafId, daysOffsetISO(-1)],
      // aktaIds[13] and aktaIds[14] intentionally have 0 payments ("Belum Lunas")
    ];

    for (const p of paymentsData) {
      insertPembayaran.run(...p);
    }

    const insertLog = db.prepare(`
      INSERT INTO activity_logs (user_id, aksi, entitas, entitas_id, detail, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertLog.run(adminId, 'INIT', 'system', null, 'Inisialisasi data awal NOTARYDUTTY selesai', daysOffsetISO(-10));
    insertLog.run(adminId, 'CREATE', 'akta', aktaIds[10], 'Membuat akta 009/AKTA/X/2026', daysOffsetISO(-3));
    insertLog.run(stafId, 'CREATE', 'pembayaran', 13, 'Mencatat pembayaran KW/2026/0011 sebesar Rp 4.000.000', daysOffsetISO(-1));
  });

  insertSeed();
}
