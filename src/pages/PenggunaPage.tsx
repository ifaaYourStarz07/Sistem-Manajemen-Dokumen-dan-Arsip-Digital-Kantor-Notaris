import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Layout } from '../components/Layout.tsx';
import { Badge, Button, Card, ConfirmDialog } from '../components/ui/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, ApiClientError } from '../lib/api.ts';
import { formatRoleLabel, formatTanggal } from '../lib/format.ts';
import type { User, UserRole } from '../types/index.ts';

interface UserRecord extends User {
  created_at: string;
  updated_at?: string;
}

export function PenggunaPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Create / Edit Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staf');
  const [aktif, setAktif] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset Password Modal
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ data: UserRecord[] }>('/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Gagal memuat daftar pengguna.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setNama('');
    setEmail('');
    setPassword('');
    setRole('staf');
    setAktif(true);
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (u: UserRecord) => {
    setEditingUser(u);
    setNama(u.nama);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setAktif(Boolean(u.aktif));
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFeedback('');

    try {
      if (editingUser) {
        await apiRequest(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({ nama: nama.trim(), email: email.trim(), role, aktif }),
        });
        const msg = `Data pengguna "${nama.trim()}" berhasil diperbarui.`;
        setFeedback(msg);
        toast.success(msg);
      } else {
        await apiRequest('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            nama: nama.trim(),
            email: email.trim(),
            password,
            role,
            aktif,
          }),
        });
        const msg = `Pengguna baru "${nama.trim()}" berhasil ditambahkan.`;
        setFeedback(msg);
        toast.success(msg);
      }
      setFormOpen(false);
      loadUsers();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        toast.error(err.message);
      } else {
        setFormError('Gagal menyimpan data pengguna.');
        toast.error('Gagal menyimpan data pengguna.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    setResetError('');
    setFeedback('');

    try {
      await apiRequest(`/api/admin/users/${resetTarget.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
      });
      const msg = `Kata sandi untuk "${resetTarget.nama}" berhasil direset.`;
      setFeedback(msg);
      toast.success(msg);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setResetError(err.message);
        toast.error(err.message);
      } else {
        setResetError('Gagal mereset kata sandi.');
        toast.error('Gagal mereset kata sandi.');
      }
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    setFeedback('');

    try {
      await apiRequest(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const msg = `Pengguna "${deleteTarget.nama}" berhasil dihapus.`;
      setFeedback(msg);
      toast.success(msg);
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setDeleteError(err.message);
        toast.error(err.message);
      } else {
        setDeleteError('Gagal menghapus pengguna.');
        toast.error('Gagal menghapus pengguna.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const isEditingSelf = Boolean(editingUser && currentUser && editingUser.id === currentUser.id);

  return (
    <Layout
      title="Kelola Pengguna"
      breadcrumb="Administrasi Notaris / Akun & Hak Akses"
      actions={
        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </Button>
      }
    >
      {feedback && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {feedback}
        </div>
      )}

      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">Nama & Email</th>
                <th className="py-3 px-3">Peran</th>
                <th className="py-3 px-3">Status Akun</th>
                <th className="py-3 px-3">Terdaftar</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="py-4 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : (
                users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-100/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{u.nama}</span>
                          {isSelf && (
                            <span className="text-xs font-medium text-orange-600">
                              (Akun Anda)
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-medium text-slate-800 whitespace-nowrap">
                        {formatRoleLabel(u.role)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <Badge variant={u.aktif ? 'lunas' : 'belum_lunas'}>
                          {u.aktif ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {formatTanggal(u.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            title="Edit pengguna"
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetError('');
                              setNewPassword('');
                              setResetTarget(u);
                            }}
                            title="Reset kata sandi"
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-md cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => {
                              setDeleteError('');
                              setDeleteTarget(u);
                            }}
                            title={
                              isSelf
                                ? 'Anda tidak dapat menghapus akun Anda sendiri'
                                : 'Hapus pengguna'
                            }
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit User Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="usr-nama" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nama Lengkap <span className="text-red-600">*</span>
                </label>
                <input
                  id="usr-nama"
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
                />
              </div>

              <div>
                <label htmlFor="usr-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  id="usr-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
                />
              </div>

              {!editingUser && (
                <div>
                  <label htmlFor="usr-pass" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Kata Sandi Awal <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="usr-pass"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
                  />
                </div>
              )}

              <div>
                <label htmlFor="usr-role" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Peran
                </label>
                <select
                  id="usr-role"
                  value={role}
                  disabled={isEditingSelf}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="staf">Staf</option>
                  <option value="admin">Admin (Notaris)</option>
                </select>
                {isEditingSelf && (
                  <p className="mt-1 text-xs text-slate-500">
                    Admin tidak dapat menurunkan peran akunnya sendiri.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="usr-aktif"
                  type="checkbox"
                  checked={aktif}
                  disabled={isEditingSelf}
                  onChange={(e) => setAktif(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <label htmlFor="usr-aktif" className="text-sm text-slate-700">
                  Akun Aktif (dapat masuk ke sistem)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Reset Kata Sandi</h2>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Masukkan kata sandi baru untuk{' '}
                <span className="font-semibold text-slate-900">{resetTarget.nama}</span>.
              </p>

              {resetError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {resetError}
                </div>
              )}

              <div>
                <label htmlFor="reset-pass" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kata Sandi Baru <span className="text-red-600">*</span>
                </label>
                <input
                  id="reset-pass"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  {resetting ? 'Memproses...' : 'Simpan Kata Sandi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Pengguna"
        message={
          <>
            Apakah Anda yakin ingin menghapus akun{' '}
            <span className="font-semibold text-slate-900">{deleteTarget?.nama}</span>?
          </>
        }
        confirmLabel="Hapus Pengguna"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
