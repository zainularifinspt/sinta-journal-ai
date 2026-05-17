import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { buildRecommendations } from "@/lib/recommendation";

const MAX_CANDIDATES = 30;
const MAX_RESULTS = 5;
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";
const GEMINI_QUOTA_MESSAGE =
  "Kuota Gemini API habis atau belum aktif. Sistem menggunakan rekomendasi lokal.";

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getScoreLabel(score) {
  if (score >= 80) {
    return "Sangat Cocok";
  }

  if (score >= 55) {
    return "Cocok";
  }

  return "Kurang Cocok";
}

function getGeminiErrorDetails(error) {
  const message = error?.message ?? "Layanan Gemini tidak dapat digunakan.";
  const status = error?.status ?? error?.statusCode ?? error?.response?.status ?? null;
  const isQuotaError = status === 429 || message.toLowerCase().includes("quota");

  if (isQuotaError) {
    return {
      message: GEMINI_QUOTA_MESSAGE,
      status,
    };
  }

  return {
    message: "AI online belum tersedia. Sistem menggunakan rekomendasi lokal.",
    status,
  };
}

function extractJsonObject(text) {
  const rawText = String(text ?? "").trim();

  if (!rawText) {
    throw new Error("Gemini tidak mengembalikan teks response.");
  }

  try {
    return JSON.parse(rawText);
  } catch {
    const fencedJson = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidateText = fencedJson?.[1] ?? rawText;
    const startIndex = candidateText.indexOf("{");
    const endIndex = candidateText.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error("Response Gemini tidak berisi JSON valid.");
    }

    return JSON.parse(candidateText.slice(startIndex, endIndex + 1));
  }
}

function toLocalFallbackRecommendations(text, journals, aiError = "") {
  const localRecommendations = buildRecommendations(text, journals, MAX_RESULTS);

  return {
    recommendations: localRecommendations.map((item) => ({
      journal_id: item.journal.id,
      nama: item.journal.nama,
      sinta: item.journal.sinta,
      score: item.score,
      alasan: item.reason,
      saran: "Periksa kembali focus and scope, template artikel, dan ketentuan author sebelum submit.",
      journal: item.journal,
      reason: item.reason,
      scoreLabel: item.scoreLabel,
      matchedKeywords: item.matchedKeywords,
      isFallback: true,
    })),
    summary: "Rekomendasi dibuat dengan engine lokal karena layanan AI tidak tersedia.",
    source: "local",
    ai_error: aiError,
  };
}

