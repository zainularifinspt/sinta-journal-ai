"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import DashboardPageShell from "@/app/components/DashboardPageShell";
import { supabase } from "@/lib/supabase";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  role: "dosen",
};

const roles = ["admin", "dosen", "mahasiswa"];

const roleStyles = {
  admin: "border-rose-200 bg-rose-50 text-rose-700 dark:border-fuchsia-400/30 dark:bg-fuchsia-500/15 dark:text-fuchsia-100",
  dosen: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-100",
  mahasiswa: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100",
};

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setUsers([]);
    } else {
      setUsers(data ?? []);
    }

    setLoading(false);
    return {
      data: data ?? [],
      error: fetchError,
    };
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function openResetPasswordModal(user) {
    setSelectedUser(user);
    setResetPasswordForm({
      newPassword: "",
      confirmPassword: "",
    });
    setError("");
    setSuccess("");
    setResetModalOpen(true);
  }

  function handleResetPasswordChange(event) {
    const { name, value } = event.target;

    setResetPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function getAccessToken() {
    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !data.session?.access_token) {
      throw new Error(sessionError?.message ?? "Sesi login tidak ditemukan.");
    }

    return data.session.access_token;
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };

      if (!payload.full_name || !payload.email || !payload.password) {
        throw new Error("Nama lengkap, email, dan password sementara wajib diisi.");
      }

      if (payload.password.length < 8) {
        throw new Error("Password sementara minimal 8 karakter.");
      }

      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Gagal menambahkan user.");
      }

      setSuccess("User berhasil ditambahkan.");
      setForm(emptyForm);
      setModalOpen(false);
      toast.success("User berhasil ditambahkan");
      const refreshedUsers = await fetchUsers();

      if (refreshedUsers.error) {
        throw new Error(refreshedUsers.error.message);
      }
    } catch (createError) {
      setError(createError.message ?? "Gagal menambahkan user.");
      toast.error("Gagal menambahkan user", { description: createError.message });
    }

    setSaving(false);
  }

  async function handleRoleChange(user, nextRole) {
    if (user.role === nextRole) {
      return;
    }

    if (nextRole === "admin") {
      const confirmed = window.confirm(`Jadikan "${user.full_name || user.email}" sebagai admin?`);

      if (!confirmed) {
        return;
      }
    }

    setRoleUpdatingId(user.id);
    setError("");
    setSuccess("");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/update-role", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          role: nextRole,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Gagal mengubah role user.");
      }

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                role: nextRole,
              }
            : item
        )
      );
      setSuccess("Role user berhasil diperbarui.");
      toast.success("Role user berhasil diperbarui");
    } catch (roleError) {
      setError(roleError.message ?? "Gagal mengubah role user.");
      toast.error("Gagal mengubah role", { description: roleError.message });
    }

    setRoleUpdatingId(null);
  }

  async function handleDeleteUser(user, currentAdminId) {
    if (user.id === currentAdminId) {
      const message = "Admin tidak boleh menghapus akunnya sendiri.";
      setError(message);
      toast.error(message);
      return;
    }

    const confirmed = window.confirm(`Hapus user "${user.full_name || user.email}"? Aksi ini akan menghapus akun Auth dan profile.`);

    if (!confirmed) {
      return;
    }

    setDeletingId(user.id);
    setError("");
    setSuccess("");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Gagal menghapus user.");
      }

      setSuccess("User berhasil dihapus.");
      toast.success("User berhasil dihapus");
      const refreshedUsers = await fetchUsers();

      if (refreshedUsers.error) {
        throw new Error(refreshedUsers.error.message);
      }
    } catch (deleteError) {
      setError(deleteError.message ?? "Gagal menghapus user.");
      toast.error("Gagal menghapus user", { description: deleteError.message });
    }

    setDeletingId(null);
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setResetting(true);
    setError("");
    setSuccess("");

    try {
      if (!selectedUser?.id) {
        throw new Error("User belum dipilih.");
      }

      if (resetPasswordForm.newPassword.length < 8) {
        throw new Error("Password baru minimal 8 karakter.");
      }

      if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
        throw new Error("Password dan konfirmasi password harus sama.");
      }

      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/reset-password", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword: resetPasswordForm.newPassword,
          confirmPassword: resetPasswordForm.confirmPassword,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Gagal reset password user.");
      }

      setSuccess("Password user berhasil direset.");
      setResetModalOpen(false);
      setSelectedUser(null);
      setResetPasswordForm({
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password user berhasil direset");
    } catch (resetError) {
      setError(resetError.message ?? "Gagal reset password user.");
      toast.error("Gagal reset password", { description: resetError.message });
    }

    setResetting(false);
  }

  return (
    <DashboardPageShell title="Kelola User" allowedRoles={["admin"]}>
      {(currentAdmin) => (
      <>
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Manajemen User
              </h2>
              <p className="mt-2 text-slate-600 dark:text-gray-300">
                Kelola akun dosen, mahasiswa, dan admin dari data profiles.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setError("");
                setSuccess("");
                setModalOpen(true);
              }}
              className="w-fit rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Tambah User
            </button>
          </div>

          {success && (
            <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              {success}
            </p>
          )}

          {error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Daftar User
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                Total {users.length} user.
              </p>
            </div>
          </div>

          {loading && (
            <p className="rounded-xl bg-slate-100 p-4 font-semibold text-slate-700 dark:bg-slate-950/40 dark:text-gray-200">
              Memuat data user...
            </p>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500 dark:border-white/10 dark:text-gray-400">
                  <tr>
                    <th className="py-3 pr-4">Nama</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Dibuat</th>
                    <th className="py-3 pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="py-4 pr-4 font-semibold">{user.full_name || "-"}</td>
                      <td className="py-4 pr-4 text-slate-600 dark:text-gray-300">{user.email}</td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(event) => handleRoleChange(user, event.target.value)}
                            disabled={roleUpdatingId === user.id}
                            className={`min-w-32 appearance-none rounded-full border px-4 py-2 pr-8 text-sm font-bold capitalize outline-none transition focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${roleStyles[user.role] ?? roleStyles.mahasiswa}`}
                          >
                            {roles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                          {roleUpdatingId === user.id && (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-white/20 dark:border-t-blue-300" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-slate-600 dark:text-gray-300">{formatDate(user.created_at)}</td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openResetPasswordModal(user)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user, currentAdmin.id)}
                            disabled={user.id === currentAdmin.id || deletingId === user.id}
                            title={user.id === currentAdmin.id ? "Admin tidak boleh menghapus akun sendiri" : undefined}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                          >
                            {deletingId === user.id ? "Menghapus..." : "Hapus User"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <p className="rounded-b-xl bg-slate-50 p-5 text-center font-semibold text-slate-600 dark:bg-slate-950/40 dark:text-gray-300">
                  Belum ada user.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Tambah User
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                  User akan dibuat di Supabase Auth dan disimpan ke tabel profiles.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="font-semibold">Nama Lengkap</span>
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={handleFormChange}
                  className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                />
              </label>

              <label className="grid gap-2">
                <span className="font-semibold">Email</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                />
              </label>

              <label className="grid gap-2">
                <span className="font-semibold">Password Sementara</span>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange}
                  className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                />
              </label>

              <label className="grid gap-2">
                <span className="font-semibold">Role</span>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                >
                  <option value="dosen">dosen</option>
                  <option value="mahasiswa">mahasiswa</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-fit rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {saving ? "Menyimpan..." : "Simpan User"}
              </button>
            </form>
          </div>
        </div>
      )}

      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Reset Password
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                  Atur password sementara baru untuk {selectedUser?.full_name || selectedUser?.email || "user"}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                disabled={resetting}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="font-semibold">Password Baru</span>
                <input
                  name="newPassword"
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={handleResetPasswordChange}
                  className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                />
              </label>

              <label className="grid gap-2">
                <span className="font-semibold">Konfirmasi Password</span>
                <input
                  name="confirmPassword"
                  type="password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={handleResetPasswordChange}
                  className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                />
              </label>

              <button
                type="submit"
                disabled={resetting}
                className="mt-2 w-fit rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {resetting ? "Menyimpan..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </DashboardPageShell>
  );
}
