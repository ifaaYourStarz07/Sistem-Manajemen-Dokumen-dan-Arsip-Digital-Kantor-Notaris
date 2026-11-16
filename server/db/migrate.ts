import db from './index.ts';

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staf')),
      aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jenis TEXT NOT NULL CHECK(jenis IN ('perorangan', 'perusahaan')),
      nama TEXT NOT NULL,
      nik TEXT UNIQUE,
      npwp TEXT,
      email TEXT NOT NULL,
      hp TEXT NOT NULL,
      alamat TEXT NOT NULL,
      pekerjaan TEXT,
      status_perkawinan TEXT,
      catatan TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_clients_nama ON clients(nama);
    CREATE INDEX IF NOT EXISTS idx_clients_jenis ON clients(jenis);

    CREATE TABLE IF NOT EXISTS akta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_akta TEXT NOT NULL UNIQUE,
      judul TEXT NOT NULL,
      jenis TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      tanggal_akta TEXT NOT NULL,
      target_selesai TEXT NOT NULL,
      tanggal_selesai TEXT,
      status TEXT NOT NULL CHECK(status IN ('draft', 'proses', 'selesai', 'diserahkan')),
      biaya INTEGER NOT NULL DEFAULT 0,
      catatan TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_akta_client_id ON akta(client_id);
    CREATE INDEX IF NOT EXISTS idx_akta_status ON akta(status);
    CREATE INDEX IF NOT EXISTS idx_akta_tanggal ON akta(tanggal_akta);

    CREATE TABLE IF NOT EXISTS akta_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      akta_id INTEGER NOT NULL,
      dari_status TEXT,
      ke_status TEXT NOT NULL CHECK(ke_status IN ('draft', 'proses', 'selesai', 'diserahkan')),
      diubah_oleh INTEGER,
      diubah_oleh_nama TEXT NOT NULL,
      catatan TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (akta_id) REFERENCES akta(id) ON DELETE CASCADE,
      FOREIGN KEY (diubah_oleh) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_akta_history_akta_id ON akta_status_history(akta_id);

    CREATE TABLE IF NOT EXISTS pembayaran (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      akta_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      nomor_kwitansi TEXT NOT NULL UNIQUE,
      jumlah INTEGER NOT NULL,
      metode TEXT NOT NULL CHECK(metode IN ('transfer', 'tunai', 'qris', 'giro')),
      tanggal_bayar TEXT NOT NULL,
      keterangan TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (akta_id) REFERENCES akta(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pembayaran_akta_id ON pembayaran(akta_id);
    CREATE INDEX IF NOT EXISTS idx_pembayaran_tanggal ON pembayaran(tanggal_bayar);

    CREATE TABLE IF NOT EXISTS dokumen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      akta_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      nama_file TEXT NOT NULL,
      path_file TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      ukuran INTEGER NOT NULL,
      kategori TEXT NOT NULL DEFAULT 'lampiran',
      uploaded_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (akta_id) REFERENCES akta(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dokumen_akta_id ON dokumen(akta_id);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      aksi TEXT NOT NULL,
      entitas TEXT NOT NULL,
      entitas_id INTEGER,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Idempotent backfill for existing databases from initial setup
  const historyCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM akta_status_history').get() as { cnt: number }
  ).cnt;
  const aktaCount = (db.prepare('SELECT COUNT(*) as cnt FROM akta').get() as { cnt: number }).cnt;

  if (historyCount === 0 && aktaCount > 0) {
    const normalizeJenis: Record<string, string> = {
      'Jual Beli Tanah (AJB)': 'Jual Beli',
      'Perjanjian Kredit': 'Perjanjian',
      'Kuasa Menjual': 'Kuasa',
      'Perubahan Anggaran Dasar': 'Lainnya',
      'Sewa Menyewa': 'Perjanjian',
      Wasiat: 'Waris',
    };

    const existingAkta = db
      .prepare(`
        SELECT a.id, a.jenis, a.status, a.created_by, a.created_at, u.nama as user_nama
        FROM akta a
        LEFT JOIN users u ON u.id = a.created_by
      `)
      .all() as Array<{
      id: number;
      jenis: string;
      status: string;
      created_by: number | null;
      created_at: string;
      user_nama: string | null;
    }>;

    const updateJenis = db.prepare('UPDATE akta SET jenis = ? WHERE id = ?');
    const insertHistory = db.prepare(`
      INSERT INTO akta_status_history (akta_id, dari_status, ke_status, diubah_oleh, diubah_oleh_nama, catatan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const backfill = db.transaction(() => {
      for (const row of existingAkta) {
        if (normalizeJenis[row.jenis]) {
          updateJenis.run(normalizeJenis[row.jenis], row.id);
        }
        const actorName = row.user_nama || 'Dr. Hendra Wijaya, S.H., M.Kn.';
        insertHistory.run(row.id, null, 'draft', row.created_by, actorName, 'Akta dibuat', row.created_at);
        if (row.status !== 'draft') {
          insertHistory.run(
            row.id,
            'draft',
            row.status,
            row.created_by,
            actorName,
            `Status diperbarui menjadi ${row.status}`,
            row.created_at
          );
        }
      }

      // Normalize legacy payment format KW-YYYY-NNNN -> KW/YYYY/NNNN & giro -> transfer
      const legacyPayments = db
        .prepare("SELECT id, nomor_kwitansi, metode, tanggal_bayar FROM pembayaran WHERE nomor_kwitansi LIKE 'KW-%'")
        .all() as Array<{ id: number; nomor_kwitansi: string; metode: string; tanggal_bayar: string }>;

      const updatePay = db.prepare('UPDATE pembayaran SET nomor_kwitansi = ?, metode = ? WHERE id = ?');
      let seq2025 = 1;
      let seq2026 = 1;
      for (const p of legacyPayments) {
        const year = p.tanggal_bayar.slice(0, 4);
        const seq = year === '2025' ? seq2025++ : seq2026++;
        const newNo = `KW/${year}/${String(seq).padStart(4, '0')}`;
        const newMetode = p.metode === 'giro' ? 'transfer' : p.metode;
        updatePay.run(newNo, newMetode, p.id);
      }
    });

    backfill();
  }

  // Ensure nama_notaris & logo_kantor keys exist when settings table is already populated
  const settingsCount = (db.prepare('SELECT COUNT(*) as cnt FROM settings').get() as { cnt: number }).cnt;
  if (settingsCount > 0) {
    db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('nama_notaris', 'Dr. Hendra Wijaya, S.H., M.Kn.')`).run();
    db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('logo_kantor', '')`).run();
  }
}
