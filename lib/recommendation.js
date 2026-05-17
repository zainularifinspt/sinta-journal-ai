const STOP_WORDS = new Set([
  "a",
  "about",
  "adalah",
  "agar",
  "akan",
  "also",
  "an",
  "and",
  "atau",
  "at",
  "bagi",
  "bahwa",
  "by",
  "dalam",
  "dan",
  "dari",
  "dengan",
  "for",
  "from",
  "in",
  "ini",
  "into",
  "is",
  "it",
  "itu",
  "journal",
  "jurnal",
  "kajian",
  "ke",
  "melalui",
  "method",
  "methods",
  "metode",
  "of",
  "on",
  "oleh",
  "pada",
  "paper",
  "per",
  "penelitian",
  "serta",
  "studies",
  "study",
  "studi",
  "that",
  "the",
  "this",
  "to",
  "untuk",
  "with",
  "yang",
]);

const STEM_DICTIONARY = {
  belajar: "belajar",
  pembelajaran: "belajar",
  mempelajari: "belajar",
  pendidikan: "didik",
  pendidik: "didik",
  didikan: "didik",
  pengajaran: "ajar",
  mengajar: "ajar",
  ajaran: "ajar",
  matematika: "matematika",
  matematis: "matematika",
  statistika: "statistik",
  statistik: "statistik",
  teknologi: "teknologi",
  artificial: "artificial",
  intelligence: "intelligence",
};

const FIELD_WEIGHTS = {
  scope: 10,
  bidang: 8,
  nama: 5,
  catatan_ai: 5,
};

export function preprocessText(value) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return {
    normalized,
    tokens,
    stems: tokens.map(stemWord),
  };
}

export function stemWord(word) {
  const normalized = String(word ?? "").toLowerCase().trim();

  if (STEM_DICTIONARY[normalized]) {
    return STEM_DICTIONARY[normalized];
  }

  const withoutSuffix = normalized.replace(/(lah|kah|tah|pun|nya|kan|an|i)$/u, "");

  if (STEM_DICTIONARY[withoutSuffix]) {
    return STEM_DICTIONARY[withoutSuffix];
  }

  const prefixStripped = withoutSuffix.replace(
    /^(memper|meng|meny|men|mem|ber|bel|ter|per|peng|peny|pen|pem|pe|di|ke|se)/u,
    ""
  );

  return STEM_DICTIONARY[prefixStripped] ?? prefixStripped ?? normalized;
}

function getSintaRank(value) {
  return Number(String(value ?? "").replace(/\D/g, "")) || 99;
}

function uniqueKeywords(text) {
  const { tokens } = preprocessText(text);
  const seen = new Set();

  return tokens.reduce((keywords, token) => {
    const stem = stemWord(token);
    const key = `${token}:${stem}`;

    if (!seen.has(key)) {
      seen.add(key);
      keywords.push({ token, stem });
    }

    return keywords;
  }, []);
}

function fieldTokens(value) {
  const { tokens } = preprocessText(value);

  return tokens.map((token) => ({
    token,
    stem: stemWord(token),
  }));
}

function isPartialMatch(keyword, journalToken) {
  if (keyword.stem === journalToken.stem || keyword.token === journalToken.token) {
    return true;
  }

  if (keyword.stem.length >= 4 && journalToken.stem.length >= 4) {
    return keyword.stem.includes(journalToken.stem) || journalToken.stem.includes(keyword.stem);
  }

  if (keyword.token.length >= 5 && journalToken.token.length >= 5) {
    return keyword.token.includes(journalToken.token) || journalToken.token.includes(keyword.token);
  }

  return false;
}

function scoreField(keywords, value, weight) {
  const tokens = fieldTokens(value);

  if (tokens.length === 0 || keywords.length === 0) {
    return {
      score: 0,
      matchedKeywords: [],
    };
  }

  const matchedKeywords = [];
  const score = keywords.reduce((total, keyword) => {
    const hasMatch = tokens.some((token) => isPartialMatch(keyword, token));

    if (!hasMatch) {
      return total;
    }

    matchedKeywords.push(keyword.token);
    return total + weight;
  }, 0);

  return {
    score,
    matchedKeywords,
  };
}

function getFieldValue(journal, fieldName) {
  if (fieldName === "catatan_ai") {
    return journal.catatan_ai ?? journal.catatanAI ?? "";
  }

  return journal[fieldName] ?? "";
}

