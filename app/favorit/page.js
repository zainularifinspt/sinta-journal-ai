"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardPageShell from "../components/DashboardPageShell";
import FavoriteIcon from "../components/FavoriteIcon";
import SintaBadge from "../components/SintaBadge";
import { supabase } from "@/lib/supabase";

export default function FavoritPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchFavorites() {
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
        .from("favorites")
        .select("id, journal_id, created_at, journals(*)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (!isActive) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setFavorites([]);
      } else {
        setError("");
        setFavorites(data ?? []);
      }

      setLoading(false);
    }

    fetchFavorites();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function removeFavorite(journalId) {
    if (!userId) {
      router.push("/login");
      return;
    }

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("journal_id", journalId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setFavorites((currentFavorites) =>
        currentFavorites.filter((favorite) => String(favorite.journal_id) !== String(journalId))
      );
    }

    setDeleting(false);
  }

  async function clearFavorites() {
    if (!userId) {
      router.push("/login");
      return;
    }

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setFavorites([]);
    }

    setDeleting(false);
  }

  return (
    <DashboardPageShell title="Favorit" allowedRoles={["admin", "dosen", "mahasiswa"]}>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-3">
            Jurnal Favorit
          </h1>

          <p className="text-slate-600 dark:text-gray-300">
            Daftar jurnal yang sudah Anda simpan.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/jurnal"
            className="w-fit rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Cari Jurnal
          </Link>

          <button
            type="button"
            onClick={clearFavorites}
            disabled={favorites.length === 0 || deleting}
            className="w-fit rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
          >
            {deleting ? "Memproses..." : "Hapus Semua Favorit"}
          </button>
        </div>
      </div>

      <div className="grid gap-5">
        {loading && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm dark:bg-white/10 dark:border-white/10">
            <h2 className="text-2xl font-bold">
              Memuat jurnal favorit...
            </h2>
          </div>
        )}

        {!loading && error && (
          <div className="bg-white border border-red-200 p-6 rounded-2xl shadow-sm dark:bg-white/10 dark:border-red-500/20">
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-200">
              Gagal memuat jurnal favorit
            </h2>
            <p className="mt-2 text-red-600 dark:text-red-200">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && favorites.length === 0 && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm dark:bg-white/10 dark:border-white/10">
            <h2 className="text-2xl font-bold">
              Belum ada jurnal favorit
            </h2>
          </div>
        )}

        {!loading && !error && favorites.map((favorite) => {
          const journal = favorite.journals;

          if (!journal) {
            return null;
          }

          return (
            <div
              key={favorite.id}
            className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm dark:bg-white/10 dark:border-white/10"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {journal.nama}
                </h2>

                <p className="text-slate-600 dark:text-gray-300">
                  {journal.publisher}
                </p>
              </div>

              <SintaBadge value={journal.sinta} />
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-slate-600 dark:text-gray-300">
              <p>ISSN: {journal.issn}</p>
              <p>Bidang: {journal.bidang}</p>
              <p>Terbit: {journal.jadwal}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={`/jurnal/${journal.id}`}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 font-semibold text-white dark:bg-white dark:text-slate-950"
              >
                Lihat Detail
              </Link>

              <button
                type="button"
                onClick={() => removeFavorite(journal.id)}
                disabled={deleting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
              >
                <FavoriteIcon saved />
                {deleting ? "Memproses..." : "Hapus Favorit"}
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </DashboardPageShell>
  );
}
