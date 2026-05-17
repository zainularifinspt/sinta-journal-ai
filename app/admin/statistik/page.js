"use client";

import { useEffect, useState } from "react";
import DashboardPageShell from "@/app/components/DashboardPageShell";
import SintaBadge from "@/app/components/SintaBadge";
import { supabase } from "@/lib/supabase";

const sintaLevels = ["SINTA 1", "SINTA 2", "SINTA 3", "SINTA 4", "SINTA 5", "SINTA 6"];

export default function AdminStatistikPage() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchJournals() {
      const { data, error: fetchError } = await supabase
        .from("journals")
        .select("id, sinta, bidang");

      if (!isActive) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setJournals([]);
      } else {
        setError("");
        setJournals(data ?? []);
      }

      setLoading(false);
    }

    fetchJournals();

    return () => {
      isActive = false;
    };
  }, []);

  const summary = sintaLevels.map((level) => ({
    level,
    total: journals.filter((journal) => journal.sinta === level).length,
  }));
  const totalJournals = journals.length;
  const totalBidang = new Set(journals.map((journal) => journal.bidang).filter(Boolean)).size;

  return (
    <DashboardPageShell title="Statistik" allowedRoles={["admin"]}>
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
          <p className="font-semibold text-slate-700 dark:text-gray-200">
            Memuat statistik jurnal...
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/20 dark:bg-white/10">
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-200">
            Gagal memuat statistik
          </h2>
          <p className="mt-2 text-red-600 dark:text-red-200">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6">
          <div className="grid gap-5 md:grid-cols-3">
            <StatCard label="Total Jurnal" value={totalJournals} />
            <StatCard label="Total Bidang" value={totalBidang} />
            <StatCard label="Peringkat SINTA" value="1-6" />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {summary.map((item) => (
              <div
                key={item.level}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10"
              >
                <SintaBadge value={item.level} />
                <p className="mt-4 text-4xl font-bold">
                  {item.total}
                </p>
                <p className="mt-1 text-slate-600 dark:text-gray-300">
                  jurnal
                </p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
            <h2 className="text-2xl font-bold">
              Ringkasan Peringkat SINTA
            </h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead className="border-b border-slate-200 text-sm text-slate-500 dark:border-white/10 dark:text-gray-400">
                  <tr>
                    <th className="py-3 pr-4">Peringkat</th>
                    <th className="py-3 pr-4">Jumlah Jurnal</th>
                    <th className="py-3 pr-4">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {summary.map((item) => (
                    <tr key={item.level}>
                      <td className="py-4 pr-4">
                        <SintaBadge value={item.level} />
                      </td>
                      <td className="py-4 pr-4 font-semibold">{item.total}</td>
                      <td className="py-4 pr-4 text-slate-600 dark:text-gray-300">
                        {totalJournals === 0 ? "0" : ((item.total / totalJournals) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </DashboardPageShell>
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
