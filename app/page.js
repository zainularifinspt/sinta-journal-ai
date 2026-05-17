"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const features = [
  {
    href: "/jurnal",
    icon: "S1",
    title: "Cek Peringkat SINTA",
    description: "Temukan jurnal SINTA 1 sampai SINTA 6 dengan filter cepat dan tampilan detail yang mudah dibandingkan.",
  },
  {
    href: "/rekomendasi",
    icon: "AI",
    title: "Rekomendasi Jurnal",
    description: "Masukkan judul, abstrak, dan kata kunci untuk mendapatkan rekomendasi jurnal yang lebih relevan.",
  },
  {
    href: "/jurnal",
    icon: "JT",
    title: "Jadwal Terbit",
    description: "Lihat informasi publisher, jadwal, scope, ISSN, dan website jurnal dalam satu tampilan.",
  },
  {
    href: "/favorit",
    icon: "FR",
    title: "Favorit & Riwayat",
    description: "Simpan jurnal penting dan pantau riwayat rekomendasi untuk proses publikasi yang lebih tertata.",
  },
  {
    href: "/admin/journals",
    icon: "XL",
    title: "Import Excel",
    description: "Admin dapat mengelola data jurnal dengan import Excel, edit data, dan import manual dari URL SINTA.",
  },
  {
    href: "/dashboard/admin",
    icon: "DB",
    title: "Dashboard Admin",
    description: "Pantau statistik user, jurnal, favorit, rekomendasi, publisher, dan aktivitas terbaru secara ringkas.",
  },
];

const steps = [
  "Cari jurnal",
  "Bandingkan informasi",
  "Simpan favorit",
  "Dapatkan rekomendasi",
];

const stats = [
  ["1000+", "Data Jurnal"],
  ["6", "Level SINTA"],
  ["AI", "Recommendation"],
  ["Supabase", "Database"],
];

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
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_30%,#ecfeff_62%,#f8fafc_100%)] text-slate-950 transition-colors dark:bg-[radial-gradient(circle_at_top_left,#1d4ed8_0,#0f172a_34%,#020617_100%)] dark:text-white">
      <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 font-black text-white shadow-lg shadow-blue-600/25">
              SA
            </div>
            <div>
              <p className="text-lg font-black leading-tight tracking-tight">SINTA Journal AI</p>
              <p className="hidden text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-gray-400 sm:block">
                Research Platform
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-2xl px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-white/10"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="hidden rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-blue-600 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-100 sm:inline-flex"
            >
              Mulai Sekarang
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="absolute right-[-8rem] top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl dark:bg-blue-400/15" />
        <div className="absolute bottom-10 left-[-8rem] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-300/10" />

        <div className="relative">
          <div className="mb-6 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 shadow-sm dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
            AI-powered Journal Finder
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
            Temukan jurnal SINTA yang tepat, lebih cepat, dan lebih percaya diri.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 dark:text-gray-300 md:text-xl">
            Platform pencarian dan rekomendasi jurnal berbasis AI untuk dosen, mahasiswa, dan admin kampus. Cari, bandingkan, simpan, dan kelola data jurnal dalam satu workflow modern.
          </p>

          <div className="mt-9 flex max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/90 p-2 shadow-2xl shadow-blue-950/10 backdrop-blur dark:border-white/10 dark:bg-white/10 md:flex-row">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Cari nama jurnal, ISSN, publisher, atau bidang..."
              className="min-h-14 flex-1 rounded-2xl bg-transparent px-5 text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
            />
            <button
              type="button"
              onClick={goToSearch}
              className="min-h-14 rounded-2xl bg-blue-600 px-8 font-black text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Cari Jurnal
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-500 dark:text-gray-400">
            <span>Realtime search</span>
            <span>•</span>
            <span>Favorit tersimpan</span>
            <span>•</span>
            <span>Dashboard role-based</span>
          </div>
        </div>

        <HeroMockup />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">Fitur Utama</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Semua kebutuhan pencarian jurnal dalam satu platform.</h2>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur dark:border-white/10 dark:bg-white/10 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">Cara Kerja</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Workflow publikasi yang lebih rapi.</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 font-black text-white">
                  {index + 1}
                </div>
                <h3 className="text-xl font-black">{step}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-300">
                  {index === 0 && "Gunakan search dan filter untuk menemukan jurnal sesuai topik."}
                  {index === 1 && "Bandingkan SINTA, publisher, ISSN, website, scope, dan jadwal terbit."}
                  {index === 2 && "Simpan jurnal penting ke favorit agar mudah diakses kembali."}
                  {index === 3 && "Gunakan AI untuk mendapatkan kandidat jurnal berdasarkan naskah."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-4 md:px-8">
        {stats.map(([value, label]) => (
          <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-6 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
            <p className="text-3xl font-black text-blue-600 dark:text-blue-300">{value}</p>
            <p className="mt-2 font-bold text-slate-600 dark:text-gray-300">{label}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="rounded-[2.25rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/20 dark:bg-white dark:text-slate-950 md:p-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-300 dark:text-blue-600">Mulai Sekarang</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight md:text-5xl">
                Mulai kelola pencarian jurnal Anda sekarang.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700">
                Login
              </Link>
              <Link href="/jurnal" className="rounded-2xl bg-white px-6 py-4 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-blue-50 dark:bg-slate-950 dark:text-white">
                Cari Jurnal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/70 px-5 py-8 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-gray-400">
        <p>SINTA Journal AI © 2026. Built for smarter research workflows.</p>
      </footer>
    </main>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-[2.5rem] bg-blue-500/20 blur-3xl" />
      <div className="relative rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-2xl shadow-blue-950/15 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue-200">Dashboard Preview</p>
              <h3 className="text-2xl font-black">Journal Intelligence</h3>
            </div>
            <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-black text-emerald-200">Live</div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <MiniStat label="Jurnal" value="1.2K" />
            <MiniStat label="Favorit" value="284" />
            <MiniStat label="AI Match" value="92%" />
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-black">Top Matches</p>
              <p className="text-sm text-white/60">Updated now</p>
            </div>
            <JournalPreview title="Jurnal Pendidikan Matematika" sinta="SINTA 1" color="bg-emerald-500" />
            <JournalPreview title="Jurnal Teknologi Pembelajaran" sinta="SINTA 2" color="bg-blue-500" />
            <JournalPreview title="Jurnal Statistika Terapan" sinta="SINTA 3" color="bg-yellow-400 text-slate-950" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-white/60">{label}</p>
    </div>
  );
}

function JournalPreview({ title, sinta, color }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white/10 p-3 last:mb-0">
      <p className="min-w-0 truncate font-bold">{title}</p>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black text-white ${color}`}>{sinta}</span>
    </div>
  );
}

function FeatureCard({ href, icon, title, description }) {
  return (
    <Link
      href={href}
      className="group block rounded-[1.5rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-950/10 dark:border-white/10 dark:bg-white/10"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white transition group-hover:bg-blue-600 dark:bg-white dark:text-slate-950 dark:group-hover:bg-blue-100">
        {icon}
      </div>
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600 dark:text-gray-300">{description}</p>
    </Link>
  );
}
