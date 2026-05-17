"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

const fixedClasses =
  "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-900 shadow-lg transition hover:scale-105 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800";

const inlineClasses =
  "flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-900 shadow-sm transition hover:scale-105 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800";

const dashboardLayoutPaths = [
  "/admin",
  "/dashboard",
  "/favorit",
  "/jurnal",
  "/profil",
  "/rekomendasi",
  "/riwayat",
];

export default function ThemeToggle({ hideOnDashboard = false, variant = "fixed" }) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const isDark = theme === "dark";

  if (
    hideOnDashboard &&
    dashboardLayoutPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Aktifkan light mode" : "Aktifkan dark mode"}
      title={isDark ? "Aktifkan light mode" : "Aktifkan dark mode"}
      suppressHydrationWarning
      className={variant === "inline" ? inlineClasses : fixedClasses}
    >
      <span aria-hidden="true" suppressHydrationWarning>
        {isDark ? "☀" : "☾"}
      </span>
    </button>
  );
}
