import { promises as fs } from "node:fs";
import path from "node:path";

export type RuleDocument = {
  id: string;
  source: string;
  title: string;
  updatedAt: string;
  url?: string;
  tags: string[];
  content: string;
};

export type RuleMatch = RuleDocument & {
  excerpt: string;
  score: number;
};

const KNOWLEDGE_PATH = path.join(
  process.cwd(),
  "knowledge",
  "anti-doping-rules.json",
);

const STOP_WORDS = new Set([
  "的",
  "了",
  "和",
  "或",
  "与",
  "及",
  "是",
  "在",
  "吗",
  "呢",
  "啊",
  "我",
  "你",
  "他",
  "她",
  "它",
  "我们",
  "可以",
  "是否",
  "这个",
  "那个",
  "一个",
  "一些",
  "需要",
  "应该",
  "怎么",
  "如何",
  "什么",
  "一下",
  "使用",
  "比赛",
  "运动员",
]);

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase();
  const chineseTerms = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const latinTerms = normalized.match(/[a-z0-9-]{2,}/g) || [];

  return [...chineseTerms, ...latinTerms].filter(
    (term) => !STOP_WORDS.has(term) && term.trim().length > 1,
  );
}

function scoreDocument(question: string, doc: RuleDocument): number {
  const queryTerms = tokenize(question);
  const docTerms = tokenize(
    `${doc.title} ${doc.tags.join(" ")} ${doc.content} ${doc.source}`,
  );
  const docText = `${doc.title}\n${doc.tags.join(" ")}\n${doc.content}`.toLowerCase();

  let score = 0;

  for (const term of queryTerms) {
    if (docText.includes(term)) {
      score += 3;
    }

    const exactMatches = docTerms.filter((item) => item === term).length;
    score += exactMatches * 2;
  }

  for (const tag of doc.tags) {
    if (question.includes(tag)) {
      score += 4;
    }
  }

  return score;
}

function buildExcerpt(content: string, question: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  const queryTerms = tokenize(question);

  for (const term of queryTerms) {
    const index = normalized.toLowerCase().indexOf(term);

    if (index >= 0) {
      const start = Math.max(0, index - 50);
      const end = Math.min(normalized.length, index + 120);
      return normalized.slice(start, end).trim();
    }
  }

  return normalized.slice(0, 160).trim();
}

export async function retrieveRelevantRules(
  question: string,
  limit = 3,
): Promise<RuleMatch[]> {
  const file = await fs.readFile(KNOWLEDGE_PATH, "utf8");
  const docs = JSON.parse(file) as RuleDocument[];

  return docs
    .map((doc) => ({
      ...doc,
      excerpt: buildExcerpt(doc.content, question),
      score: scoreDocument(question, doc),
    }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
