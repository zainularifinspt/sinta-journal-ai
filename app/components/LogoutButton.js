"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
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
      className="group flex w-full items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-100 transition hover:translate-x-1 hover:bg-red-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut size={19} className="text-red-200 group-hover:text-white" />
      {loading ? "Keluar..." : "Logout"}
    </button>
  );
}
