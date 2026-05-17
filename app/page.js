"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  function goToSearch() {
    const query = searchTerm.trim();
    const target = query ? `/jurnal?search=${encodeURIComponent(query)}` : "/jurnal";

    router.push(target);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      goToSearch();
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-100 text-slate-950 transition-colors dark:from-blue-950 dark:via-slate-900 dark:to-black dark:text-white">

      {/* Navbar */}
      <nav className="flex justify-between items-center px-10 py-5 border-b border-slate-200/80 dark:border-white/10">

        <h1 className="text-2xl font-bold tracking-wide">
          SINTA Journal AI
        </h1>

        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl font-semibold text-white transition"
        >
          Login
        </Link>

      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24">

        <div className="max-w-4xl">

          <h2 className="text-6xl font-extrabold leading-tight mb-6">
            Temukan Jurnal
            <span className="text-blue-600 dark:text-blue-400"> SINTA </span>
            dengan Bantuan AI
          </h2>

          <p className="text-slate-600 text-xl mb-10 leading-relaxed dark:text-gray-300">
            Cari peringkat jurnal, publisher, jadwal terbit,
            rekomendasi publikasi, dan analisis jurnal otomatis
            menggunakan teknologi AI.
          </p>

          {/* Search Box */}
          <div className="flex bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl mx-auto ring-1 ring-slate-200 dark:ring-white/10">

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Cari nama jurnal, ISSN, atau bidang..."
              className="flex-1 p-5 text-black outline-none text-lg"
            />

            <button
              type="button"
              onClick={goToSearch}
              className="bg-blue-600 hover:bg-blue-700 px-10 text-white font-semibold transition"
            >
              Cari
            </button>

          </div>

        </div>

      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8 px-10 pb-20">

        <FeatureCard
          href="/jurnal"
          title="Cek Peringkat SINTA"
          description="Lihat informasi lengkap jurnal mulai dari SINTA 1 sampai SINTA 6 secara cepat."
        />

        <FeatureCard
          href="/rekomendasi"
          title="AI Recommendation"
          description="AI membantu merekomendasikan jurnal yang cocok berdasarkan judul atau abstrak artikel."
        />

        <FeatureCard
          href="/jurnal"
          title="Jadwal Terbit"
          description="Temukan informasi publication frequency dan waktu terbit jurnal secara otomatis."
        />

      </section>

    </main>
  );
}

function FeatureCard({ href, title, description }) {
  return (
    <Link
      href={href}
      className="block cursor-pointer bg-white/80 backdrop-blur-lg p-8 rounded-3xl border border-slate-200 shadow-sm hover:scale-105 hover:bg-white transition dark:bg-white/10 dark:border-white/10 dark:hover:bg-white/15"
    >
      <h3 className="text-2xl font-bold mb-4">
        {title}
      </h3>

      <p className="text-slate-600 dark:text-gray-300">
        {description}
      </p>
    </Link>
  );
}
