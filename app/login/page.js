"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
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
  const [showPassword, setShowPassword] = useState(false);
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
      toast.error("Login gagal", { description: loginError.message });
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
      toast.error("Login gagal", { description: profileError?.message ?? "Role pengguna tidak ditemukan." });
      setLoading(false);
      return;
    }

    toast.success("Login berhasil", { description: "Mengalihkan ke dashboard." });
    router.push(dashboardRoutes[profile.role] ?? "/login");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_34%,#e0f2fe_100%)] px-6 py-10 text-slate-950 transition-colors dark:bg-[radial-gradient(circle_at_top_left,#1d4ed8_0,#0f172a_38%,#020617_100%)] dark:text-white">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/70 to-transparent dark:from-white/10" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-2xl shadow-blue-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
          <Sparkles size={26} />
        </div>
        <h1 className="text-center text-3xl font-black tracking-tight">
          Login
        </h1>

        <p className="text-slate-600 text-center mb-8 dark:text-gray-300">
          Masuk ke SINTA Journal AI
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="relative block">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-2xl bg-white py-4 pl-12 pr-4 text-black outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 dark:ring-0"
            />
          </label>

          <label className="relative block">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              className="w-full rounded-2xl bg-white py-4 pl-12 pr-12 text-black outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 dark:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-950"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
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
