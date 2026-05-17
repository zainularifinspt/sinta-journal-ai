"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardPageShell from "@/app/components/DashboardPageShell";
import SintaBadge from "@/app/components/SintaBadge";
import { supabase } from "@/lib/supabase";

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function countByDate(items) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  });
  const counts = new Map();

  items.forEach((item) => {
    const label = formatter.format(new Date(item.created_at));
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts, ([tanggal, total]) => ({ tanggal, total })).reverse();
}

export default function DosenDashboard() {
  return (
    <DashboardPageShell title="Dashboard Dosen" allowedRoles={["dosen"]}>
      {(profile) => <DosenDashboardContent profile={profile} />}
    </DashboardPageShell>
  );
}

function DosenDashboardContent({ profile }) {
  const [stats, setStats] = useState({ favorites: 0, history: 0 });
  const [latestJournals, setLatestJournals] = useState([]);
  const [historyActivity, setHistoryActivity] = useState([]);
  const [latestHistory, setLatestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchDashboard() {
      const [
        favoritesCount,
        historyCount,
        journalsData,
        activityData,
        latestHistoryData,
      ] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("recommendation_history").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("journals").select("id, nama, sinta, publisher, bidang, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("recommendation_history").select("id, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("recommendation_history").select("id, judul, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5),
      ]);

      if (!isActive) {
        return;
      }

      const firstError = [
        favoritesCount.error,
        historyCount.error,
        journalsData.error,
        activityData.error,
        latestHistoryData.error,
      ].find(Boolean);

      if (firstError) {
        setError(firstError.message);
      } else {
        setStats({
          favorites: favoritesCount.count ?? 0,
          history: historyCount.count ?? 0,
        });
        setLatestJournals(journalsData.data ?? []);
        setHistoryActivity(countByDate(activityData.data ?? []));
        setLatestHistory(latestHistoryData.data ?? []);
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
        <h2 className="text-2xl font-bold">Halo, {profile.full_name || "Dosen"}</h2>
        <p className="mt-2 text-slate-600 dark:text-gray-300">
          Ringkasan aktivitas jurnal dan rekomendasi Anda.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <StatCard label="Favorit Saya" value={stats.favorites} />
        <StatCard label="Riwayat Rekomendasi" value={stats.history} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
          <h2 className="mb-5 text-2xl font-bold">Aktivitas Rekomendasi</h2>
          {historyActivity.length === 0 ? (
            <EmptyState text="Belum ada aktivitas rekomendasi." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={historyActivity}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="tanggal" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
          <h2 className="mb-5 text-2xl font-bold">Quick Action</h2>
          <div className="grid gap-3">
            <ActionLink href="/jurnal" title="Cari Jurnal" />
            <ActionLink href="/rekomendasi" title="Rekomendasi AI" />
            <ActionLink href="/favorit" title="Favorit" />
            <ActionLink href="/riwayat" title="Riwayat" />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ListCard title="Jurnal Terbaru">
          {latestJournals.length === 0 ? (
            <EmptyState text="Belum ada jurnal." />
          ) : (
            latestJournals.map((journal) => (
              <div key={journal.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
                <div className="flex items-start justify-between gap-3">
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
        </ListCard>

        <ListCard title="Riwayat Terbaru">
          {latestHistory.length === 0 ? (
            <EmptyState text="Belum ada riwayat rekomendasi." />
          ) : (
            latestHistory.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
                <p className="font-semibold">{item.judul || "Tanpa judul"}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                  {formatDate(item.created_at)}
                </p>
              </div>
            ))
          )}
        </ListCard>
      </div>
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

function ListCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
      <h2 className="mb-5 text-2xl font-bold">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
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
      <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
    </div>
  );
}
