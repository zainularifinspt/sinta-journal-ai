import * as cheerio from "cheerio";
import { NextResponse } from "next/server";

const allowedHost = "sinta.kemdiktisaintek.go.id";

function validateSintaUrl(value) {
  try {
    const url = new URL(value);
    const isValidHost = url.hostname === allowedHost;
    const isJournalProfile = /^\/journals\/profile\/\d+\/?$/.test(url.pathname);

    return url.protocol === "https:" && isValidHost && isJournalProfile;
  } catch {
    return false;
  }
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalizeSinta(value) {
  const match = cleanText(value).match(/SINTA\s*([1-6])/i);
  return match ? `SINTA ${match[1]}` : "";
}

function textAfterLabel(pageText, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*:?\\s*([^|\\n\\r]{2,160})`, "i");
    const match = pageText.match(pattern);

    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return "";
}

function findByNearbyLabel($, labels) {
  let found = "";

  $("body *").each((_, element) => {
    if (found) {
      return false;
    }

    const labelText = cleanText($(element).text());
    const matched = labels.some((label) => new RegExp(`^${label}\\b`, "i").test(labelText));

    if (!matched) {
      return undefined;
    }

    const sameText = labelText.replace(new RegExp(`^(${labels.join("|")})\\s*:?\\s*`, "i"), "");

    if (sameText && sameText.length < 180) {
      found = cleanText(sameText);
      return false;
    }

    const nextText = cleanText($(element).next().text());

    if (nextText) {
      found = nextText;
      return false;
    }

    return undefined;
  });

  return found;
}

function findWebsite($) {
  let website = "";

  $("a[href]").each((_, element) => {
    if (website) {
      return false;
    }

    const href = $(element).attr("href");
    const text = cleanText($(element).text());

    if (!href || href.includes("sinta.kemdiktisaintek.go.id")) {
      return undefined;
    }

    if (/website|journal|site|url|http/i.test(text) || /^https?:\/\//i.test(href)) {
      website = href.startsWith("http") ? href : "";
      return false;
    }

    return undefined;
  });

  return website;
}

function parseJournalHtml(html) {
  const $ = cheerio.load(html);

  $("script, style, noscript").remove();

  const pageText = cleanText($("body").text());
  const heading = cleanText(
    $("h1").first().text() ||
      $("h2").first().text() ||
      $(".journal-title").first().text() ||
      $(".title").first().text()
  );
  const title = cleanText($("title").text()).replace(/\s*\|\s*SINTA.*$/i, "");
  const nama = heading || title;
  const sinta = normalizeSinta(pageText);
  const issn = textAfterLabel(pageText, ["P-ISSN", "ISSN"]) || findByNearbyLabel($, ["P-ISSN", "ISSN"]);
  const eissn = textAfterLabel(pageText, ["E-ISSN", "EISSN"]) || findByNearbyLabel($, ["E-ISSN", "EISSN"]);
  const publisher =
    textAfterLabel(pageText, ["Publisher", "Penerbit"]) ||
    findByNearbyLabel($, ["Publisher", "Penerbit"]);
  const bidang =
    textAfterLabel(pageText, ["Subject", "Bidang", "Focus", "Category"]) ||
    findByNearbyLabel($, ["Subject", "Bidang", "Focus", "Category"]);
  const scope =
    textAfterLabel(pageText, ["Scope", "Aims and Scope", "Focus and Scope"]) ||
    findByNearbyLabel($, ["Scope", "Aims and Scope", "Focus and Scope"]);
  const website =
    textAfterLabel(pageText, ["Website", "URL"]) ||
    findByNearbyLabel($, ["Website", "URL"]) ||
    findWebsite($);

  return {
    nama,
    sinta,
    issn,
    eissn,
    publisher,
    bidang,
    jadwal: "",
    website,
    scope,
    catatan_ai: "",
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = cleanText(body?.url);
    console.log("[import-sinta] URL received:", url);

    if (!validateSintaUrl(url)) {
      return NextResponse.json(
        { error: "URL SINTA tidak valid. Gunakan format https://sinta.kemdiktisaintek.go.id/journals/profile/1234" },
        { status: 400 }
      );
    }

    let response;

    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        cache: "no-store",
      });
      console.log("[import-sinta] response status:", response.status);
      console.log("[import-sinta] response statusText:", response.statusText);
    } catch (fetchError) {
      console.error("[import-sinta] fetch error:", fetchError);
      return NextResponse.json(
        {
          error: "Gagal mengambil halaman SINTA",
          detail: fetchError.message ?? String(fetchError),
          kemungkinanPenyebab: [
            "Server SINTA menolak request dari server aplikasi.",
            "Situs SINTA sedang tidak dapat diakses dari jaringan hosting/local server.",
            "Ada proteksi anti-bot, TLS, DNS, timeout, atau pembatasan akses sementara.",
            "URL valid, tetapi halaman hanya dapat dibuka dari browser biasa.",
          ],
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error("[import-sinta] non-OK response:", {
        status: response.status,
        statusText: response.statusText,
      });
      return NextResponse.json(
        {
          error: "Gagal mengambil halaman SINTA",
          detail: `Status ${response.status}: ${response.statusText}`,
          kemungkinanPenyebab: [
            "Halaman SINTA mengembalikan status error.",
            "URL jurnal sudah berubah atau tidak tersedia.",
            "Server SINTA membatasi akses otomatis.",
          ],
        },
        { status: 502 }
      );
    }

    const html = await response.text();
    const journal = parseJournalHtml(html);

    if (!journal.nama || !journal.sinta) {
      return NextResponse.json(
        { error: "Data jurnal tidak lengkap. Nama dan SINTA wajib terbaca dari halaman." },
        { status: 422 }
      );
    }

    return NextResponse.json({ journal });
  } catch (error) {
    console.error("[import-sinta] unexpected error:", error);
    return NextResponse.json(
      {
        error: "Gagal mengambil halaman SINTA",
        detail: error.message ?? String(error),
        kemungkinanPenyebab: [
          "Terjadi error saat membaca atau memproses halaman SINTA.",
          "Struktur HTML halaman berubah.",
          "Koneksi ke SINTA bermasalah.",
        ],
      },
      { status: 500 }
    );
  }
}