function normalizeAiRecommendations(aiRecommendations, candidates) {
  const candidateMap = new Map(candidates.map((journal) => [String(journal.id), journal]));

  return aiRecommendations
    .map((recommendation) => {
      const journal = candidateMap.get(String(recommendation.journal_id));

      if (!journal) {
        return null;
      }

      const score = Math.max(0, Math.min(100, Number(recommendation.score) || 0));
      const alasan = String(recommendation.alasan ?? "").trim();
      const saran = String(recommendation.saran ?? "").trim();

      return {
        journal_id: journal.id,
        nama: journal.nama,
        sinta: journal.sinta,
        score,
        alasan: alasan || "Jurnal ini memiliki kesesuaian topik dengan artikel yang dianalisis.",
        saran: saran || "Pastikan scope, template, dan panduan author sesuai sebelum submit.",
        journal,
        reason: alasan || "Jurnal ini memiliki kesesuaian topik dengan artikel yang dianalisis.",
        scoreLabel: getScoreLabel(score),
        matchedKeywords: [],
        isFallback: false,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_RESULTS);
}

async function generateGeminiRecommendations(gemini, model, payload) {
  console.log("[recommend-ai] Gemini model:", model);

  return gemini.models.generateContent({
    model,
    contents: JSON.stringify(payload),
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      systemInstruction:
        "Anda adalah asisten rekomendasi jurnal akademik. Nilai relevansi jurnal terhadap artikel penelitian secara realistis berdasarkan judul, abstrak, kata kunci, bidang, scope, catatan AI, nama jurnal, publisher, jadwal, dan SINTA. Pilih maksimal 5 jurnal paling relevan. Gunakan journal_id hanya dari kandidat_jurnal. Score harus 0-100. Balas hanya JSON valid tanpa markdown atau penjelasan tambahan.",
    },
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const judul = String(body.judul ?? "").trim();
    const abstrak = String(body.abstrak ?? "").trim();
    const kataKunci = String(body.kata_kunci ?? body.kataKunci ?? "").trim();
    const combinedText = `${judul} ${abstrak} ${kataKunci}`.trim();

    if (!combinedText) {
      return NextResponse.json(
        { error: "Judul, abstrak, atau kata kunci wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    const { data: journals, error: journalsError } = await supabase
      .from("journals")
      .select("id, nama, sinta, publisher, bidang, jadwal, scope, catatan_ai")
      .limit(5000);

    if (journalsError) {
      return NextResponse.json({ error: journalsError.message }, { status: 500 });
    }

    const allJournals = journals ?? [];
    const candidates = buildRecommendations(combinedText, allJournals, MAX_CANDIDATES).map(
      (item) => item.journal
    );

    if (candidates.length === 0) {
      return NextResponse.json({
        recommendations: [],
        summary: "Belum ada data jurnal yang dapat dianalisis.",
        source: "local",
      });
    }

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    console.log("[recommend-ai] GEMINI_API_KEY configured:", hasGeminiKey);

    if (!hasGeminiKey) {
      const missingKeyMessage = "GEMINI_API_KEY belum terbaca di server.";
      console.error("[recommend-ai] Gemini error:", missingKeyMessage);
      return NextResponse.json(toLocalFallbackRecommendations(combinedText, candidates, missingKeyMessage));
    }

    try {
      const gemini = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
      const geminiPayload = {
        artikel: {
          judul,
          abstrak,
          kata_kunci: kataKunci,
        },
        kandidat_jurnal: candidates.map((journal) => ({
          id: journal.id,
          nama: journal.nama,
          sinta: journal.sinta,
          publisher: journal.publisher,
          bidang: journal.bidang,
          jadwal: journal.jadwal,
          scope: journal.scope,
          catatan_ai: journal.catatan_ai,
        })),
        format_output: {
          summary: "string",
          recommendations: [
            {
              journal_id: "id kandidat jurnal",
              nama: "nama jurnal",
              sinta: "peringkat SINTA",
              score: "angka 0-100",
              alasan: "alasan singkat dalam Bahasa Indonesia",
              saran: "saran singkat dalam Bahasa Indonesia",
            },
          ],
        },
      };
      let response;

      try {
        response = await generateGeminiRecommendations(gemini, GEMINI_MODEL, geminiPayload);
      } catch (primaryModelError) {
        console.error(
          "[recommend-ai] Gemini primary model failed:",
          primaryModelError?.message ?? primaryModelError
        );
        response = await generateGeminiRecommendations(gemini, GEMINI_FALLBACK_MODEL, geminiPayload);
      }
      const parsed = extractJsonObject(response.text);
      const recommendations = normalizeAiRecommendations(parsed.recommendations ?? [], candidates);

      if (recommendations.length === 0) {
        return NextResponse.json(
          toLocalFallbackRecommendations(
            combinedText,
            candidates,
            "Gemini berhasil merespons, tetapi tidak mengembalikan rekomendasi yang cocok dengan kandidat jurnal."
          )
        );
      }

      return NextResponse.json({
        recommendations,
        summary: parsed.summary ?? "Rekomendasi AI berhasil dibuat.",
        source: "gemini",
      });
    } catch (geminiError) {
      const errorDetails = getGeminiErrorDetails(geminiError);
      console.error("[recommend-ai] Gemini error message:", errorDetails.message);
      console.error("[recommend-ai] Gemini error status:", errorDetails.status);
      return NextResponse.json(
        toLocalFallbackRecommendations(
          combinedText,
          candidates,
          errorDetails.status
            ? `${errorDetails.message} (status ${errorDetails.status})`
            : errorDetails.message
        )
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error.message ?? "Gagal membuat rekomendasi AI." },
      { status: 500 }
    );
  }
}
