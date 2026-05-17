"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardPageShell from "@/app/components/DashboardPageShell";
import SintaBadge from "@/app/components/SintaBadge";
import { supabase } from "@/lib/supabase";

export default function JurnalDetailPage() {
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

      <a
        href={journal.website}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        Kunjungi Website Jurnal
      </a>
    </PageShell>
  );
}

function PageShell({ title, children }) {
  return (
    <DashboardPageShell title={title} allowedRoles={["admin", "dosen", "mahasiswa"]}>
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
