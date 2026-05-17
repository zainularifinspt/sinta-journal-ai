"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
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

const sintaLevels = ["SINTA 1", "SINTA 2", "SINTA 3", "SINTA 4", "SINTA 5", "SINTA 6"];

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

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUser: 0,
    totalDosen: 0,
    totalMahasiswa: 0,
    totalJurnal: 0,
    totalFavorit: 0,
    totalRiwayat: 0,
  });
  const [journals, setJournals] = useState([]);
  const [latestUsers, setLatestUsers] = useState([]);
  const [latestJournals, setLatestJournals] = useState([]);
  const [latestRecommendations, setLatestRecommendations] = useState([]);
  const [recommendationActivity, setRecommendationActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchDashboard() {
      setLoading(true);
      setError("");

      const [
        totalUsers,
        totalDosen,
        totalMahasiswa,
        totalJournals,
        totalFavorites,
        totalHistory,
        journalsData,
        usersData,
        latestJournalsData,
        latestHistoryData,
        historyActivityData,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "dosen"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "mahasiswa"),
        supabase.from("journals").select("id", { count: "exact", head: true }),
        supabase.from("favorites").select("id", { count: "exact", head: true }),
        supabase.from("recommendation_history").select("id", { count: "exact", head: true }),
        supabase.from("journals").select("id, nama, sinta, publisher, created_at").limit(5000),
        supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("journals").select("id, nama, sinta, publisher, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("recommendation_history").select("id, judul, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("recommendation_history").select("id, created_at").order("created_at", { ascending: false }).limit(60),
      ]);

      if (!isActive) {
        return;
      }

      const firstError = [
        totalUsers.error,
        totalDosen.error,
        totalMahasiswa.error,
        totalJournals.error,
        totalFavorites.error,
        totalHistory.error,
        journalsData.error,
        usersData.error,
        latestJournalsData.error,
        latestHistoryData.error,
        historyActivityData.error,
      ].find(Boolean);

      if (firstError) {
        setError(firstError.message);
      } else {
        setStats({
          totalUser: totalUsers.count ?? 0,
          totalDosen: totalDosen.count ?? 0,
          totalMahasiswa: totalMahasiswa.count ?? 0,
          totalJurnal: totalJournals.count ?? 0,
          totalFavorit: totalFavorites.count ?? 0,
          totalRiwayat: totalHistory.count ?? 0,
        });
        setJournals(journalsData.data ?? []);
        setLatestUsers(usersData.data ?? []);
        setLatestJournals(latestJournalsData.data ?? []);
        setLatestRecommendations(latestHistoryData.data ?? []);
        setRecommendationActivity(countByDate(historyActivityData.data ?? []));
      }

      setLoading(false);
    }

    fetchDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const sintaChartData = useMemo(() => {
    return sintaLevels.map((level) => ({
      name: level.replace("SINTA ", "S"),
      total: journals.filter((journal) => journal.sinta === level).length,
    }));
  }, [journals]);

  const topPublishers = useMemo(() => {
    const counts = new Map();

    journals.forEach((journal) => {
      const publisher = journal.publisher || "Tanpa publisher";
      counts.set(publisher, (counts.get(publisher) ?? 0) + 1);
    });

    return Array.from(counts, ([publisher, total]) => ({ publisher, total }))
      .sort((first, second) => second.total - first.total)
      .slice(0, 5);
  }, [journals]);

  return (
    <DashboardPageShell title="Dashboard Admin" allowedRoles={["admin"]}>
      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/20 dark:bg-white/10">
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-200">
            Gagal memuat dashboard
          </h2>
          <p className="mt-2 text-red-600 dark:text-red-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Total User" value={stats.totalUser} tone="blue" />
            <StatCard label="Total Dosen" value={stats.totalDosen} tone="emerald" />
            <StatCard label="Total Mahasiswa" value={stats.totalMahasiswa} tone="amber" />
            <StatCard label="Total Jurnal" value={stats.totalJurnal} tone="cyan" />
            <StatCard label="Total Favorit" value={stats.totalFavorit} tone="rose" />
            <StatCard label="Total Riwayat" value={stats.totalRiwayat} tone="violet" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Distribusi Jurnal per SINTA">
              {sintaChartData.every((item) => item.total === 0) ? (
                <EmptyState text="Belum ada data jurnal untuk chart." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sintaChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Aktivitas Rekomendasi">
              {recommendationActivity.length === 0 ? (
                <EmptyState text="Belum ada aktivitas rekomendasi." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={recommendationActivity}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="tanggal" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <ListCard title="Publisher Terbanyak">
              {topPublishers.length === 0 ? (
                <EmptyState text="Belum ada publisher." />
              ) : (
                topPublishers.map((item) => (
                  <ListRow key={item.publisher} title={item.publisher} meta={`${item.total} jurnal`} />
                ))
              )}
            </ListCard>

            <ListCard title="User Baru">
              {latestUsers.length === 0 ? (
                <EmptyState text="Belum ada user." />
              ) : (
                latestUsers.map((user) => (
                  <ListRow
                    key={user.id}
                    title={user.full_name || user.email}
                    meta={`${user.role} • ${formatDate(user.created_at)}`}
                  />
                ))
              )}
            </ListCard>

            <ListCard title="Jurnal Baru">
              {latestJournals.length === 0 ? (
                <EmptyState text="Belum ada jurnal." />
              ) : (
                latestJournals.map((journal) => (
                  <div key={journal.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{journal.nama}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                          {journal.publisher || "-"}
                        </p>
                      </div>
                      <SintaBadge value={journal.sinta} />
                    </div>
                  </div>
                ))
              )}
            </ListCard>
          </div>

          <ListCard title="Rekomendasi Terbaru">
            {latestRecommendations.length === 0 ? (
              <EmptyState text="Belum ada rekomendasi." />
            ) : (
              latestRecommendations.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.judul || "Tanpa judul"}
                  meta={formatDate(item.created_at)}
                />
              ))
            )}
          </ListCard>
        </div>
      )}
    </DashboardPageShell>
  );
}

function StatCard({ label, value, tone }) {
  const tones = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    cyan: "bg-cyan-600",
    rose: "bg-rose-600",
    violet: "bg-violet-600",
  };

  return (
    <div className={`${tones[tone]} rounded-2xl p-6 text-white shadow-sm`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-white/80">{label}</p>
      <p className="mt-3 text-4xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
      <h2 className="mb-5 text-2xl font-bold">{title}</h2>
      {children}
    </section>
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

function ListRow({ title, meta }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">{meta}</p>
    </div>
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
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}
