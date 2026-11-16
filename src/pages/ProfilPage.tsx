import { useEffect, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout.tsx';
import { Button, Card, FormField, INPUT_CLASS } from '../components/ui/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import { formatRoleLabel } from '../lib/format.ts';
import type { User } from '../types/index.ts';

export function ProfilPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [nama, setNama] = useState(user?.nama || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setNama(user.nama);
      setEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (nama.trim().length < 2) nextErrors.nama = 'Nama lengkap minimal 2 karakter.';
    if (!email.trim().includes('@')) nextErrors.email = 'Format email tidak valid.';
    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors);
      return;
    }

    setSavingProfile(true);
    setProfileErrors({});
    try {
      const res = await apiRequest<{ user: User }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ nama: nama.trim(), email: email.trim() }),
      });
      updateUser(res.user);
      toast.success('Profil akun berhasil diperbarui.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.details) setProfileErrors(err.details);
        toast.error(err.message);
      } else {
        toast.error('Gagal memperbarui profil.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!currentPassword) nextErrors.currentPassword = 'Kata sandi saat ini wajib diisi.';
    if (newPassword.length < 6) nextErrors.newPassword = 'Kata sandi baru minimal 6 karakter.';
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Konfirmasi kata sandi tidak cocok.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors);
      return;
    }

    setSavingPassword(true);
    setPasswordErrors({});
    try {
      await apiRequest('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Kata sandi berhasil diperbarui.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.details) setPasswordErrors(err.details);
        toast.error(err.message);
      } else {
        toast.error('Gagal memperbarui kata sandi.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Layout title="Profil Saya" breadcrumb="Pengaturan Akun Pengguna">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6">
          <div className="pb-4 border-b border-slate-200 mb-5">
            <h2 className="text-base font-semibold text-slate-900">Informasi Akun</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbarui nama tampilan dan alamat email akun Anda ({user ? formatRoleLabel(user.role) : ''}).
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <FormField label="Nama Lengkap" htmlFor="prof-nama" required error={profileErrors.nama}>
              <input
                id="prof-nama"
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField label="Email" htmlFor="prof-email" required error={profileErrors.email}>
              <input
                id="prof-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField label="Peran Akun" htmlFor="prof-role">
              <input
                id="prof-role"
                type="text"
                disabled
                value={user ? formatRoleLabel(user.role) : ''}
                className={INPUT_CLASS}
              />
            </FormField>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button type="submit" variant="primary" disabled={savingProfile}>
                {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-6">
          <div className="pb-4 border-b border-slate-200 mb-5">
            <h2 className="text-base font-semibold text-slate-900">Ubah Kata Sandi</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan kombinasi kata sandi yang kuat minimal 6 karakter.
            </p>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4">
            <FormField
              label="Kata Sandi Saat Ini"
              htmlFor="prof-cur-pass"
              required
              error={passwordErrors.currentPassword}
            >
              <input
                id="prof-cur-pass"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField
              label="Kata Sandi Baru"
              htmlFor="prof-new-pass"
              required
              error={passwordErrors.newPassword}
            >
              <input
                id="prof-new-pass"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField
              label="Konfirmasi Kata Sandi Baru"
              htmlFor="prof-conf-pass"
              required
              error={passwordErrors.confirmPassword}
            >
              <input
                id="prof-conf-pass"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={INPUT_CLASS}
              />
            </FormField>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button type="submit" variant="secondary" disabled={savingPassword}>
                {savingPassword ? 'Memproses...' : 'Perbarui Kata Sandi'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
