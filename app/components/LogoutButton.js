"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="block w-full whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200 md:text-base"
    >
      {loading ? "Keluar..." : "Logout"}
    </button>
  );
}
