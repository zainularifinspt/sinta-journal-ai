"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardPageShell from "@/app/components/DashboardPageShell";
import SintaBadge from "@/app/components/SintaBadge";
import { supabase } from "@/lib/supabase";

export default function MahasiswaDashboard() {
  return (
    <DashboardPageShell title="Dashboard Mahasiswa" allowedRoles={["mahasiswa"]}>
      {(profile) => <MahasiswaDashboardContent profile={profile} />}
    </DashboardPageShell>
  );
}

function MahasiswaDashboardContent({ profile }) {
  const [stats, setStats] = useState({ favorites: 0, history: 0 });
  const [latestJournals, setLatestJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchDashboard() {
      const [favoritesCount, historyCount, journalsData] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("recommendation_history").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("journals").select("id, nama, sinta, publisher, bidang, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      if (!isActive) {
        return;
      }

      const firstError = [favoritesCount.error, historyCount.error, journalsData.error].find(Boolean);

      if (firstError) {
        setError(firstError.message);
      } else {
        setStats({
          favorites: favoritesCount.count ?? 0,
          history: historyCount.count ?? 0,
        });
        setLatestJournals(journalsData.data ?? []);
      }

      setLoading(false);
    }

    fetchDashboard();

    return () => {
      isActive = false;
    };
  }, [profile.id]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/20 dark:bg-white/10">
        <h2 className="text-2xl font-bold text-red-700 dark:text-red-200">Gagal memuat dashboard</h2>
        <p className="mt-2 text-red-600 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-bold">Halo, {profile.full_name || "Mahasiswa"}</h2>
        <p className="mt-2 text-slate-600 dark:text-gray-300">
          Temukan jurnal yang relevan dan simpan referensi penting Anda.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <StatCard label="Favorit" value={stats.favorites} />
        <StatCard label="Riwayat" value={stats.history} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
        <h2 className="mb-5 text-2xl font-bold">Quick Action</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <ActionLink href="/jurnal" title="Cari Jurnal" />
          <ActionLink href="/favorit" title="Favorit" />
          <ActionLink href="/riwayat" title="Riwayat" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
        <h2 className="mb-5 text-2xl font-bold">Jurnal Terbaru</h2>
        <div className="grid gap-3">
          {latestJournals.length === 0 ? (
            <EmptyState text="Belum ada jurnal." />
          ) : (
            latestJournals.map((journal) => (
              <div key={journal.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">{journal.nama}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                      {journal.publisher || "-"} • {journal.bidang || "-"}
                    </p>
                  </div>
                  <SintaBadge value={journal.sinta} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">{label}</p>
      <p className="mt-3 text-4xl font-bold">{value}</p>
    </div>
  );
}

function ActionLink({ href, title }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
    >
      {title}
    </Link>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-5 text-slate-600 dark:border-white/10 dark:text-gray-300">
      {text}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
    </div>
  );
}
