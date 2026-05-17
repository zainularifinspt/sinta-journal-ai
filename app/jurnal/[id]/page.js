"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import DashboardPageShell from "@/app/components/DashboardPageShell";
import FavoriteIcon from "@/app/components/FavoriteIcon";
import SintaBadge from "@/app/components/SintaBadge";
import { supabase } from "@/lib/supabase";

export default function JurnalDetailPage() {
  const params = useParams();
  const id = params.id;
  const [journal, setJournal] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteError, setFavoriteError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchJournal() {
      setLoading(true);
      setError("");

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id ?? null;
      const journalQuery = supabase
        .from("journals")
        .select("*")
        .eq("id", id)
        .single();
      const favoriteQuery = currentUserId
        ? supabase
            .from("favorites")
            .select("id")
            .eq("user_id", currentUserId)
            .eq("journal_id", id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });
      const [
        { data, error: fetchError },
        { data: favoriteData, error: favoriteFetchError },
      ] = await Promise.all([journalQuery, favoriteQuery]);

      if (!isActive) {
        return;
      }

      setUserId(currentUserId);

      if (fetchError) {
        setJournal(null);

        if (fetchError.code === "PGRST116") {
          setError("");
        } else {
          setError(fetchError.message);
        }
      } else {
        setJournal(data);
        setError("");
      }

      if (favoriteFetchError && favoriteFetchError.code !== "PGRST116") {
        setFavoriteError(favoriteFetchError.message);
        setIsFavorite(false);
      } else {
        setFavoriteError("");
        setIsFavorite(Boolean(favoriteData));
      }

      setLoading(false);
    }

    if (id) {
      fetchJournal();
    }

    return () => {
      isActive = false;
    };
  }, [id]);

  async function toggleFavorite() {
    if (!userId || !journal?.id) {
      return;
    }

    setFavoriteLoading(true);
    setFavoriteError("");

    const { error: favoriteMutationError } = isFavorite
      ? await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("journal_id", journal.id)
      : await supabase
          .from("favorites")
          .insert({ user_id: userId, journal_id: journal.id });

    if (favoriteMutationError) {
      setFavoriteError(favoriteMutationError.message);
      toast.error("Favorit gagal diproses", { description: favoriteMutationError.message });
    } else {
      setIsFavorite((currentValue) => !currentValue);
      toast.success(isFavorite ? "Jurnal dihapus dari favorit" : "Jurnal berhasil disimpan ke favorit");
    }

    setFavoriteLoading(false);
  }

  if (loading) {
    return (
      <PageShell title="Detail Jurnal">
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
          <p className="font-semibold text-slate-700 dark:text-gray-200">
            Memuat detail jurnal...
          </p>
        </section>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Detail Jurnal">
        <section className="mt-8 rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/20 dark:bg-white/10 md:p-8">
          <h1 className="text-3xl font-bold text-red-700 dark:text-red-200">
            Gagal memuat detail jurnal
          </h1>
          <p className="mt-3 text-red-600 dark:text-red-200">
            {error}
          </p>
        </section>
      </PageShell>
    );
  }

  if (!journal) {
    return (
      <PageShell title="Detail Jurnal">
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
          <h1 className="text-3xl font-bold">
            Jurnal tidak ditemukan
          </h1>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell title="Detail Jurnal">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              {journal.nama}
            </h1>
            <p className="mt-3 text-lg text-slate-600 dark:text-gray-300">
              {journal.publisher}
            </p>
          </div>

          <SintaBadge value={journal.sinta} className="px-5 py-3" />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <InfoItem label="ISSN" value={journal.issn} />
          <InfoItem label="E-ISSN" value={journal.eissn} />
          <InfoItem label="Bidang" value={journal.bidang} />
          <InfoItem label="Jadwal Terbit" value={journal.jadwal} />
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold">
            Scope
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600 dark:text-gray-300">
            {journal.scope}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 md:p-8">
        <h2 className="text-2xl font-bold">
          Analisis AI
        </h2>
        <p className="mt-3 leading-relaxed text-slate-700 dark:text-gray-200">
          {journal.catatanAI ?? journal.catatan_ai}
        </p>
      </section>

      {favoriteError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          {favoriteError}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href={journal.website}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700"
        >
          Kunjungi Website Jurnal
        </a>

        <button
          type="button"
          onClick={toggleFavorite}
          disabled={favoriteLoading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          <FavoriteIcon saved={isFavorite} />
          {favoriteLoading ? "Memproses..." : isFavorite ? "Tersimpan" : "Simpan Favorit"}
        </button>
      </div>
    </PageShell>
  );
}

function PageShell({ title, children }) {
  return (
    <DashboardPageShell title={title}>
      <div className="mx-auto max-w-5xl">
        <Link
          href="/jurnal"
          className="inline-flex rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          Kembali ke Jurnal
        </Link>

        {children}
      </div>
    </DashboardPageShell>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 font-semibold">
        {value ?? "-"}
      </p>
    </div>
  );
}
