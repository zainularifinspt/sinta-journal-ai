"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const dashboardRoutes = {
  admin: "/dashboard/admin",
  dosen: "/dashboard/dosen",
  mahasiswa: "/dashboard/mahasiswa",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", loginData.user.id)
      .single();

    if (profileError || !profile?.role) {
      setError(profileError?.message ?? "Role pengguna tidak ditemukan.");
      setLoading(false);
      return;
    }

    router.push(dashboardRoutes[profile.role] ?? "/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-100 text-slate-950 flex items-center justify-center px-6 transition-colors dark:from-blue-950 dark:via-slate-900 dark:to-black dark:text-white">
      <div className="w-full max-w-md bg-white/85 backdrop-blur-lg border border-slate-200 rounded-3xl p-8 shadow-2xl dark:bg-white/10 dark:border-white/10">
        <h1 className="text-3xl font-bold text-center mb-2">
          Login
        </h1>

        <p className="text-slate-600 text-center mb-8 dark:text-gray-300">
          Masuk ke SINTA Journal AI
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            className="w-full p-4 rounded-xl bg-white text-black outline-none ring-1 ring-slate-200 dark:ring-0"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            className="w-full p-4 rounded-xl bg-white text-black outline-none ring-1 ring-slate-200 dark:ring-0"
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold text-white transition disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-gray-300">
          Belum punya akun?{" "}
          <Link href="/register" className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Daftar
          </Link>
        </p>
      </div>
    </main>
  );
}
