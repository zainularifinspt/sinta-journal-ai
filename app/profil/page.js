"use client";

import { useEffect, useState } from "react";
import DashboardPageShell from "../components/DashboardPageShell";
import { supabase } from "@/lib/supabase";

const SEARCH_COUNT_KEY = "journalSearchCount";

export default function ProfilPage() {
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    favorites: 0,
    history: 0,
    searches: 0,
  });

  useEffect(() => {
    let isActive = true;

    async function fetchProfileStats() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return;
      }

      setUserId(userId);

      const [profileResult, favoritesResult, historyResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("email, full_name, role")
          .eq("id", userId)
          .single(),
        supabase
          .from("favorites")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("recommendation_history")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      if (!isActive) {
        return;
      }

      setProfile(profileResult.data ?? null);
      setFullName(profileResult.data?.full_name ?? "");
      setStats({
        favorites: favoritesResult.count ?? 0,
        history: historyResult.count ?? 0,
        searches: Number(window.localStorage.getItem(SEARCH_COUNT_KEY) ?? 0),
      });
    }

    fetchProfileStats();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!userId) {
      setError("Session pengguna tidak ditemukan.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setProfile((currentProfile) => ({
        ...currentProfile,
        full_name: fullName.trim(),
      }));
      setMessage("Profil berhasil diperbarui.");
      setEditOpen(false);
    }

    setSaving(false);
  }

  return (
    <DashboardPageShell title="Profil" allowedRoles={["admin", "dosen", "mahasiswa"]}>
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Profil Pengguna
        </p>
        <h1 className="text-4xl font-bold">
          Akun SINTA Journal AI
        </h1>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-bold text-white">
              ZA
            </div>

            <div className="mt-6 space-y-4">
              <InfoItem label="Nama" value={profile?.full_name ?? "Pengguna SINTA Journal AI"} />
              <InfoItem label="Email" value={profile?.email ?? "-"} />
              <InfoItem label="Role" value={profile?.role ?? "-"} />
            </div>

            <button
              type="button"
              onClick={() => {
                setEditOpen((current) => !current);
                setMessage("");
                setError("");
              }}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              {editOpen ? "Tutup Edit" : "Edit Profil"}
            </button>

            {message && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                {message}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            )}

            {editOpen && (
              <form onSubmit={handleSaveProfile} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/40">
                <label className="grid gap-2">
                  <span className="font-semibold">Nama Lengkap</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="font-semibold">Email</span>
                  <input
                    value={profile?.email ?? ""}
                    readOnly
                    className="cursor-not-allowed rounded-xl bg-slate-100 p-3 text-slate-600 outline-none ring-1 ring-slate-200 dark:bg-white/10 dark:text-gray-300 dark:ring-white/10"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="font-semibold">Role</span>
                  <input
                    value={profile?.role ?? ""}
                    readOnly
                    className="cursor-not-allowed rounded-xl bg-slate-100 p-3 text-slate-600 outline-none ring-1 ring-slate-200 dark:bg-white/10 dark:text-gray-300 dark:ring-white/10"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-fit rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {saving ? "Menyimpan..." : "Simpan Profil"}
                </button>
              </form>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
            <StatCard label="Jumlah Favorit" value={stats.favorites} />
            <StatCard label="Riwayat Rekomendasi" value={stats.history} />
            <StatCard label="Jumlah Pencarian" value={stats.searches} />
          </div>
        </section>
      </div>
    </DashboardPageShell>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-4xl font-bold">
        {value}
      </p>
    </div>
  );
}
