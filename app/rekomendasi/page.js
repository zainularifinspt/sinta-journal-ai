"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardPageShell from "../components/DashboardPageShell";
import SintaBadge from "../components/SintaBadge";
import { supabase } from "@/lib/supabase";

function getSintaRank(value) {
  return Number(String(value ?? "").replace(/\D/g, "")) || 99;
}

function scoreJournal(journal, normalizedText) {
  const searchableText = [
    journal.nama,
    journal.publisher,
    journal.bidang,
    journal.scope,
    journal.catatan_ai,
    journal.catatanAI,
  ]
    .map((value) => value ?? "")
    .join(" ")
    .toLowerCase();

  const terms = normalizedText.split(/\s+/).filter((term) => term.length >= 4);
  const keywordScore = terms.reduce((score, term) => {
    return searchableText.includes(term) ? score + 3 : score;
  }, 0);
  const phraseScore = normalizedText
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean)
    .reduce((score, phrase) => {
      return searchableText.includes(phrase) ? score + 5 : score;
    }, 0);
  const sintaScore = Math.max(0, 7 - getSintaRank(journal.sinta));

  return keywordScore + phraseScore + sintaScore;
}

function buildRecommendations(text, journals) {
  const normalizedText = text.toLowerCase();
  const rankedJournals = [...journals]
    .map((journal) => ({
      journal,
      score: scoreJournal(journal, normalizedText),
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return getSintaRank(first.journal.sinta) - getSintaRank(second.journal.sinta);
    })
    .slice(0, 3);

  return rankedJournals.map(({ journal, score }, index) => ({
    journal,
    reason:
      score > 0
        ? `Rekomendasi #${index + 1} karena metadata, bidang, atau scope jurnal ini paling dekat dengan judul, abstrak, dan kata kunci yang Anda masukkan.`
        : `Rekomendasi #${index + 1} sebagai opsi awal berdasarkan peringkat SINTA dan kelengkapan data jurnal. Periksa kembali scope sebelum submit.`,
  }));
}

export default function RekomendasiPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journals, setJournals] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingJournals, setLoadingJournals] = useState(true);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchJournals() {
      const { data, error: fetchError } = await supabase
        .from("journals")
        .select("*")
        .order("nama", { ascending: true });

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

      setLoadingJournals(false);
    }

    fetchJournals();

    return () => {
      isActive = false;
    };
  }, []);

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
      })),
    });

    if (insertError) {
      setHistoryError(insertError.message);
      return false;
    }

    setHistoryError("");
    return true;
  }

  async function handleAnalyze() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData?.session?.user) {
      router.push("/login");
      return;
    }

    setIsLoading(true);
    setRecommendations([]);
    setHistoryError("");

    window.setTimeout(async () => {
      const combinedText = `${title} ${abstract} ${keywords}`;
      const results = buildRecommendations(combinedText, journals);

      setRecommendations(results);
      await saveRecommendationHistory(results);
      setIsLoading(false);
    }, 1500);
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
              Rekomendasi Jurnal dengan AI
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600 dark:text-gray-300">
              Masukkan ringkasan artikel untuk mendapatkan rekomendasi jurnal SINTA yang paling mendekati topik naskah.
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
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
                disabled={isLoading || loadingJournals || journals.length === 0}
                className="inline-flex h-12 w-fit items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isLoading && (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                Analisis dengan AI
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
            <h2 className="text-2xl font-bold">
              Hasil Rekomendasi
            </h2>

            {!isLoading && loadingJournals && (
              <p className="mt-4 text-slate-600 dark:text-gray-300">
                Memuat data jurnal dari Supabase...
              </p>
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

            {isLoading && (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-100 p-4 text-slate-700 dark:bg-slate-950/40 dark:text-gray-200">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-600" />
                Menganalisis kecocokan jurnal...
              </div>
            )}

            {!isLoading && historyError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                Rekomendasi tampil, tetapi gagal menyimpan riwayat: {historyError}
              </div>
            )}

            {!isLoading && recommendations.length > 0 && (
              <div className="mt-6 grid gap-4">
                {recommendations.map((recommendation) => (
                  <div
                    key={recommendation.journal.id}
                    className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold">
                          {recommendation.journal.nama}
                        </h3>
                        <p className="mt-2 text-slate-600 dark:text-gray-300">
                          {recommendation.journal.bidang}
                        </p>
                      </div>

                      <SintaBadge value={recommendation.journal.sinta} />
                    </div>

                    <p className="mt-5 leading-relaxed text-slate-700 dark:text-gray-200">
                      {recommendation.reason}
                    </p>

                    <Link
                      href={`/jurnal/${recommendation.journal.id}`}
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
