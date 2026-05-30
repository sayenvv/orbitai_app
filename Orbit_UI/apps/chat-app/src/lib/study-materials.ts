import { parseInsightSections, type InsightSection } from "@/lib/parse-insight-sections";

export type StudyQaPair = {
  question: string;
  answer: string;
};

export type StudyFlashcard = {
  front: string;
  back: string;
};

export type StudyVocabTerm = {
  term: string;
  hint?: string;
};

export type StudyConcept = {
  title: string;
  description: string;
};

export type StudyKeyword = {
  word: string;
  weight: number;
};

export type StudyMaterials = {
  keyInsights: string[];
  qaPairs: StudyQaPair[];
  flashcards: StudyFlashcard[];
  vocabulary: StudyVocabTerm[];
  concepts: StudyConcept[];
  keywords: StudyKeyword[];
};

const STOPWORDS = new Set([
  "about", "after", "also", "among", "because", "before", "being", "between",
  "could", "document", "during", "each", "from", "have", "into", "more", "other",
  "should", "such", "than", "that", "their", "them", "then", "there", "these",
  "they", "this", "those", "through", "under", "very", "what", "when", "where",
  "which", "while", "with", "would", "your",
]);

function sectionById(sections: InsightSection[], id: string): InsightSection | undefined {
  return sections.find((section) => section.id === id);
}

function extractBullets(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*•]\s/.test(line) || /^\d+\.\s/.test(line))
    .map((line) =>
      line
        .replace(/^[-*•]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .replace(/\*\*/g, "")
        .trim(),
    )
    .filter((line) => line.length > 2);
}

function extractSentences(content: string): string[] {
  return content
    .replace(/[#*_`]/g, "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);
}

function splitFrontBack(text: string): { front: string; back: string } | null {
  const dashSplit = text.split(/\s[—–-]\s/);
  if (dashSplit.length >= 2) {
    return { front: dashSplit[0].trim(), back: dashSplit.slice(1).join(" — ").trim() };
  }
  const colonSplit = text.split(/:\s+/);
  if (colonSplit.length >= 2 && colonSplit[0].length < 80) {
    return { front: colonSplit[0].trim(), back: colonSplit.slice(1).join(": ").trim() };
  }
  return null;
}

function extractBoldTerms(content: string): string[] {
  const terms = new Set<string>();
  for (const match of content.matchAll(/\*\*([^*]{2,64})\*\*/g)) {
    const term = match[1].trim();
    if (!/^\d/.test(term)) terms.add(term);
  }
  for (const match of content.matchAll(/"([^"]{2,48})"/g)) {
    terms.add(match[1].trim());
  }
  return [...terms];
}

function tokenizeForKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

function buildKeywords(fullText: string, vocabulary: StudyVocabTerm[]): StudyKeyword[] {
  const counts = new Map<string, number>();

  for (const { term } of vocabulary) {
    const key = term.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 3);
  }

  for (const word of tokenizeForKeywords(fullText)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24);

  if (sorted.length === 0) return [];

  const max = sorted[0][1];
  return sorted.map(([word, count]) => ({
    word,
    weight: Math.max(1, Math.round((count / max) * 5)),
  }));
}

function pickAnswer(
  question: string,
  details: string[],
  summary: string,
): string {
  const needle = question.toLowerCase().replace(/\?/g, "").split(/\s+/).filter((w) => w.length > 4);
  const match = details.find((detail) =>
    needle.some((word) => detail.toLowerCase().includes(word)),
  );
  if (match) return match;
  if (summary) return summary.split(/(?<=[.!?])\s+/)[0] ?? summary;
  if (details[0]) return details[0];
  return "Review the source PDF and Important details section to formulate your answer.";
}

export function buildStudyMaterials(content: string): StudyMaterials {
  const sections = parseInsightSections(content);
  const summary = sectionById(sections, "summary")?.content ?? "";
  const themes = extractBullets(sectionById(sections, "themes")?.content ?? "");
  const details = extractBullets(sectionById(sections, "details")?.content ?? "");
  const questions = extractBullets(sectionById(sections, "questions")?.content ?? "");

  const summarySentences = extractSentences(summary);
  const keyInsights = [...summarySentences.slice(0, 2), ...details.slice(0, 4)].slice(0, 6);

  const qaPairs: StudyQaPair[] = questions.map((question) => ({
    question: question.endsWith("?") ? question : `${question}?`,
    answer: pickAnswer(question, details, summary),
  }));

  const flashcards: StudyFlashcard[] = [];
  for (const theme of themes) {
    const split = splitFrontBack(theme);
    if (split) {
      flashcards.push(split);
    } else {
      flashcards.push({
        front: theme.length > 72 ? `${theme.slice(0, 69)}…` : theme,
        back: details[flashcards.length % Math.max(details.length, 1)] ?? summarySentences[0] ?? theme,
      });
    }
  }
  for (const detail of details.slice(0, Math.max(0, 6 - flashcards.length))) {
    const split = splitFrontBack(detail);
    if (split) flashcards.push(split);
    else flashcards.push({ front: "Key fact", back: detail });
  }

  const boldTerms = extractBoldTerms(content);
  const vocabulary: StudyVocabTerm[] = [];
  const seenVocab = new Set<string>();

  for (const term of boldTerms) {
    const key = term.toLowerCase();
    if (seenVocab.has(key)) continue;
    seenVocab.add(key);
    const related = details.find((detail) =>
      detail.toLowerCase().includes(key),
    );
    vocabulary.push({ term, hint: related?.slice(0, 120) });
  }

  for (const theme of themes) {
    const split = splitFrontBack(theme);
    if (split && split.front.length < 48) {
      const key = split.front.toLowerCase();
      if (!seenVocab.has(key)) {
        seenVocab.add(key);
        vocabulary.push({ term: split.front, hint: split.back });
      }
    }
  }

  const concepts: StudyConcept[] = themes.map((theme) => {
    const split = splitFrontBack(theme);
    if (split) return { title: split.front, description: split.back };
    return { title: theme.length > 56 ? `${theme.slice(0, 53)}…` : theme, description: summarySentences[0] ?? "Core idea from this document." };
  });

  const keywords = buildKeywords(content, vocabulary);

  return {
    keyInsights,
    qaPairs,
    flashcards: flashcards.slice(0, 12),
    vocabulary: vocabulary.slice(0, 16),
    concepts: concepts.slice(0, 10),
    keywords,
  };
}

export function studyTabCounts(materials: StudyMaterials) {
  return {
    insights: materials.keyInsights.length,
    qa: materials.qaPairs.length,
    flashcards: materials.flashcards.length,
    vocabulary: materials.vocabulary.length,
    concepts: materials.concepts.length,
    keywords: materials.keywords.length,
  };
}
