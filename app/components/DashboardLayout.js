"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  Clock3,
  Heart,
  LayoutDashboard,
  Menu,
  Search,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";

const commonMenus = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Cari Jurnal", href: "/jurnal", icon: Search },
  { label: "Rekomendasi AI", href: "/rekomendasi", icon: BrainCircuit },
  { label: "Favorit", href: "/favorit", icon: Heart },
  { label: "Riwayat", href: "/riwayat", icon: Clock3 },
  { label: "Profil", href: "/profil", icon: User },
];

const roleMenus = {
  admin: [
    { label: "Kelola User", href: "/admin/users", icon: Users },
    { label: "Kelola Jurnal", href: "/admin/journals", icon: BookOpen },
    { label: "Statistik", href: "/admin/statistik", icon: BarChart3 },
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

function initials(value) {
  return String(value || "SINTA")
    .split("@")[0]
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SA";
}

export default function DashboardLayout({ role, title, userEmail, children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const normalizedRole = normalizeRole(role);
  const menus = [
    { ...commonMenus[0], href: roleDashboardPaths[normalizedRole] ?? "/dashboard" },
    ...commonMenus.slice(1),
    ...(roleMenus[normalizedRole] ?? []),
  ];

  function isActive(href) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-[#070b18] dark:text-white">
      <div className="min-h-screen md:grid md:grid-cols-[18rem_1fr]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform overflow-y-auto border-r border-white/10 bg-[radial-gradient(circle_at_top_left,#2563eb_0,#111827_36%,#020617_100%)] px-5 py-6 text-white shadow-2xl transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="group flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur transition group-hover:scale-105">
                <Shield size={22} />
              </div>
              <div>
                <p className="text-lg font-black leading-tight">SINTA Journal</p>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">AI Platform</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 md:hidden"
              aria-label="Tutup menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-7 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-inner backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">
                {initials(userEmail)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Role aktif</p>
                <p className="font-bold capitalize">{role}</p>
                {userEmail && <p className="truncate text-xs text-white/65">{userEmail}</p>}
              </div>
            </div>
          </div>

          <nav className="mt-7 grid gap-2">
            {menus.map((menu) => {
              const Icon = menu.icon;
              const active = isActive(menu.href);

              return (
                <Link
                  key={menu.label}
                  href={menu.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition duration-200 ${
                    active
                      ? "bg-white text-slate-950 shadow-lg shadow-blue-950/20"
                      : "text-white/75 hover:translate-x-1 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={19} className={active ? "text-blue-600" : "text-white/70 group-hover:text-white"} />
                  {menu.label}
                </Link>
              );
            })}
            <LogoutButton />
          </nav>
        </aside>

        {mobileOpen && (
          <button
            type="button"
            aria-label="Tutup overlay menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm md:hidden"
          />
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 md:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 md:hidden"
                  aria-label="Buka menu"
                >
                  <Menu size={20} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                    {role}
                  </p>
                  <h1 className="truncate text-2xl font-black tracking-tight md:text-4xl">
                    {title}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle variant="inline" />
                <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-sm dark:bg-white dark:text-slate-950 sm:flex">
                  {initials(userEmail)}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 md:p-8 lg:p-10">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
