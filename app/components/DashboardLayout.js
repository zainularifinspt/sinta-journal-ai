import Link from "next/link";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";

const commonMenus = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Cari Jurnal", href: "/jurnal" },
  { label: "Rekomendasi AI", href: "/rekomendasi" },
  { label: "Favorit", href: "/favorit" },
  { label: "Riwayat", href: "/riwayat" },
  { label: "Profil", href: "/profil" },
];

const roleMenus = {
  admin: [
    { label: "Kelola User", href: "/admin/users" },
    { label: "Kelola Jurnal", href: "/admin/journals" },
    { label: "Statistik", href: "/admin/statistik" },
  ],
  dosen: [],
  mahasiswa: [],
};

const roleDashboardPaths = {
  admin: "/dashboard/admin",
  dosen: "/dashboard/dosen",
  mahasiswa: "/dashboard/mahasiswa",
};

function normalizeRole(role) {
  return String(role).toLowerCase();
}

export default function DashboardLayout({ role, title, userEmail, children }) {
  const normalizedRole = normalizeRole(role);
  const menus = [
    { ...commonMenus[0], href: roleDashboardPaths[normalizedRole] ?? "/dashboard" },
    ...commonMenus.slice(1),
    ...(roleMenus[normalizedRole] ?? []),
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-slate-900 md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r md:px-6 md:py-8">
          <div className="flex items-center justify-between gap-4 md:block">
            <Link href="/" className="block text-xl font-bold leading-tight md:text-2xl">
              SINTA Journal AI
            </Link>

            <div className="md:hidden">
              <ThemeToggle variant="inline" />
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 dark:bg-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
              Role aktif
            </p>
            <p className="mt-1 font-bold capitalize">
              {role}
            </p>
            {userEmail && (
              <p className="mt-1 truncate text-sm text-slate-500 dark:text-gray-400">
                {userEmail}
              </p>
            )}
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 md:mt-8 md:block md:space-y-2 md:overflow-visible md:pb-0">
            {menus.map((menu) => (
              <Link
                key={menu.label}
                href={menu.href}
                className="block whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white md:text-base"
              >
                {menu.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-5 backdrop-blur dark:border-white/10 dark:bg-slate-900/80 md:px-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {role}
              </p>
              <h1 className="text-2xl font-bold md:text-4xl">
                {title}
              </h1>
            </div>

            <div className="hidden md:block">
              <ThemeToggle variant="inline" />
            </div>
          </header>

          <div className="flex-1 p-6 md:p-10">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
