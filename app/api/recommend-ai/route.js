import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { buildRecommendations } from "@/lib/recommendation";

const MAX_CANDIDATES = 30;
const MAX_RESULTS = 5;

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

function toLocalFallbackRecommendations(text, journals) {
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(toLocalFallbackRecommendations(combinedText, candidates));
    }

    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const response = await openai.responses.create({
        model: "gpt-5-nano",
        input: [
          {
            role: "system",
            content:
              "Anda adalah asisten rekomendasi jurnal akademik. Nilai relevansi jurnal terhadap artikel penelitian secara realistis berdasarkan judul, abstrak, kata kunci, bidang, scope, catatan AI, nama jurnal, publisher, jadwal, dan SINTA. Balas hanya JSON valid sesuai schema.",
          },
          {
            role: "user",
            content: JSON.stringify({
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
              instruksi:
                "Pilih maksimal 5 jurnal paling relevan. Gunakan journal_id hanya dari kandidat_jurnal. Score 0-100. Alasan dan saran ditulis singkat dalam Bahasa Indonesia.",
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "journal_recommendations",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["recommendations", "summary"],
              properties: {
                recommendations: {
                  type: "array",
                  maxItems: MAX_RESULTS,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["journal_id", "nama", "sinta", "score", "alasan", "saran"],
                    properties: {
                      journal_id: {
                        type: "string",
                      },
                      nama: {
                        type: "string",
                      },
                      sinta: {
                        type: "string",
                      },
                      score: {
                        type: "number",
                      },
                      alasan: {
                        type: "string",
                      },
                      saran: {
                        type: "string",
                      },
                    },
                  },
                },
                summary: {
                  type: "string",
                },
              },
            },
          },
        },
      });
      const parsed = JSON.parse(response.output_text);
      const recommendations = normalizeAiRecommendations(parsed.recommendations ?? [], candidates);

      if (recommendations.length === 0) {
        return NextResponse.json(toLocalFallbackRecommendations(combinedText, candidates));
      }

      return NextResponse.json({
        recommendations,
        summary: parsed.summary ?? "Rekomendasi AI berhasil dibuat.",
        source: "openai",
      });
    } catch (openAiError) {
      console.error("[recommend-ai] OpenAI fallback:", openAiError);
      return NextResponse.json(toLocalFallbackRecommendations(combinedText, candidates));
    }
  } catch (error) {
    return NextResponse.json(
      { error: error.message ?? "Gagal membuat rekomendasi AI." },
      { status: 500 }
    );
  }
}
