"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import DashboardPageShell from "../components/DashboardPageShell";
import FavoriteIcon from "../components/FavoriteIcon";
import SintaBadge from "../components/SintaBadge";
import { supabase } from "@/lib/supabase";

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getResultJournal(result) {
  return result?.journal ?? {
    id: result?.journal_id,
    nama: result?.nama,
    sinta: result?.sinta,
  };
}

function getScoreLabel(score, isFallback) {
  if (isFallback || Number(score) < 55) {
    return "Perlu Dipertimbangkan";
  }

  if (Number(score) >= 80) {
    return "Sangat Cocok";
  }

  return "Cocok";
}

function getScoreBadgeClass(score, isFallback) {
  if (isFallback || Number(score) < 55) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  }

  if (Number(score) >= 80) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200";
}

export default function RiwayatPage() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [userId, setUserId] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);
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

      const { data: favoritesData, error: favoritesError } = await supabase
        .from("favorites")
        .select("journal_id")
        .eq("user_id", currentUserId);

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

      if (favoritesError) {
        toast.error("Gagal memuat status favorit", { description: favoritesError.message });
        setFavoriteIds([]);
      } else {
        setFavoriteIds((favoritesData ?? []).map((favorite) => String(favorite.journal_id)));
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
      toast.error("Gagal menghapus riwayat", { description: deleteError.message });
    } else {
      setHistory((currentHistory) =>
        currentHistory.filter((item) => item.id !== historyId)
      );
      toast.success("Riwayat berhasil dihapus");
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
      toast.error("Gagal menghapus riwayat", { description: deleteError.message });
    } else {
      setHistory([]);
      toast.success("Semua riwayat berhasil dihapus");
    }

    setDeleting(false);
  }

  async function toggleFavorite(journalId) {
    if (!userId || !journalId) {
      router.push("/login");
      return;
    }

    const normalizedId = String(journalId);
    const isFavorite = favoriteIds.includes(normalizedId);

    setFavoriteLoadingId(normalizedId);
    setError("");

    const { error: favoriteError } = isFavorite
      ? await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("journal_id", journalId)
      : await supabase
          .from("favorites")
          .insert({ user_id: userId, journal_id: journalId });

    if (favoriteError) {
      setError(favoriteError.message);
      toast.error("Favorit gagal diproses", { description: favoriteError.message });
    } else {
      setFavoriteIds((currentFavorites) =>
        isFavorite
          ? currentFavorites.filter((id) => id !== normalizedId)
          : [...currentFavorites, normalizedId]
      );
      toast.success(isFavorite ? "Jurnal dihapus dari favorit" : "Jurnal berhasil disimpan ke favorit");
    }

    setFavoriteLoadingId(null);
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
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/10">
              <h2 className="text-2xl font-black">
                Belum ada riwayat rekomendasi.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-slate-600 dark:text-gray-300">
                Buat rekomendasi AI untuk menyimpan histori pencocokan jurnal Anda.
              </p>
            </div>
          )}

          {!loading && !error && history.map((item) => {
            const results = Array.isArray(item.hasil) ? item.hasil : [];
            const primaryResult = results[0];
            const primaryJournal = primaryResult?.journal;

            return (
              <article
                key={item.id}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-white/10 dark:bg-white/10 dark:hover:shadow-black/20"
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
                    const journal = getResultJournal(result);
                    const journalId = journal?.id ?? result.journal_id;
                    const scoreLabel = result.scoreLabel ?? getScoreLabel(result.score, result.isFallback);

                    return (
                      <div
                        key={`${item.id}-${journalId ?? index}`}
                        className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            {journalId ? (
                              <Link
                                href={`/jurnal/${journalId}`}
                                className="font-semibold transition hover:text-blue-600 dark:hover:text-blue-300"
                              >
                                {journal?.nama ?? result.nama ?? "Jurnal tidak tersedia"}
                              </Link>
                            ) : (
                              <p className="font-semibold">
                                {journal?.nama ?? result.nama ?? "Jurnal tidak tersedia"}
                              </p>
                            )}
                            <p className="mt-1 text-slate-600 dark:text-gray-300">
                              {journal?.bidang ?? "-"}
                            </p>
                          </div>

                          <div className="flex flex-col items-start gap-2 md:items-end">
                            {journal?.sinta && <SintaBadge value={journal.sinta} />}
                            {result.score !== undefined && (
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getScoreBadgeClass(result.score, result.isFallback)}`}>
                                {scoreLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="mt-3 leading-relaxed text-slate-700 dark:text-gray-200">
                          {result.alasan ?? result.reason}
                        </p>

                        {result.saran && (
                          <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-relaxed text-slate-600 dark:bg-white/5 dark:text-gray-300">
                            <span className="font-bold">Saran:</span> {result.saran}
                          </p>
                        )}

                        {journalId && (
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <Link
                              href={`/jurnal/${journalId}`}
                              className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 font-semibold text-white dark:bg-white dark:text-slate-950"
                            >
                              Lihat Detail
                            </Link>

                            <button
                              type="button"
                              onClick={() => toggleFavorite(journalId)}
                              disabled={favoriteLoadingId === String(journalId)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                            >
                              <FavoriteIcon saved={favoriteIds.includes(String(journalId))} />
                              {favoriteLoadingId === String(journalId)
                                ? "Memproses..."
                                : favoriteIds.includes(String(journalId))
                                  ? "Tersimpan"
                                  : "Simpan Favorit"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
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
