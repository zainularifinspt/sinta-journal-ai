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

function getHistoryResults(item) {
  if (Array.isArray(item?.hasil)) {
    return item.hasil;
  }

  if (Array.isArray(item?.recommendations)) {
    return item.recommendations;
  }

  if (typeof item?.hasil === "string") {
    try {
      const parsed = JSON.parse(item.hasil);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (Array.isArray(parsed?.recommendations)) {
        return parsed.recommendations;
      }
    } catch {
      return [];
    }
  }

  return [];
}

function getScoreValue(score) {
  const numericScore = Number(score);

  if (!Number.isFinite(numericScore)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numericScore)));
}

function getScoreLabel(score, isFallback) {
  const numericScore = getScoreValue(score);

  if (isFallback || numericScore < 55) {
    return "Perlu Dipertimbangkan";
  }

  if (numericScore >= 80) {
    return "Sangat Cocok";
  }

  return "Cocok";
}

function getScoreBadgeClass(score, isFallback) {
  const numericScore = getScoreValue(score);

  if (isFallback || numericScore < 55) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  }

  if (numericScore >= 80) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200";
}

function getHistorySummary(item, results) {
  const savedSummary =
    item?.ringkasan_ai ??
    item?.ringkasan ??
    item?.summary_ai ??
    item?.summary;

  if (savedSummary) {
    return savedSummary;
  }

  if (results.length === 0) {
    return "Belum ada hasil rekomendasi yang tersimpan untuk analisis ini.";
  }

  const bestJournal = getResultJournal(results[0]);

  return `AI menemukan ${results.length} jurnal yang relevan. Rekomendasi teratas adalah ${bestJournal?.nama ?? "jurnal pertama dalam daftar"} berdasarkan kecocokan topik dan informasi jurnal yang tersedia.`;
}

