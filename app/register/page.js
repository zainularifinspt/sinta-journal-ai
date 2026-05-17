"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setLoading(false);
      return;
    }

    setSuccess("Registrasi berhasil. Silakan login dengan akun baru Anda.");
    setLoading(false);
    window.setTimeout(() => {
      router.push("/login");
    }, 900);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-100 text-slate-950 flex items-center justify-center px-6 py-10 transition-colors dark:from-blue-950 dark:via-slate-900 dark:to-black dark:text-white">
      <div className="w-full max-w-md bg-white/85 backdrop-blur-lg border border-slate-200 rounded-3xl p-8 shadow-2xl dark:bg-white/10 dark:border-white/10">
        <h1 className="text-3xl font-bold text-center mb-2">
          Register
        </h1>

        <p className="text-slate-600 text-center mb-8 dark:text-gray-300">
          Buat akun SINTA Journal AI
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Nama lengkap"
            required
            className="w-full p-4 rounded-xl bg-white text-black outline-none ring-1 ring-slate-200 dark:ring-0"
          />

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
            minLength={6}
            className="w-full p-4 rounded-xl bg-white text-black outline-none ring-1 ring-slate-200 dark:ring-0"
          />

          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full p-4 rounded-xl bg-white text-black outline-none ring-1 ring-slate-200 dark:ring-0"
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
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold text-white transition disabled:cursor-not-allowed disabled:bg-blue-400"
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
