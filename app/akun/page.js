"use client";

import { useState } from "react";
import { toast } from "sonner";
import DashboardPageShell from "../components/DashboardPageShell";
import { supabase } from "@/lib/supabase";

export default function AkunPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      setSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Password dan konfirmasi password harus sama.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      toast.error("Gagal memperbarui password", { description: updateError.message });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password berhasil diperbarui.");
      toast.success("Password berhasil diperbarui.");
    }

    setSaving(false);
  }

  return (
    <DashboardPageShell title="Akun" allowedRoles={["admin", "dosen", "mahasiswa"]}>
      <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
        <div>
          <h2 className="text-2xl font-bold">
            Ganti Password
          </h2>
          <p className="mt-2 text-slate-600 dark:text-gray-300">
            Perbarui password akun Anda secara mandiri.
          </p>
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

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="font-semibold">Password Baru</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-semibold">Konfirmasi Password Baru</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-fit rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {saving ? "Menyimpan..." : "Perbarui Password"}
          </button>
        </form>
      </section>
    </DashboardPageShell>
  );
}
