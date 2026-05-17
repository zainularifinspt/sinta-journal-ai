"use client";

import { useEffect, useState } from "react";
import DashboardPageShell from "../components/DashboardPageShell";
import { supabase } from "@/lib/supabase";

const SEARCH_COUNT_KEY = "journalSearchCount";

export default function ProfilPage() {
  const [profile, setProfile] = useState(null);
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
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Edit Profil
            </button>
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
