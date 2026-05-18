const badgeClasses = {
  "SINTA 1": "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100",
  "SINTA 2": "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-100",
  "SINTA 3": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100",
  "SINTA 4": "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/15 dark:text-orange-100",
  "SINTA 5": "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-100",
  "SINTA 6": "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-500/15 dark:text-slate-100",
};

export function normalizeSinta(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  const match = normalized.match(/^(?:SINTA\s*)?([1-6])$/);

  return match ? `SINTA ${match[1]}` : normalized || "SINTA -";
}

export default function SintaBadge({ value, className = "" }) {
  const label = normalizeSinta(value);

  return (
    <span
      className={`inline-flex w-fit min-w-[72px] shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-center text-xs font-bold leading-none ${
        badgeClasses[label] ?? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-500/15 dark:text-slate-100"
      } ${className}`}
    >
      {label}
    </span>
  );
}
