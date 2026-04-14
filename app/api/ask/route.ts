import OpenAI from "openai";
import { retrieveRelevantRules } from "@/lib/anti-doping-rules";
import { createQuestionRecord } from "@/lib/question-records";

type RiskLevel = "low" | "medium" | "high" | "unknown";

type AskAnswer = {
  answer: string;
  checks: string[];
  disclaimer: string;
  reviewId?: string;
  riskLevel: RiskLevel;
  riskSummary: string;
  nextActions: string[];
  sources: Array<{
    excerpt: string;
    source: string;
    title: string;
    updatedAt: string;
    url?: string;
  }>;
};

const systemPrompt = `你是一个面向运动员的兴奋剂风险问答助手。

请只输出 JSON，不要输出 Markdown，不要输出代码块，不要输出额外解释。

输出 JSON 结构必须是：
{
  "riskLevel": "low" | "medium" | "high" | "unknown",
  "riskSummary": "一句话风险判断",
  "answer": "2到4段中文说明，解释为什么有风险或为什么需要谨慎",
  "nextActions": ["给运动员的下一步建议1", "建议2", "建议3"],
  "checks": ["需要核对的信息1", "需要核对的信息2", "需要核对的信息3"],
  "disclaimer": "AI 仅作教育和信息参考，最终应以官方禁用清单、反兴奋剂机构、队医或医生意见为准。"
}

规则：
1. 优先帮助用户识别风险，不要武断地下“绝对安全”结论。
2. 如果涉及药品、补剂、注射、治疗豁免、比赛期间/赛外、海外购买产品、标签不清、复方成分等高风险场景，riskLevel 应偏高并提醒进一步核对。
3. 不要编造法规条文、药品成分或检测阈值；如果不确定，要明确写出不确定性。
4. nextActions 和 checks 各提供 3 条，尽量可执行。
5. 所有内容使用简洁专业中文。
6. 你的回答必须优先依据提供给你的“规则检索结果”。如果检索结果不足，就明确说明“当前规则库命中有限”。`;

const fallbackDisclaimer =
  "AI 仅作教育和信息参考，最终应以官方禁用清单、反兴奋剂机构、队医或医生意见为准。";

function parseModelJson(content: string): AskAnswer | null {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<AskAnswer>;

    return normalizeAnswer(parsed);
  } catch {
    return null;
  }
}

function normalizeList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items.slice(0, 3) : fallback;
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  return value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeAnswer(value: Partial<AskAnswer>): AskAnswer | null {
  if (typeof value.answer !== "string" || !value.answer.trim()) {
    return null;
  }

  return {
    answer: value.answer.trim(),
    checks: normalizeList(value.checks, [
      "核对药品或补剂的完整成分表与剂量信息",
      "核对比赛期/赛外是否适用不同限制",
      "核对是否需要治疗用药豁免或队医确认",
    ]),
    disclaimer:
      typeof value.disclaimer === "string" && value.disclaimer.trim()
        ? value.disclaimer.trim()
        : fallbackDisclaimer,
    riskLevel: normalizeRiskLevel(value.riskLevel),
    riskSummary:
      typeof value.riskSummary === "string" && value.riskSummary.trim()
        ? value.riskSummary.trim()
        : "当前信息不足，建议先按中高风险处理并进一步核对。",
    sources: [],
    nextActions: normalizeList(value.nextActions, [
      "先不要仅凭经验自行使用该药品或补剂",
      "把产品名称、成分表、剂量和使用时间整理给队医或专业人员",
      "对照最新官方禁用清单或机构查询工具再次确认",
    ]),
  };
}

function createSourceList(
  ruleMatches: Awaited<ReturnType<typeof retrieveRelevantRules>>,
): AskAnswer["sources"] {
  return ruleMatches.map((item) => ({
    excerpt: item.excerpt,
    source: item.source,
    title: item.title,
    updatedAt: item.updatedAt,
    url: item.url,
  }));
}

function createDemoAnswer(
  question: string,
  ruleMatches: Awaited<ReturnType<typeof retrieveRelevantRules>>,
): AskAnswer {
  const hasHighRiskSignal =
    /补剂|增肌|proprietary|标签|海外|代购|注射|输液|哮喘|处方|比赛|赛前|感冒|伪麻黄碱|TUE/i.test(
      question,
    );

  const ruleSummary =
    ruleMatches.length > 0
      ? `本地规则库命中了 ${ruleMatches
          .map((item) => `《${item.title}》`)
          .join("、")}。`
      : "当前规则库命中有限。";

  return {
    answer: `${ruleSummary}\n\n由于服务端还没有配置 QWEN_API_KEY，现在先进入演示模式：系统不会调用千问模型，而是根据本地规则库给出保守风险提示。针对“${question}”这类问题，不能只凭商品名或经验判断安全性，尤其是临近比赛、药品成分不完整、补剂标签不透明、海外购买或涉及处方治疗时，都应提高谨慎程度。\n\n建议你把完整成分、剂量、使用时间、是否处于比赛期和购买渠道补齐后，再让队医、医生或反兴奋剂机构复核。配置千问 API Key 后，这里会自动切换为模型生成的更完整回答。`,
    checks: [
      "核对药品或补剂的完整成分表与剂量信息",
      "核对是否处于比赛期、赛前或赛外阶段",
      "核对是否需要治疗用药豁免、队医确认或官方工具复核",
    ],
    disclaimer:
      "当前为未配置 QWEN_API_KEY 时的演示模式，仅作教育和流程测试；正式判断仍应以官方禁用清单、反兴奋剂机构、队医或医生意见为准。",
    riskLevel: hasHighRiskSignal ? "medium" : "unknown",
    riskSummary: hasHighRiskSignal
      ? "当前包含需要进一步核验的风险信号，建议先按中高风险谨慎处理。"
      : "当前信息不足，暂不能给出低风险结论。",
    nextActions: [
      "先不要仅凭 AI 或个人经验自行决定使用",
      "补充产品名、通用名、完整成分、剂量和计划使用时间",
      "配置 QWEN_API_KEY 后重新提问，或直接交给队医和反兴奋剂机构复核",
    ],
    sources: createSourceList(ruleMatches),
  };
}

