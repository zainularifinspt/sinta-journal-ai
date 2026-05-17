"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SintaBadge from "@/app/components/SintaBadge";
import { supabase } from "@/lib/supabase";

export default function PublicSearchDetailPage() {
  const params = useParams();
  const id = params.id;
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchJournal() {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("journals")
        .select("*")
        .eq("id", id)
        .single();

      if (!isActive) {
        return;
      }

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

      setLoading(false);
    }

    if (id) {
      fetchJournal();
    }

    return () => {
      isActive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
        <PublicSearchHeader />
        <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <Link
            href="/search"
            className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            ← Kembali ke Pencarian
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
            <p className="font-semibold text-slate-700 dark:text-gray-200">
              Memuat detail jurnal...
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
        <PublicSearchHeader />
        <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <Link
            href="/search"
            className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            ← Kembali ke Pencarian
          </Link>
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/20 dark:bg-white/10 md:p-8">
            <h1 className="text-3xl font-bold text-red-700 dark:text-red-200">
              Gagal memuat detail jurnal
            </h1>
            <p className="mt-3 text-red-600 dark:text-red-200">
              {error}
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!journal) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
        <PublicSearchHeader />
        <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <Link
            href="/search"
            className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            ← Kembali ke Pencarian
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
            <h1 className="text-3xl font-bold">
              Jurnal tidak ditemukan
            </h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <PublicSearchHeader />
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Link
          href="/search"
          className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          ← Kembali ke Pencarian
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
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
        </div>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 md:p-8">
          <h2 className="text-2xl font-bold">
            Analisis AI
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700 dark:text-gray-200">
            {journal.catatanAI ?? journal.catatan_ai}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={journal.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Kunjungi Website Jurnal
          </a>

          <Link
            href="/login"
            className="inline-flex rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Login untuk Menyimpan Favorit
          </Link>
        </div>
      </section>
    </main>
  );
}

function PublicSearchHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 font-black text-white shadow-lg shadow-blue-600/20">
            SA
          </div>
          <div>
            <p className="font-black leading-tight tracking-tight">
              SINTA Journal AI
            </p>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">
              Public Search
            </p>
          </div>
        </Link>

        <Link
          href="/login"
          className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-100"
        >
          Login
        </Link>
      </div>
    </header>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-slate-700 dark:text-gray-200">
        {value ?? "-"}
      </p>
    </div>
  );
}
