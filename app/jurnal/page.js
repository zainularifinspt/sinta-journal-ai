"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DashboardPageShell from "../components/DashboardPageShell";
import FavoriteIcon from "../components/FavoriteIcon";
import SintaBadge from "../components/SintaBadge";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 10;
const SEARCH_COUNT_KEY = "journalSearchCount";
const sintaOptions = ["SINTA 1", "SINTA 2", "SINTA 3", "SINTA 4", "SINTA 5", "SINTA 6"];

function sanitizeSearch(value) {
  return value.replace(/[,%]/g, " ").trim();
}

function applyFilters(query, { searchTerm, selectedSinta, selectedBidang, selectedPublisher }) {
  const safeSearch = sanitizeSearch(searchTerm);

  if (safeSearch) {
    query = query.or(
      `nama.ilike.%${safeSearch}%,issn.ilike.%${safeSearch}%,eissn.ilike.%${safeSearch}%,publisher.ilike.%${safeSearch}%,bidang.ilike.%${safeSearch}%,scope.ilike.%${safeSearch}%`
    );
  }

  if (selectedSinta !== "Semua SINTA") {
    query = query.eq("sinta", selectedSinta);
  }

  if (selectedBidang !== "Semua Bidang") {
    query = query.eq("bidang", selectedBidang);
  }

  if (selectedPublisher !== "Semua Publisher") {
    query = query.eq("publisher", selectedPublisher);
  }

  return query;
}

function applySorting(query, sortBy) {
  if (sortBy === "nama_desc") {
    return query.order("nama", { ascending: false });
  }

  if (sortBy === "sinta_asc") {
    return query.order("sinta", { ascending: true }).order("nama", { ascending: true });
  }

  if (sortBy === "sinta_desc") {
    return query.order("sinta", { ascending: false }).order("nama", { ascending: true });
  }

  if (sortBy === "terbaru") {
    return query.order("created_at", { ascending: false }).order("nama", { ascending: true });
  }

  return query.order("nama", { ascending: true });
}

