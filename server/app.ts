import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.ts';
import dashboardRoutes from './routes/dashboard.routes.ts';
import clientsRoutes from './routes/clients.routes.ts';
import aktaRoutes from './routes/akta.routes.ts';
import dokumenRoutes from './routes/dokumen.routes.ts';
import pembayaranRoutes from './routes/pembayaran.routes.ts';
import settingsRoutes from './routes/settings.routes.ts';
import adminRoutes from './routes/admin.routes.ts';
import searchRoutes from './routes/search.routes.ts';
import { AppError, errorHandler } from './middleware/errorHandler.ts';

export function createApiApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'NOTARYDUTTY' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/akta', aktaRoutes);
  app.use('/api/dokumen', dokumenRoutes);
  app.use('/api/pembayaran', pembayaranRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/search', searchRoutes);

  app.use('/api', (_req, _res, next) => {
    next(new AppError('Endpoint API tidak ditemukan.', 404));
  });

  app.use(errorHandler);

  return app;
}
