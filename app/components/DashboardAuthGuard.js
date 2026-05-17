"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const dashboardRoutes = {
  admin: "/dashboard/admin",
  dosen: "/dashboard/dosen",
  mahasiswa: "/dashboard/mahasiswa",
};

export default function DashboardAuthGuard({ requiredRole, children }) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function checkAccess() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!isActive) {
        return;
      }

      if (sessionError || !session?.user) {
        router.replace("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", session.user.id)
        .single();

      if (!isActive) {
        return;
      }

      if (profileError || !profileData) {
        setError(profileError?.message ?? "Profil pengguna tidak ditemukan.");
        setLoading(false);
        return;
      }

      if (profileData.role !== requiredRole) {
        router.replace(dashboardRoutes[profileData.role] ?? "/login");
        return;
      }

      setProfile(profileData);
      setLoading(false);
    }

    checkAccess();

    return () => {
      isActive = false;
    };
  }, [requiredRole, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 font-semibold shadow-sm dark:border-white/10 dark:bg-white/10">
          Memeriksa akses dashboard...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/20 dark:bg-white/10">
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-200">
            Akses ditolak
          </h1>
          <p className="mt-3 text-red-600 dark:text-red-200">
            {error}
          </p>
        </div>
      </main>
    );
  }

  return children(profile);
}