export default function JurnalPage() {
  const router = useRouter();
  const [journals, setJournals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSinta, setSelectedSinta] = useState("Semua SINTA");
  const [selectedBidang, setSelectedBidang] = useState("Semua Bidang");
  const [selectedPublisher, setSelectedPublisher] = useState("Semua Publisher");
  const [sortBy, setSortBy] = useState("nama_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJournals, setTotalJournals] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [bidangOptions, setBidangOptions] = useState([]);
  const [publisherOptions, setPublisherOptions] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [userId, setUserId] = useState(null);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteError, setFavoriteError] = useState("");

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const fromItem = filteredCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const toItem = Math.min(currentPage * PAGE_SIZE, filteredCount);

  useEffect(() => {
    let isActive = true;

    async function fetchSessionAndMetadata() {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id ?? null;
      const favoritesQuery = currentUserId
        ? supabase
            .from("favorites")
            .select("journal_id")
            .eq("user_id", currentUserId)
        : Promise.resolve({ data: [], error: null });

      const [
        { data: metadataData, error: metadataError, count },
        { data: favoritesData, error: favoritesError },
      ] = await Promise.all([
        supabase
          .from("journals")
          .select("bidang, publisher", { count: "exact" })
          .order("bidang", { ascending: true })
          .limit(5000),
        favoritesQuery,
      ]);

      if (!isActive) {
        return;
      }

      setUserId(currentUserId);
      setTotalJournals(count ?? 0);

      if (metadataError) {
        setError(metadataError.message);
        setBidangOptions([]);
        setPublisherOptions([]);
      } else {
        setBidangOptions(
          Array.from(new Set((metadataData ?? []).map((journal) => journal.bidang).filter(Boolean)))
            .sort((first, second) => first.localeCompare(second))
        );
        setPublisherOptions(
          Array.from(new Set((metadataData ?? []).map((journal) => journal.publisher).filter(Boolean)))
            .sort((first, second) => first.localeCompare(second))
        );
      }

      if (favoritesError) {
        setFavoriteError(favoritesError.message);
        setFavoriteIds([]);
      } else {
        setFavoriteError("");
        setFavoriteIds((favoritesData ?? []).map((favorite) => String(favorite.journal_id)));
      }

      setMetadataLoading(false);
    }

    fetchSessionAndMetadata();

    return () => {
      isActive = false;
    };
  }, []);

  const filterState = useMemo(
    () => ({
      searchTerm,
      selectedSinta,
      selectedBidang,
      selectedPublisher,
    }),
    [searchTerm, selectedSinta, selectedBidang, selectedPublisher]
  );

  useEffect(() => {
    let isActive = true;

    async function fetchJournals() {
      setLoading(true);
      setError("");

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("journals")
        .select("*", { count: "exact" });

      query = applyFilters(query, filterState);
      query = applySorting(query, sortBy).range(from, to);

      const { data, error: fetchError, count } = await query;

      if (!isActive) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setJournals([]);
        setFilteredCount(0);
      } else {
        const nextFilteredCount = count ?? 0;
        const nextTotalPages = Math.max(1, Math.ceil(nextFilteredCount / PAGE_SIZE));

        if (currentPage > nextTotalPages) {
          setCurrentPage(nextTotalPages);
          return;
        }

        setError("");
        setJournals(data ?? []);
        setFilteredCount(nextFilteredCount);
      }

      setLoading(false);
    }

    fetchJournals();

    return () => {
      isActive = false;
    };
  }, [currentPage, filterState, sortBy]);

  async function toggleFavorite(journalId) {
    if (!userId) {
      router.push("/login");
      return;
    }

    const normalizedId = String(journalId);
    const isFavorite = favoriteIds.includes(normalizedId);

    setFavoriteLoadingId(normalizedId);
    setFavoriteError("");

    const { error: favoriteMutationError } = isFavorite
      ? await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("journal_id", journalId)
      : await supabase
          .from("favorites")
          .insert({ user_id: userId, journal_id: journalId });

    if (favoriteMutationError) {
      setFavoriteError(favoriteMutationError.message);
    } else {
      setFavoriteIds((currentFavorites) =>
        isFavorite
          ? currentFavorites.filter((id) => id !== normalizedId)
          : [...currentFavorites, normalizedId]
      );
    }

    setFavoriteLoadingId(null);
  }

  function handleSearchAction() {
    const currentCount = Number(window.localStorage.getItem(SEARCH_COUNT_KEY) ?? 0);
    window.localStorage.setItem(SEARCH_COUNT_KEY, String(currentCount + 1));
  }

  function resetFilters() {
    setSearchTerm("");
    setSelectedSinta("Semua SINTA");
    setSelectedBidang("Semua Bidang");
    setSelectedPublisher("Semua Publisher");
    setSortBy("nama_asc");
    setCurrentPage(1);
  }

  function updateFilter(setter, value) {
    setter(value);
    setCurrentPage(1);
  }

  return (
    <DashboardPageShell title="Cari Jurnal" allowedRoles={["admin", "dosen", "mahasiswa"]}>
      <h1 className="mb-3 text-4xl font-bold">
        Cari Jurnal SINTA
      </h1>

      <p className="mb-8 text-slate-600 dark:text-gray-300">
        Cari informasi jurnal berdasarkan nama, ISSN, bidang, publisher, atau peringkat SINTA.
      </p>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Total Jurnal" value={metadataLoading ? "..." : totalJournals} />
        <StatCard label="Hasil Filter" value={loading ? "..." : filteredCount} />
        <StatCard label="Publisher Unik" value={metadataLoading ? "..." : publisherOptions.length} />
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
        <div className="grid gap-4 xl:grid-cols-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => updateFilter(setSearchTerm, event.target.value)}
            placeholder="Nama jurnal / ISSN / bidang"
            className="rounded-xl bg-white p-4 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0 xl:col-span-2"
          />

          <select
            value={selectedSinta}
            onChange={(event) => updateFilter(setSelectedSinta, event.target.value)}
            className="rounded-xl bg-white p-4 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
          >
            <option>Semua SINTA</option>
            {sintaOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <select
            value={selectedBidang}
            onChange={(event) => updateFilter(setSelectedBidang, event.target.value)}
            className="rounded-xl bg-white p-4 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
          >
            <option>Semua Bidang</option>
            {bidangOptions.map((bidang) => (
              <option key={bidang}>{bidang}</option>
            ))}
          </select>

          <select
            value={selectedPublisher}
            onChange={(event) => updateFilter(setSelectedPublisher, event.target.value)}
            className="rounded-xl bg-white p-4 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
          >
            <option>Semua Publisher</option>
            {publisherOptions.map((publisher) => (
              <option key={publisher}>{publisher}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => updateFilter(setSortBy, event.target.value)}
            className="rounded-xl bg-white p-4 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
          >
            <option value="nama_asc">Nama A-Z</option>
            <option value="nama_desc">Nama Z-A</option>
            <option value="sinta_asc">SINTA tertinggi</option>
            <option value="sinta_desc">SINTA terendah</option>
            <option value="terbaru">Terbaru</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSearchAction}
            className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Cari Jurnal
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {favoriteError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          {favoriteError}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/20 dark:bg-white/10">
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-200">
            Gagal memuat data jurnal
          </h2>
          <p className="mt-2 text-red-600 dark:text-red-200">
            {error}
          </p>
        </div>
      )}

      {!error && (
        <>
          <div className="mb-5 flex flex-col gap-3 text-sm font-semibold text-slate-700 dark:text-gray-200 md:flex-row md:items-center md:justify-between">
            <p>
              Menampilkan {fromItem}-{toItem} dari {filteredCount} jurnal
            </p>
            <p>
              Halaman {currentPage} dari {totalPages}
            </p>
          </div>

          {loading ? (
            <JournalSkeleton />
          ) : (
            <div className="grid gap-5">
              {journals.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
                  <h2 className="text-2xl font-bold">
                    Jurnal tidak ditemukan
                  </h2>
                </div>
              )}

              {journals.map((journal) => (
                <div
                  key={journal.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10"
                >
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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

                  <div className="grid gap-4 text-slate-600 dark:text-gray-300 md:grid-cols-3">
                    <p>ISSN: {journal.issn ?? "-"}</p>
                    <p>Bidang: {journal.bidang ?? "-"}</p>
                    <p>Terbit: {journal.jadwal ?? "-"}</p>
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
                      onClick={() => toggleFavorite(journal.id)}
                      disabled={favoriteLoadingId === String(journal.id)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                    >
                      <FavoriteIcon saved={favoriteIds.includes(String(journal.id))} />
                      {favoriteLoadingId === String(journal.id)
                        ? "Memproses..."
                        : favoriteIds.includes(String(journal.id))
                          ? "Tersimpan"
                          : "Simpan Favorit"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/10 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1 || loading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Previous
            </button>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter((page) => (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                ))
                .map((page, index, pages) => {
                  const previousPage = pages[index - 1];
                  const showGap = previousPage && page - previousPage > 1;

                  return (
                    <div key={page} className="flex items-center gap-2">
                      {showGap && (
                        <span className="text-slate-500 dark:text-gray-400">
                          ...
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        disabled={loading}
                        className={`h-10 min-w-10 rounded-xl px-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          page === currentPage
                            ? "bg-blue-600 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages || loading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Next
            </button>
          </div>
        </>
      )}
    </DashboardPageShell>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function JournalSkeleton() {
  return (
    <div className="grid gap-5">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10"
        >
          <div className="animate-pulse">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="w-full max-w-xl">
                <div className="h-7 w-3/4 rounded-lg bg-slate-200 dark:bg-white/10" />
                <div className="mt-3 h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-white/10" />
              </div>
              <div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-4 rounded-lg bg-slate-200 dark:bg-white/10" />
              <div className="h-4 rounded-lg bg-slate-200 dark:bg-white/10" />
              <div className="h-4 rounded-lg bg-slate-200 dark:bg-white/10" />
            </div>
            <div className="mt-5 flex gap-3">
              <div className="h-11 w-28 rounded-xl bg-slate-200 dark:bg-white/10" />
              <div className="h-11 w-36 rounded-xl bg-slate-200 dark:bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
