import {
  listQuestionRecords,
  updateQuestionRecord,
  type ReviewStatus,
} from "@/lib/question-records";
import { hasAdminSession } from "@/lib/admin-auth";

const REVIEW_STATUSES: ReviewStatus[] = [
  "pending",
  "needs_review",
  "reviewed",
  "closed",
];

export async function GET() {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "请先登录后台。" }, { status: 401 });
  }

  try {
    const records = await listQuestionRecords();

    return Response.json({ records });
  } catch (error) {
    console.error("Failed to list question records", error);

    return Response.json(
      { error: "复核记录暂时不可用，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "请先登录后台。" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: unknown;
      status?: unknown;
      reviewNote?: unknown;
    };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const status =
      typeof body.status === "string" &&
      REVIEW_STATUSES.includes(body.status as ReviewStatus)
        ? (body.status as ReviewStatus)
        : undefined;
    const reviewNote =
      typeof body.reviewNote === "string" ? body.reviewNote.trim() : undefined;

    if (!id) {
      return Response.json({ error: "缺少记录 ID。" }, { status: 400 });
    }

    if (!status && reviewNote === undefined) {
      return Response.json({ error: "没有可更新的内容。" }, { status: 400 });
    }

    const record = await updateQuestionRecord(id, { status, reviewNote });

    if (!record) {
      return Response.json({ error: "记录不存在。" }, { status: 404 });
    }

    return Response.json({ record });
  } catch (error) {
    console.error("Failed to update question record", error);

    return Response.json(
      { error: "复核记录更新失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
