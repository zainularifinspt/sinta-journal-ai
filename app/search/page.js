"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import SintaBadge from "../components/SintaBadge";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 10;
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

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageLoading() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <PublicSearchHeader />
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
          <p className="font-semibold text-slate-700 dark:text-gray-200">
            Memuat halaman...
          </p>
        </div>
      </section>
    </main>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [journals, setJournals] = useState([]);
  
  const initialSearch = searchParams.get("search") || "";
  console.log("Search param:", initialSearch);
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  console.log("Search term:", searchTerm);
  
  const [selectedSinta, setSelectedSinta] = useState("Semua SINTA");
  const [selectedBidang, setSelectedBidang] = useState("Semua Bidang");
  const [selectedPublisher, setSelectedPublisher] = useState("Semua Publisher");
  const [sortBy, setSortBy] = useState("nama_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJournals, setTotalJournals] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [bidangOptions, setBidangOptions] = useState([]);
  const [publisherOptions, setPublisherOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [error, setError] = useState("");

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const fromItem = filteredCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const toItem = Math.min(currentPage * PAGE_SIZE, filteredCount);

  // Sync searchTerm dengan URL parameter saat URL berubah
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch && urlSearch !== searchTerm) {
      console.log("Updating searchTerm from URL:", urlSearch);
      setSearchTerm(urlSearch);
      setCurrentPage(1);
    }
  }, [searchParams.get("search")]);

  useEffect(() => {
    let isActive = true;

    async function fetchMetadata() {
      const [
        { data: metadataData, error: metadataError, count },
      ] = await Promise.all([
        supabase
          .from("journals")
          .select("bidang, publisher", { count: "exact" })
          .order("bidang", { ascending: true })
          .limit(5000),
      ]);

      if (!isActive) {
        return;
      }

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

      setMetadataLoading(false);
    }

    fetchMetadata();

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

  function handleSearchAction() {
    const query = searchTerm.trim();

    router.replace(query ? `/search?search=${encodeURIComponent(query)}` : "/search");
    setCurrentPage(1);
  }

  function resetFilters() {
    setSearchTerm("");
    setSelectedSinta("Semua SINTA");
    setSelectedBidang("Semua Bidang");
    setSelectedPublisher("Semua Publisher");
    setSortBy("nama_asc");
    setCurrentPage(1);
    router.replace("/search");
  }

  function updateFilter(setter, value) {
    setter(value);
    setCurrentPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <PublicSearchHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
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

      <div className="sticky top-24 z-10 mb-8 rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20 md:p-6">
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
                  className="group rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-white/10 dark:bg-white/10 dark:hover:shadow-black/20"
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
                      href={`/search/${journal.id}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 font-semibold text-white dark:bg-white dark:text-slate-950"
                    >
                      Lihat Detail
                    </Link>
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
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
