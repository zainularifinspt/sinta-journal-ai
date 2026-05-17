"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProtectedPage({ allowedRoles = [], children }) {
  const router = useRouter();
  const rolesKey = allowedRoles.join("|");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deniedMessage, setDeniedMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    const permittedRoles = rolesKey.split("|").filter(Boolean);

    async function checkAccess() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!isActive) {
        return;
      }

      if (sessionError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      if (profileError || !profileData?.role) {
        setDeniedMessage(profileError?.message ?? "Role pengguna tidak ditemukan.");
        setLoading(false);
        return;
      }

      if (!permittedRoles.includes(profileData.role)) {
        setDeniedMessage("Role Anda tidak memiliki izin untuk membuka halaman ini.");
        setLoading(false);
        return;
      }

      setProfile({
        id: user.id,
        email: profileData.email ?? user.email ?? "",
        full_name: profileData.full_name ?? "",
        role: profileData.role,
      });
      setLoading(false);
    }

    checkAccess();

    return () => {
      isActive = false;
    };
  }, [rolesKey, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 font-semibold shadow-sm dark:border-white/10 dark:bg-white/10">
          Memeriksa akses halaman...
        </div>
      </main>
    );
  }

  if (deniedMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
        <section className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-500/20 dark:bg-white/10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
            Akses Ditolak
          </p>
          <h1 className="text-3xl font-bold text-red-700 dark:text-red-200">
            Akses Ditolak
          </h1>
          <p className="mt-3 text-slate-600 dark:text-gray-300">
            {deniedMessage}
          </p>
        </section>
      </main>
    );
  }

  return typeof children === "function" ? children(profile) : children;
}
