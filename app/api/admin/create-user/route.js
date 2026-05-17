import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const allowedRoles = ["dosen", "mahasiswa"];

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

export async function POST(request) {
  try {
    const { authClient, adminClient } = createSupabaseClients();
    const isAdmin = await verifyAdmin(request, authClient, adminClient);

    if (!isAdmin) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const fullName = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "");

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: "Nama lengkap, email, dan password wajib diisi." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password sementara minimal 8 karakter." }, { status: 400 });
    }

    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Role hanya boleh dosen atau mahasiswa." }, { status: 400 });
    }

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const authUser = createdUser.user;
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "User Auth berhasil dibuat, tetapi ID user tidak tersedia." }, { status: 500 });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          role,
        },
        { onConflict: "id" }
      )
      .select("id, email, full_name, role, created_at")
      .single();

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    if (!profile?.id) {
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Profile user gagal disimpan." }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: userId,
        email: authUser.email ?? email,
      },
      profile,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message ?? "Gagal menambahkan user." }, { status: 500 });
  }
}
