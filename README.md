# NOTARYDUTTY

Sistem administrasi kantor notaris full-stack berbasis web untuk pengelolaan data klien, registrasi dan pelacakan status akta, pengarsipan dokumen digital, pencatatan pembayaran & cetak kuitansi resmi, pelaporan keuangan, serta audit log aktivitas.

## Cara Menjalankan

### Prasyarat
- Node.js 18+ dan npm

### Langkah Instalasi & Jalankan (Development)
1. Pasang seluruh dependensi:
   ```bash
   npm install
   ```
2. Salin konfigurasi environment (opsional, bawaan development sudah siap jalan):
   ```bash
   cp .env.example .env
   ```
3. Jalankan server backend & frontend (port `3000`):
   ```bash
   npm run dev
   ```
4. Buka aplikasi di browser pada `http://localhost:3000`.

### Build Produksi
```bash
npm run build
NODE_ENV=production npm start
```

> Saat aplikasi dijalankan pertama kali, database SQLite (`data/notarydutty.db`) dibuat otomatis beserta migrasi tabel dan data awal (*seed*) berupa 2 akun demo, 8 data klien, 15 akta dengan beragam status, riwayat pembayaran, serta profil kantor notaris contoh.

## Akun Demo

Tidak tersedia registrasi publik; masuk menggunakan salah satu akun berikut di halaman `/login`:

| Peran | Email | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Admin (Notaris)** | `admin@notarydutty.test` | `password` | Akses penuh (termasuk hapus akta, laporan, pengguna, log aktivitas, & pengaturan kantor) |
| **Staf** | `staf@notarydutty.test` | `password` | Kelola klien, akta, dokumen, dan pembayaran |

## Struktur Folder

```text
.
├── server.ts                  # Entry point Express + Vite middleware / static serving
├── server/
│   ├── app.ts                 # Konfigurasi Express, routing /api/*, & error handler terpusat
│   ├── db/
│   │   ├── connection.ts      # Koneksi SQLite (better-sqlite3)
│   │   ├── schema.ts          # Migrasi skema tabel otomatis
│   │   └── seed.ts            # Seed otomatis pengguna, klien, akta, pembayaran, & pengaturan
│   ├── middleware/
│   │   └── auth.ts            # Verifikasi JWT & otorisasi berbasis peran (Admin/Staf)
│   ├── routes/                # Endpoint REST API (auth, clients, akta, dokumen, pembayaran, search, admin)
│   ├── schemas/               # Validasi input request menggunakan Zod
│   ├── uploads/               # Penyimpanan file dokumen akta & logo kantor
│   └── utils/                 # Helper audit log, terbilang rupiah, format nomor akta/kuitansi
├── src/
│   ├── App.tsx                # Konfigurasi routing & proteksi rute
│   ├── main.tsx               # Entry point React
│   ├── index.css              # Tailwind CSS v4 & token desain
│   ├── components/
│   │   ├── ui/                # Komponen UI reusable (Button, Card, Badge, Modal, DataTable, dll.)
│   │   ├── Layout.tsx         # Sidebar navy, topbar, & drawer responsif
│   │   ├── GlobalSearchModal.tsx # Pencarian global (Ctrl+K) untuk Klien, Akta, & Kuitansi
│   │   └── ...                # Form modal Klien, Akta, Kuitansi, & Proteksi Rute
│   ├── context/
│   │   ├── AuthContext.tsx    # State autentikasi & sesi pengguna
│   │   └── ToastContext.tsx   # Notifikasi toast global
│   ├── lib/
│   │   ├── api.ts             # HTTP client /api dengan otorisasi Bearer token
│   │   └── format.ts          # Helper format tanggal (dd/MM/yyyy), Rupiah, & badge status
│   ├── pages/                 # Halaman fitur (Homepage, Login, Dashboard, Klien, Akta, Pembayaran, Laporan, Pengguna, Log Aktivitas, Pengaturan, Profil, 404)
│   └── types/                 # Definisi tipe TypeScript aplikasi
├── .env.example               # Contoh variabel lingkungan
├── metadata.json              # Metadata aplikasi
└── package.json               # Dependensi & skrip npm
```
