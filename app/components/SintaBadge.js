const badgeClasses = {
  "SINTA 1": "bg-emerald-600 text-white",
  "SINTA 2": "bg-blue-600 text-white",
  "SINTA 3": "bg-yellow-400 text-slate-950",
  "SINTA 4": "bg-orange-500 text-white",
  "SINTA 5": "bg-red-600 text-white",
  "SINTA 6": "bg-slate-500 text-white",
};

export default function SintaBadge({ value, className = "" }) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full px-4 py-2 text-sm font-bold ${
        badgeClasses[value] ?? "bg-slate-600 text-white"
      } ${className}`}
    >
      {value ?? "SINTA -"}
    </span>
  );
}
