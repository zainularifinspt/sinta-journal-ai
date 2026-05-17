import DashboardLayout from "@/app/components/DashboardLayout";

export default function AdminUsersPage() {
  return (
    <DashboardLayout role="Admin" title="Kelola User">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-8">
        <h2 className="text-2xl font-bold">
          Kelola User
        </h2>
        <p className="mt-3 text-slate-600 dark:text-gray-300">
          Placeholder pengelolaan user. Modul ini siap dihubungkan ke autentikasi dan tabel user saat skema sudah ditentukan.
        </p>
      </section>
    </DashboardLayout>
  );
}