async function attachReviewRecord(
  question: string,
  answer: AskAnswer,
  mode: "demo" | "qwen",
  model: string,
) {
  try {
    const record = await createQuestionRecord({
      question,
      answer: answer.answer,
      riskLevel: answer.riskLevel,
      riskSummary: answer.riskSummary,
      mode,
      model,
      sourceTitles: answer.sources.map((source) => source.title),
    });

    return {
      ...answer,
      reviewId: record.id,
    };
  } catch (error) {
    console.error("Failed to create review record", error);

    return answer;
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.QWEN_API_KEY;
    const model = process.env.QWEN_MODEL || "qwen-plus";
    const body = (await request.json()) as {
      imageDataUrl?: unknown;
      question?: unknown;
    };
    const question =
      typeof body.question === "string" ? body.question.trim() : "";
    const imageDataUrl =
      typeof body.imageDataUrl === "string" ? body.imageDataUrl.trim() : "";

    if (!question) {
      return Response.json({ error: "问题不能为空。" }, { status: 400 });
    }

    if (question.length > 2000) {
      return Response.json(
        { error: "问题太长了，请控制在 2000 字以内。" },
        { status: 400 },
      );
    }

    if (imageDataUrl && !imageDataUrl.startsWith("data:image/")) {
      return Response.json(
        { error: "图片格式无效，请上传 JPG、PNG 或 WebP 图片。" },
        { status: 400 },
      );
    }

    if (imageDataUrl.length > 6_000_000) {
      return Response.json(
        { error: "图片太大了，请压缩到 4MB 以内后再试。" },
        { status: 400 },
      );
    }

    const ruleMatches = await retrieveRelevantRules(question, 3);

    if (!apiKey) {
      const answer = createDemoAnswer(question, ruleMatches);
      const answerWithRecord = await attachReviewRecord(
        question,
        answer,
        "demo",
        "local-demo",
      );

      return Response.json(answerWithRecord);
    }

    const ruleContext =
      ruleMatches.length > 0
        ? ruleMatches
            .map(
              (item, index) =>
                `资料${index + 1}
标题：${item.title}
来源：${item.source}
更新日期：${item.updatedAt}
标签：${item.tags.join("、")}
摘录：${item.excerpt}
全文：${item.content}`,
            )
            .join("\n\n")
        : "当前规则库没有检索到直接相关资料。请明确说明规则库命中有限，并提高谨慎程度。";

    const client = new OpenAI({
      apiKey,
      baseURL:
        process.env.QWEN_BASE_URL ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });

    const selectedModel = imageDataUrl
      ? process.env.QWEN_VISION_MODEL || "qwen-vl-plus"
      : model;
    const questionWithImageHint = imageDataUrl
      ? `${question}\n\n用户还上传了一张药品、补剂或成分标签图片。请先从图片中提取可见的商品名、成分、剂量、警示语和不确定信息，再结合规则检索结果给出风险判断。若图片不清晰或无法识别，请明确要求用户补充更清晰图片或文字。`
      : question;
    const userContent = imageDataUrl
      ? [
          {
            type: "text" as const,
            text: `用户问题：${questionWithImageHint}

规则检索结果：
${ruleContext}`,
          },
          {
            type: "image_url" as const,
            image_url: {
              url: imageDataUrl,
            },
          },
        ]
      : `用户问题：${question}

规则检索结果：
${ruleContext}`;

    const response = await client.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: 0.2,
      ...(imageDataUrl
        ? {}
        : {
            response_format: {
              type: "json_object" as const,
            },
          }),
    });

    const content = response.choices[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return Response.json(
        { error: "模型没有返回有效内容，请稍后再试。" },
        { status: 502 },
      );
    }

    const answer = parseModelJson(content);

    if (!answer) {
      return Response.json(
        { error: "模型返回格式异常，请稍后重试。" },
        { status: 502 },
      );
    }

    answer.sources = createSourceList(ruleMatches);

    const answerWithRecord = await attachReviewRecord(
      question,
      answer,
      "qwen",
      selectedModel,
    );

    return Response.json(answerWithRecord);
  } catch (error) {
    console.error("Failed to answer anti-doping question with Qwen", error);

    return Response.json(
      {
        error: "问答接口暂时不可用，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
