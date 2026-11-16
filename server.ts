import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { runMigrations } from './server/db/migrate.ts';
import { runSeed } from './server/db/seed.ts';
import { createApiApp } from './server/app.ts';

async function startServer(): Promise<void> {
  runMigrations();
  runSeed();

  const app = createApiApp();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build tidak ditemukan. Jalankan npm run build.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`NOTARYDUTTY server berjalan di http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal memulai server NOTARYDUTTY:', err);
  process.exit(1);
});