function getMatchBonus(totalMatches, keywordsLength, fieldMatches) {
  let bonus = 0;

  if (totalMatches >= 3) {
    bonus += 12;
  }

  if (totalMatches >= 5) {
    bonus += 18;
  }

  if (keywordsLength > 0 && totalMatches / keywordsLength >= 0.5) {
    bonus += 12;
  }

  if (fieldMatches.scope > 0 && fieldMatches.bidang > 0) {
    bonus += 16;
  }

  return bonus;
}

function scoreJournal(journal, keywords) {
  const fieldResults = Object.entries(FIELD_WEIGHTS).reduce(
    (result, [fieldName, weight]) => {
      const fieldResult = scoreField(keywords, getFieldValue(journal, fieldName), weight);

      result.score += fieldResult.score;
      result.fieldMatches[fieldName] = fieldResult.matchedKeywords.length;
      fieldResult.matchedKeywords.forEach((keyword) => result.matchedKeywords.add(keyword));

      return result;
    },
    {
      score: 0,
      fieldMatches: {},
      matchedKeywords: new Set(),
    }
  );

  const totalMatches = fieldResults.matchedKeywords.size;
  const bonus = getMatchBonus(totalMatches, keywords.length, fieldResults.fieldMatches);

  return {
    score: fieldResults.score + bonus,
    matchedKeywords: [...fieldResults.matchedKeywords],
    fieldMatches: fieldResults.fieldMatches,
  };
}

export function getScoreLabel(score) {
  if (score >= 70) {
    return "Sangat Cocok";
  }

  if (score >= 30) {
    return "Cocok";
  }

  return "Kurang Cocok";
}

function getPrimaryFocus(journal, matchedKeywords) {
  const focusWords = matchedKeywords.slice(0, 3);

  if (focusWords.length > 0) {
    return formatList(focusWords);
  }

  return journal.bidang || journal.scope || "topik penelitian terkait";
}

function formatList(items) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} dan ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")} dan ${items.at(-1)}`;
}

function buildReason(journal, matchedKeywords, fieldMatches, isFallback) {
  if (isFallback) {
    return "Rekomendasi umum berdasarkan peringkat SINTA dan kelengkapan metadata jurnal. Tetap periksa focus and scope sebelum mengirim artikel.";
  }

  const focus = getPrimaryFocus(journal, matchedKeywords);
  const hasScopeMatch = fieldMatches.scope > 0;
  const hasBidangMatch = fieldMatches.bidang > 0;

  if (hasScopeMatch && hasBidangMatch) {
    return `Jurnal ini memiliki fokus pada ${focus} dan bidang ${journal.bidang || "penelitian terkait"} yang relevan dengan topik artikel Anda.`;
  }

  if (hasScopeMatch) {
    return `Jurnal ini relevan karena scope jurnal memuat fokus pada ${focus}, sehingga cukup dekat dengan arah penelitian Anda.`;
  }

  if (hasBidangMatch) {
    return `Jurnal ini berada pada bidang ${journal.bidang || focus} dan memiliki kecocokan istilah penting dengan topik artikel Anda.`;
  }

  return `Jurnal ini memiliki kecocokan metadata pada ${focus}, sehingga layak dipertimbangkan sebagai kandidat publikasi.`;
}

export function buildRecommendations(text, journals, limit = 5) {
  const keywords = uniqueKeywords(text);
  const rankedJournals = [...journals]
    .map((journal) => {
      const result = scoreJournal(journal, keywords);

      return {
        journal,
        ...result,
      };
    })
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return getSintaRank(first.journal.sinta) - getSintaRank(second.journal.sinta);
    })
    .slice(0, limit);

  const hasMatchedJournal = rankedJournals.some((item) => item.score > 0);
  const selectedJournals = hasMatchedJournal
    ? rankedJournals
    : [...journals]
        .sort((first, second) => getSintaRank(first.sinta) - getSintaRank(second.sinta))
        .slice(0, limit)
        .map((journal) => ({
          journal,
          score: 0,
          matchedKeywords: [],
          fieldMatches: {},
        }));

  return selectedJournals.map(({ journal, score, matchedKeywords, fieldMatches }) => {
    const isFallback = !hasMatchedJournal;

    return {
      journal,
      score,
      matchedKeywords,
      scoreLabel: isFallback ? "Rekomendasi Umum" : getScoreLabel(score),
      isFallback,
      reason: buildReason(journal, matchedKeywords, fieldMatches, isFallback),
    };
  });
}
