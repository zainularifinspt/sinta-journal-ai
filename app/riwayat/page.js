"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardPageShell from "../components/DashboardPageShell";
import SintaBadge from "../components/SintaBadge";
import { supabase } from "@/lib/supabase";

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function RiwayatPage() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchHistory() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      if (!isActive) {
        return;
      }

      if (sessionError || !currentUserId) {
        router.replace("/login");
        return;
      }

      setUserId(currentUserId);

      const { data, error: fetchError } = await supabase
        .from("recommendation_history")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (!isActive) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setHistory([]);
      } else {
        setError("");
        setHistory(data ?? []);
      }

      setLoading(false);
    }

    fetchHistory();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function removeHistory(historyId) {
    if (!userId) {
      router.push("/login");
      return;
    }

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("recommendation_history")
      .delete()
      .eq("user_id", userId)
      .eq("id", historyId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setHistory((currentHistory) =>
        currentHistory.filter((item) => item.id !== historyId)
      );
    }

    setDeleting(false);
  }

  async function clearHistory() {
    if (!userId) {
      router.push("/login");
      return;
    }

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("recommendation_history")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setHistory([]);
    }

    setDeleting(false);
  }

  return (
    <DashboardPageShell title="Riwayat" allowedRoles={["admin", "dosen", "mahasiswa"]}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Riwayat AI
            </p>
            <h1 className="text-4xl font-bold">
              Riwayat Rekomendasi AI
            </h1>
            <p className="mt-3 text-slate-600 dark:text-gray-300">
              Daftar hasil analisis jurnal yang pernah dibuat.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/rekomendasi"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Buat Rekomendasi
            </Link>

            <button
              type="button"
              onClick={clearHistory}
              disabled={history.length === 0 || deleting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
            >
              {deleting ? "Memproses..." : "Hapus Semua Riwayat"}
            </button>
          </div>
        </div>

        <div className="grid gap-5">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
              <h2 className="text-2xl font-bold">
                Memuat riwayat rekomendasi...
              </h2>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/20 dark:bg-white/10">
              <h2 className="text-2xl font-bold text-red-700 dark:text-red-200">
                Gagal memuat riwayat
              </h2>
              <p className="mt-2 text-red-600 dark:text-red-200">
                {error}
              </p>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
              <h2 className="text-2xl font-bold">
                Belum ada riwayat rekomendasi.
              </h2>
            </div>
          )}

          {!loading && !error && history.map((item) => {
            const results = Array.isArray(item.hasil) ? item.hasil : [];
            const primaryResult = results[0];
            const primaryJournal = primaryResult?.journal;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      {formatDate(item.created_at)}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      {item.judul || "Tanpa judul artikel"}
                    </h2>
                    <p className="mt-2 text-slate-600 dark:text-gray-300">
                      Kata kunci: {item.kata_kunci || "-"}
                    </p>
                  </div>

                  {primaryJournal?.sinta && (
                    <SintaBadge value={primaryJournal.sinta} />
                  )}
                </div>

                <div className="mt-5 grid gap-3">
                  {results.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
                      <p className="font-semibold">
                        Hasil rekomendasi tidak tersedia.
                      </p>
                    </div>
                  )}

                  {results.map((result, index) => {
                    const journal = result.journal;

                    return (
                      <div
                        key={`${item.id}-${journal?.id ?? index}`}
                        className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold">
                              {journal?.nama ?? "Jurnal tidak tersedia"}
                            </p>
                            <p className="mt-1 text-slate-600 dark:text-gray-300">
                              {journal?.bidang ?? "-"}
                            </p>
                          </div>

                          {journal?.sinta && <SintaBadge value={journal.sinta} />}
                        </div>

                        <p className="mt-3 leading-relaxed text-slate-700 dark:text-gray-200">
                          {result.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {primaryJournal?.id && (
                    <Link
                      href={`/jurnal/${primaryJournal.id}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 font-semibold text-white dark:bg-white dark:text-slate-950"
                    >
                      Lihat Detail Jurnal
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => removeHistory(item.id)}
                    disabled={deleting}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                  >
                    {deleting ? "Memproses..." : "Hapus Riwayat"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardPageShell>
  );
}
