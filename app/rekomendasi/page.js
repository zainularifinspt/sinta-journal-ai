"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import DashboardPageShell from "../components/DashboardPageShell";
import SintaBadge from "../components/SintaBadge";
import { buildRecommendations } from "@/lib/recommendation";
import { supabase } from "@/lib/supabase";

function getScoreBadgeClass(score, isFallback) {
  if (isFallback) {
    return "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-gray-200";
  }

  if (score >= 70) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  if (score >= 30) {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
}

export default function RekomendasiPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingJournals, setLoadingJournals] = useState(false);
  const [summary, setSummary] = useState("");
  const [recommendationSource, setRecommendationSource] = useState("");
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  async function saveRecommendationHistory(results) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (sessionError || !userId) {
      router.push("/login");
      return false;
    }

    const { error: insertError } = await supabase.from("recommendation_history").insert({
      user_id: userId,
      judul: title,
      abstrak: abstract,
      kata_kunci: keywords,
      hasil: results.map((item) => ({
        journal: item.journal,
        reason: item.reason,
        score: item.score,
        scoreLabel: item.scoreLabel,
        matchedKeywords: item.matchedKeywords ?? [],
        isFallback: item.isFallback,
        saran: item.saran,
        source: item.source ?? recommendationSource,
      })),
    });

    if (insertError) {
      setHistoryError(insertError.message);
      toast.error("Riwayat gagal disimpan", { description: insertError.message });
      return false;
    }

    setHistoryError("");
    toast.success("Rekomendasi berhasil disimpan ke riwayat");
    return true;
  }

  async function fetchJournalsForRecommendation() {
    setLoadingJournals(true);

    const { data, error: fetchError } = await supabase
      .from("journals")
      .select("id, nama, bidang, scope, catatan_ai, sinta, publisher, jadwal")
      .order("nama", { ascending: true });

    setLoadingJournals(false);

    if (fetchError) {
      setError(fetchError.message);
      return [];
    }

    setError("");
    return data ?? [];
  }

  async function getLocalFallbackRecommendations(combinedText) {
    const latestJournals = await fetchJournalsForRecommendation();

    if (latestJournals.length === 0) {
      return {
        recommendations: [],
        summary: "",
      };
    }

    const results = buildRecommendations(combinedText, latestJournals);

    return {
      recommendations: results.map((item) => ({
        ...item,
        journal_id: item.journal.id,
        nama: item.journal.nama,
        sinta: item.journal.sinta,
        alasan: item.reason,
        saran: "Periksa kembali focus and scope, template artikel, dan ketentuan author sebelum submit.",
        source: "local",
      })),
      summary: "Rekomendasi dibuat dengan engine lokal karena layanan AI tidak tersedia.",
    };
  }

  async function handleAnalyze() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData?.session?.user) {
      router.push("/login");
      return;
    }

    const combinedText = `${title} ${abstract} ${keywords}`.trim();

    if (!combinedText) {
      toast.error("Lengkapi judul, abstrak, atau kata kunci terlebih dahulu");
      return;
    }

    setIsLoading(true);
    setRecommendations([]);
    setSummary("");
    setRecommendationSource("");
    setError("");
    setHistoryError("");

    try {
      const response = await fetch("/api/recommend-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          judul: title,
          abstrak: abstract,
          kata_kunci: keywords,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Gagal membuat rekomendasi AI.");
      }

      const source = result.source ?? "openai";
      const results = (result.recommendations ?? []).map((item) => ({
        ...item,
        source,
      }));

      setRecommendations(results);
      setSummary(result.summary ?? "");
      setRecommendationSource(source);
      await saveRecommendationHistory(results);
    } catch (analyzeError) {
      const fallback = await getLocalFallbackRecommendations(combinedText);

      if (fallback.recommendations.length === 0) {
        setError(analyzeError.message ?? "Gagal membuat rekomendasi AI.");
      } else {
        setRecommendations(fallback.recommendations);
        setSummary(fallback.summary);
        setRecommendationSource("local");
        await saveRecommendationHistory(fallback.recommendations);
        toast.info("OpenAI tidak tersedia, rekomendasi dibuat dengan engine lokal.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DashboardPageShell title="Rekomendasi AI" allowedRoles={["admin", "dosen"]}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              AI Recommendation
            </p>
            <h1 className="text-4xl font-bold">
              Rekomendasi Jurnal Cerdas
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600 dark:text-gray-300">
              Masukkan ringkasan artikel untuk mendapatkan Top 5 jurnal SINTA paling relevan dengan analisis AI.
            </p>
          </div>

          <Link
            href="/riwayat"
            className="w-fit rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Lihat Riwayat
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/10 dark:shadow-black/20 md:p-8">
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="font-semibold">
                  Judul Artikel
                </span>
                <textarea
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  rows={3}
                  placeholder="Contoh: Pengembangan media pembelajaran matematika berbasis AI"
                  className="resize-none rounded-xl bg-white p-4 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                />
              </label>

              <label className="grid gap-2">
                <span className="font-semibold">
                  Abstrak
                </span>
                <textarea
                  value={abstract}
                  onChange={(event) => setAbstract(event.target.value)}
                  rows={7}
                  placeholder="Tuliskan abstrak artikel Anda..."
                  className="resize-none rounded-xl bg-white p-4 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                />
              </label>

              <label className="grid gap-2">
                <span className="font-semibold">
                  Kata Kunci
                </span>
                <textarea
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  rows={3}
                  placeholder="Contoh: pembelajaran, statistika, artificial intelligence"
                  className="resize-none rounded-xl bg-white p-4 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                />
              </label>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading || loadingJournals}
                className="inline-flex h-12 w-fit items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isLoading && (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {isLoading ? "Menganalisis..." : "Analisis"}
              </button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/10 dark:shadow-black/20 md:p-8">
            <h2 className="text-2xl font-bold">
              Hasil Rekomendasi
            </h2>

            {loadingJournals && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      Memuat data jurnal
                    </p>
                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">
                      Mengambil data jurnal dari Supabase untuk fallback lokal.
                    </p>
                  </div>
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-600" />
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950/60">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" />
                </div>
              </div>
            )}

            {!isLoading && error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            )}

            {!isLoading && !loadingJournals && !error && recommendations.length === 0 && (
              <p className="mt-4 text-slate-600 dark:text-gray-300">
                Hasil analisis akan tampil di sini setelah Anda menekan tombol analisis.
              </p>
            )}

            {isLoading && !loadingJournals && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-gray-200">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-600" />
                  <div>
                    <p className="font-semibold">
                      Menganalisis kecocokan jurnal
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                      Mengirim judul, abstrak, kata kunci, dan kandidat jurnal relevan ke server AI.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && historyError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                Rekomendasi tampil, tetapi gagal menyimpan riwayat: {historyError}
              </div>
            )}

            {!isLoading && recommendations.length > 0 && (
              <div className="mt-6 grid gap-4">
                {summary && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                    <p className="font-semibold">
                      Ringkasan Analisis {recommendationSource === "local" ? "Lokal" : "AI"}
                    </p>
                    <p className="mt-2 leading-relaxed">
                      {summary}
                    </p>
                  </div>
                )}
                {recommendations.map((recommendation) => (
                  <div
                    key={recommendation.journal?.id ?? recommendation.journal_id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-white/10 dark:bg-white/10 dark:hover:shadow-black/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold">
                          {recommendation.nama ?? recommendation.journal?.nama}
                        </h3>
                        <p className="mt-2 text-slate-600 dark:text-gray-300">
                          {recommendation.journal?.bidang ?? recommendation.sinta}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <SintaBadge value={recommendation.sinta ?? recommendation.journal?.sinta} />
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getScoreBadgeClass(
                            recommendation.score,
                            recommendation.isFallback
                          )}`}
                        >
                          {recommendation.scoreLabel}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-500 dark:text-gray-400">
                          Score Kecocokan
                        </span>
                        <span className="text-2xl font-black text-slate-950 dark:text-white">
                          {recommendation.score}
                        </span>
                      </div>

                      {(recommendation.matchedKeywords ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(recommendation.matchedKeywords ?? []).slice(0, 6).map((keyword) => (
                            <span
                              key={`${recommendation.journal?.id ?? recommendation.journal_id}-${keyword}`}
                              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="mt-5 leading-relaxed text-slate-700 dark:text-gray-200">
                      {recommendation.alasan ?? recommendation.reason}
                    </p>

                    {recommendation.saran && (
                      <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-950/40 dark:text-gray-300">
                        <span className="font-bold">Saran:</span> {recommendation.saran}
                      </p>
                    )}

                    <Link
                      href={`/jurnal/${recommendation.journal?.id ?? recommendation.journal_id}`}
                      className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 font-semibold text-white dark:bg-white dark:text-slate-950"
                    >
                      Lihat Detail Jurnal
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardPageShell>
  );
}
