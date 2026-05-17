import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const allowedRoles = ["admin", "dosen", "mahasiswa"];

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length);
}

function createSupabaseClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Supabase server environment variables are not configured.");
  }

  return {
    authClient: createClient(supabaseUrl, supabaseAnonKey),
    adminClient: createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  };
}

async function verifyAdmin(request, authClient, adminClient) {
  const token = getBearerToken(request);

  if (!token) {
    return false;
  }

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const userId = userData?.user?.id;

  if (userError || !userId) {
    return false;
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return !profileError && profile?.role === "admin";
}

export async function PATCH(request) {
  try {
    const { authClient, adminClient } = createSupabaseClients();
    const isAdmin = await verifyAdmin(request, authClient, adminClient);

    if (!isAdmin) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const userId = String(body.userId ?? "").trim();
    const role = String(body.role ?? "").trim();

    if (!userId || !allowedRoles.includes(role)) {
      return NextResponse.json({ error: "User dan role valid wajib diisi." }, { status: 400 });
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      user: {
        id: userId,
        role,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message ?? "Gagal mengubah role user." }, { status: 500 });
  }
}
