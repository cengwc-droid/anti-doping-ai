import { retrieveRelevantRules } from "@/lib/anti-doping-rules";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: unknown };
    const question =
      typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return Response.json({ error: "问题不能为空。" }, { status: 400 });
    }

    const matches = await retrieveRelevantRules(question, 5);

    return Response.json({ matches });
  } catch (error) {
    console.error("Failed to retrieve anti-doping rules", error);

    return Response.json(
      {
        error: "规则检索暂时不可用，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
