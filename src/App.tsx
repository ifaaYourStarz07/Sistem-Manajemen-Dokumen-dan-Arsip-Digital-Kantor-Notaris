import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ClientsPage } from './pages/ClientsPage.tsx';
import { ClientDetailPage } from './pages/ClientDetailPage.tsx';
import { AktaPage } from './pages/AktaPage.tsx';
import { AktaDetailPage } from './pages/AktaDetailPage.tsx';
import { PembayaranPage } from './pages/PembayaranPage.tsx';
import { LaporanPage } from './pages/LaporanPage.tsx';
import { LogAktivitasPage } from './pages/LogAktivitasPage.tsx';
import { PenggunaPage } from './pages/PenggunaPage.tsx';
import { PengaturanPage } from './pages/PengaturanPage.tsx';
import { ProfilPage } from './pages/ProfilPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/klien"
              element={
                <ProtectedRoute>
                  <ClientsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/klien/:id"
              element={
                <ProtectedRoute>
                  <ClientDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/akta"
              element={
                <ProtectedRoute>
                  <AktaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/akta/:id"
              element={
                <ProtectedRoute>
                  <AktaDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pembayaran"
              element={
                <ProtectedRoute>
                  <PembayaranPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profil"
              element={
                <ProtectedRoute>
                  <ProfilPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/laporan"
              element={
                <AdminRoute>
                  <LaporanPage />
                </AdminRoute>
              }
            />
            <Route
              path="/log-aktivitas"
              element={
                <AdminRoute>
                  <LogAktivitasPage />
                </AdminRoute>
              }
            />
            <Route
              path="/pengguna"
              element={
                <AdminRoute>
                  <PenggunaPage />
                </AdminRoute>
              }
            />
            <Route
              path="/pengaturan"
              element={
                <AdminRoute>
                  <PengaturanPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