function getAbstractPreview(abstract, isExpanded) {
  const cleanAbstract = String(abstract ?? "").trim();

  if (!cleanAbstract) {
    return "-";
  }

  if (isExpanded || cleanAbstract.length <= 260) {
    return cleanAbstract;
  }

  return `${cleanAbstract.slice(0, 260).trim()}...`;
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
  const [expandedAbstractIds, setExpandedAbstractIds] = useState([]);

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

  function toggleAbstract(historyId) {
    setExpandedAbstractIds((currentIds) =>
      currentIds.includes(historyId)
        ? currentIds.filter((id) => id !== historyId)
        : [...currentIds, historyId]
    );
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
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/10">
              <h2 className="text-2xl font-black">
                Belum ada riwayat rekomendasi
              </h2>
              <p className="mx-auto mt-3 max-w-md text-slate-600 dark:text-gray-300">
                Buat rekomendasi AI untuk menyimpan histori pencocokan jurnal Anda.
              </p>
              <Link
                href="/rekomendasi"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700"
              >
                Buat Rekomendasi
              </Link>
            </div>
          )}

          {!loading && !error && history.map((item) => {
            const results = getHistoryResults(item);
            const primaryResult = results[0];
            const primaryJournal = getResultJournal(primaryResult);
            const summary = getHistorySummary(item, results);
            const isAbstractExpanded = expandedAbstractIds.includes(item.id);
            const abstractText = String(item.abstrak ?? "").trim();

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/10"
              >
                <div className="grid gap-5 p-5 md:p-6">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                          Input Pengguna
                        </p>
                        <h2 className="mt-2 break-words text-2xl font-black">
                          {item.judul || "Tanpa judul artikel"}
                        </h2>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-gray-300">
                        {formatDate(item.created_at)}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                      <div className="rounded-xl bg-white p-4 dark:bg-white/5">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Kata Kunci
                        </p>
                        <p className="mt-2 break-words font-semibold text-slate-800 dark:text-gray-100">
                          {item.kata_kunci || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-4 dark:bg-white/5">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Abstrak
                        </p>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-gray-200">
                          {getAbstractPreview(abstractText, isAbstractExpanded)}
                        </p>
                        {abstractText.length > 260 && (
                          <button
                            type="button"
                            onClick={() => toggleAbstract(item.id)}
                            className="mt-3 text-sm font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                          >
                            {isAbstractExpanded ? "Sembunyikan" : "Lihat lengkap"}
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                        Ringkasan AI
                      </p>
                      <p className="mt-2 break-words leading-7 text-blue-950 dark:text-blue-50">
                        {summary}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[260px] lg:grid-cols-1">
                      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-white/10">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Jumlah Jurnal
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {results.length}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-white/10">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Top Recommendation
                        </p>
                        <p className="mt-1 break-words font-black">
                          {primaryJournal?.nama ?? "Belum tersedia"}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="grid gap-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Daftar Rekomendasi
                        </p>
                        <h3 className="mt-1 text-2xl font-black">
                          Jurnal yang Direkomendasikan
                        </h3>
                      </div>
                      {primaryJournal?.sinta && (
                        <div className="w-fit">
                          <SintaBadge value={primaryJournal.sinta} />
                        </div>
                      )}
                    </div>

                    {results.length === 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                        <p className="font-semibold">
                          Hasil rekomendasi tidak tersedia.
                        </p>
                      </div>
                    )}

                    {results.map((result, index) => {
                    const journal = getResultJournal(result);
                    const journalId = journal?.id ?? result.journal_id;
                    const scoreValue = getScoreValue(result.score);
                    const scoreLabel = result.scoreLabel ?? getScoreLabel(scoreValue, result.isFallback);
                    const isTopRecommendation = index === 0;

                    return (
                      <div
                        key={`${item.id}-${journalId ?? index}`}
                        className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-white/5 ${
                          isTopRecommendation
                            ? "border-blue-300 ring-2 ring-blue-100 dark:border-blue-400/50 dark:ring-blue-500/20"
                            : "border-slate-200 dark:border-white/10"
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="inline-flex h-8 items-center justify-center rounded-full bg-slate-950 px-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                                #{index + 1}
                              </span>
                              {isTopRecommendation && (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                                  Rekomendasi Terbaik
                                </span>
                              )}
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getScoreBadgeClass(scoreValue, result.isFallback)}`}>
                                {scoreLabel}
                              </span>
                            </div>

                            {journalId ? (
                              <Link
                                href={`/jurnal/${journalId}`}
                                className="break-words text-xl font-black transition hover:text-blue-600 dark:hover:text-blue-300"
                              >
                                {journal?.nama ?? result.nama ?? "Jurnal tidak tersedia"}
                              </Link>
                            ) : (
                              <p className="break-words text-xl font-black">
                                {journal?.nama ?? result.nama ?? "Jurnal tidak tersedia"}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {journal?.sinta && <SintaBadge value={journal.sinta} />}
                              <span className="break-words rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-gray-300">
                                {journal?.bidang ?? "-"}
                              </span>
                            </div>
                          </div>

                          <div className="w-full shrink-0 lg:w-56">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-bold text-slate-600 dark:text-gray-300">
                                Skor {scoreValue}/100
                              </span>
                              <span className="text-2xl font-black">
                                {scoreValue}
                              </span>
                            </div>
                            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{ width: `${scoreValue}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                              Alasan AI
                            </p>
                            <p className="mt-2 break-words leading-6 text-slate-700 dark:text-gray-200">
                              {result.alasan ?? result.reason ?? "Alasan belum tersedia."}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                              Saran AI
                            </p>
                            <p className="mt-2 break-words leading-6 text-slate-700 dark:text-gray-200">
                              {result.saran || "Periksa kembali focus and scope, template artikel, dan panduan author sebelum submit."}
                            </p>
                          </div>
                        </div>

                        {journalId && (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:flex md:flex-wrap md:items-center">
                            <Link
                              href={`/jurnal/${journalId}`}
                              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 font-semibold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                            >
                              Lihat Detail
                            </Link>

                            <button
                              type="button"
                              onClick={() => toggleFavorite(journalId)}
                              disabled={favoriteLoadingId === String(journalId)}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
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
                  </section>
                </div>

                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/30 md:px-6">
                  <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeHistory(item.id)}
                    disabled={deleting}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                  >
                    {deleting ? "Memproses..." : "Hapus Riwayat"}
                  </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardPageShell>
  );
}
