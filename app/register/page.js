"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("dosen");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      toast.error("Register gagal", { description: signUpError.message });
      setLoading(false);
      return;
    }

    const user = signUpData.user;

    if (!user) {
      setError("Registrasi berhasil, tetapi data user belum tersedia. Silakan cek email konfirmasi.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      email,
      full_name: fullName,
      role,
    });

    if (profileError) {
      setError(profileError.message);
      toast.error("Register gagal", { description: profileError.message });
      setLoading(false);
      return;
    }

    setSuccess("Registrasi berhasil. Silakan login dengan akun baru Anda.");
    toast.success("Registrasi berhasil", { description: "Silakan login dengan akun baru Anda." });
    setLoading(false);
    window.setTimeout(() => {
      router.push("/login");
    }, 900);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_34%,#e0f2fe_100%)] px-6 py-10 text-slate-950 transition-colors dark:bg-[radial-gradient(circle_at_top_left,#1d4ed8_0,#0f172a_38%,#020617_100%)] dark:text-white">
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-2xl shadow-blue-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
          <Sparkles size={26} />
        </div>
        <h1 className="text-3xl font-black text-center mb-2">
          Register
        </h1>

        <p className="text-slate-600 text-center mb-8 dark:text-gray-300">
          Buat akun SINTA Journal AI
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="relative block">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nama lengkap"
              required
              className="w-full rounded-2xl bg-white py-4 pl-12 pr-4 text-black outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 dark:ring-0"
            />
          </label>

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
              minLength={6}
              className="w-full rounded-2xl bg-white py-4 pl-12 pr-12 text-black outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 dark:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-950"
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </label>

          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-2xl bg-white p-4 text-black outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 dark:ring-0"
          >
            <option value="dosen">Dosen</option>
            <option value="mahasiswa">Mahasiswa</option>
          </select>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? "Mendaftarkan..." : "Daftar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-gray-300">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
