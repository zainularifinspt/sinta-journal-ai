import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    return { isAdmin: false, userId: null };
  }

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const userId = userData?.user?.id;

  if (userError || !userId) {
    return { isAdmin: false, userId: null };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return {
    isAdmin: !profileError && profile?.role === "admin",
    userId,
  };
}

export async function DELETE(request) {
  try {
    const { authClient, adminClient } = createSupabaseClients();
    const { isAdmin, userId: currentUserId } = await verifyAdmin(request, authClient, adminClient);

    if (!isAdmin) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const userId = String(body.userId ?? "").trim();

    if (!userId) {
      return NextResponse.json({ error: "User wajib dipilih." }, { status: 400 });
    }

    if (userId === currentUserId) {
      return NextResponse.json(
        { error: "Admin tidak boleh menghapus akunnya sendiri." },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (targetProfileError) {
      return NextResponse.json({ error: targetProfileError.message }, { status: 400 });
    }

    if (!targetProfile?.id) {
      return NextResponse.json({ error: "Profile user tidak ditemukan." }, { status: 404 });
    }

    if (targetProfile.role === "admin") {
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 400 });
      }

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Tidak bisa menghapus admin terakhir." },
          { status: 400 }
        );
      }
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });
    }

    const { error: deleteProfileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (deleteProfileError) {
      return NextResponse.json({ error: deleteProfileError.message }, { status: 400 });
    }

    return NextResponse.json({
      user: {
        id: userId,
      },
      message: "User berhasil dihapus.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message ?? "Gagal menghapus user." }, { status: 500 });
  }
}
