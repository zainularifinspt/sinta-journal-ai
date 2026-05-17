export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-100 text-slate-950 transition-colors dark:from-blue-950 dark:via-slate-900 dark:to-black dark:text-white">

      {/* Navbar */}
      <nav className="flex justify-between items-center px-10 py-5 border-b border-slate-200/80 dark:border-white/10">

        <h1 className="text-2xl font-bold tracking-wide">
          SINTA Journal AI
        </h1>

        <button className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl font-semibold text-white transition">
          Login
        </button>

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
              placeholder="Cari nama jurnal, ISSN, atau bidang..."
              className="flex-1 p-5 text-black outline-none text-lg"
            />

            <button className="bg-blue-600 hover:bg-blue-700 px-10 text-white font-semibold transition">
              Cari
            </button>

          </div>

        </div>

      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8 px-10 pb-20">

        {/* Card 1 */}
        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl border border-slate-200 shadow-sm hover:scale-105 transition dark:bg-white/10 dark:border-white/10">

          <h3 className="text-2xl font-bold mb-4">
            Cek Peringkat SINTA
          </h3>

          <p className="text-slate-600 dark:text-gray-300">
            Lihat informasi lengkap jurnal mulai dari
            SINTA 1 sampai SINTA 6 secara cepat.
          </p>

        </div>

        {/* Card 2 */}
        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl border border-slate-200 shadow-sm hover:scale-105 transition dark:bg-white/10 dark:border-white/10">

          <h3 className="text-2xl font-bold mb-4">
            AI Recommendation
          </h3>

          <p className="text-slate-600 dark:text-gray-300">
            AI membantu merekomendasikan jurnal yang cocok
            berdasarkan judul atau abstrak artikel.
          </p>

        </div>

        {/* Card 3 */}
        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl border border-slate-200 shadow-sm hover:scale-105 transition dark:bg-white/10 dark:border-white/10">

          <h3 className="text-2xl font-bold mb-4">
            Jadwal Terbit
          </h3>

          <p className="text-slate-600 dark:text-gray-300">
            Temukan informasi publication frequency dan
            waktu terbit jurnal secara otomatis.
          </p>

        </div>

      </section>

    </main>
  );
}
