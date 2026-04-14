import { promises as fs } from "node:fs";
import path from "node:path";

export type ReviewStatus = "pending" | "needs_review" | "reviewed" | "closed";

export type QuestionRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  question: string;
  answer: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  riskSummary: string;
  status: ReviewStatus;
  reviewNote: string;
  mode: "demo" | "qwen";
  model: string;
  sourceTitles: string[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const RECORDS_PATH = path.join(DATA_DIR, "question-records.json");

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(RECORDS_PATH);
  } catch {
    await fs.writeFile(RECORDS_PATH, "[]", "utf8");
  }
}

async function readRecordsFile(): Promise<QuestionRecord[]> {
  await ensureDataFile();

  const file = await fs.readFile(RECORDS_PATH, "utf8");
  const parsed = JSON.parse(file) as QuestionRecord[];

  return Array.isArray(parsed) ? parsed : [];
}

async function writeRecordsFile(records: QuestionRecord[]) {
  await ensureDataFile();
  await fs.writeFile(RECORDS_PATH, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

function getDefaultStatus(riskLevel: QuestionRecord["riskLevel"]): ReviewStatus {
  if (riskLevel === "high" || riskLevel === "medium" || riskLevel === "unknown") {
    return "needs_review";
  }

  return "pending";
}

export async function listQuestionRecords() {
  const records = await readRecordsFile();

  return records.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function createQuestionRecord(
  input: Pick<
    QuestionRecord,
    | "question"
    | "answer"
    | "riskLevel"
    | "riskSummary"
    | "mode"
    | "model"
    | "sourceTitles"
  >,
) {
  const records = await readRecordsFile();
  const now = new Date().toISOString();
  const record: QuestionRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: getDefaultStatus(input.riskLevel),
    reviewNote: "",
  };

  records.push(record);
  await writeRecordsFile(records);

  return record;
}

export async function updateQuestionRecord(
  id: string,
  input: {
    status?: ReviewStatus;
    reviewNote?: string;
  },
) {
  const records = await readRecordsFile();
  const index = records.findIndex((record) => record.id === id);

  if (index === -1) {
    return null;
  }

  const current = records[index];
  const updated: QuestionRecord = {
    ...current,
    status: input.status || current.status,
    reviewNote:
      typeof input.reviewNote === "string" ? input.reviewNote : current.reviewNote,
    updatedAt: new Date().toISOString(),
  };

  records[index] = updated;
  await writeRecordsFile(records);

  return updated;
}
