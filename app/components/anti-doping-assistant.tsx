"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Role = "user" | "assistant";

type RiskLevel = "low" | "medium" | "high" | "unknown";

type AssistantPayload = {
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

type Message = {
  id: string;
  role: Role;
  content: string;
  payload?: AssistantPayload;
};

type RuleMatch = {
  id: string;
  source: string;
  title: string;
  updatedAt: string;
  url?: string;
  tags: string[];
  content: string;
  excerpt: string;
  score: number;
};

const HISTORY_STORAGE_KEY = "anti-doping-ai-history";

const STARTER_QUESTIONS = [
  "感冒药里含伪麻黄碱，比赛前一周可以用吗？",
  "国外买的增肌粉只有 proprietary blend 标签，风险大吗？",
  "比赛期间使用哮喘吸入剂，需要先确认什么？",
  "医生建议我打针治疗，这种情况要不要考虑 TUE？",
];

const CHECKLIST_ITEMS = [
  "完整商品名和通用名是否清楚",
  "能否拿到完整成分表和剂量",
  "是否涉及比赛期、赛外或即将参赛",
  "是否属于补剂、处方药、注射或海外购买",
  "是否需要队医、医生或反兴奋剂机构复核",
];

const STATUS_ITEMS = [
  "问答接口已接通",
  "本地规则检索已接入",
  "风险提示和免责声明已补齐",
  "提问历史已支持本地保存",
  "提问记录已进入复核后台",
];

function createWelcomeMessage(): Message {
  return {
    id: "welcome",
    role: "assistant",
    content:
      "我是你的兴奋剂风险问答助手。你可以问我药品、补剂、治疗豁免、标签风险、出国参赛用药等问题。我会先给出风险判断和下一步建议，但最终仍应以官方禁用清单、队医和反兴奋剂机构意见为准。",
    payload: {
      answer:
        "这个网站现在已经是“规则检索 + 千问总结”的问答形态。你提问后，我会尽量返回结构化结果，而不是只给一大段泛泛说明。",
      checks: [
        "核对产品完整成分和剂量",
        "核对是否处于比赛期或赛外阶段",
        "核对是否需要治疗用药豁免或专业复核",
      ],
      disclaimer:
        "AI 仅作教育和信息参考，最终应以官方禁用清单、反兴奋剂机构、队医或医生意见为准。",
      riskLevel: "unknown",
      riskSummary: "欢迎先从一个真实用药或补剂问题开始测试。",
      nextActions: [
        "输入具体产品名、成分、剂量和计划使用时间",
        "优先问药品、补剂、标签风险、比赛期使用等真实场景",
        "对高风险问题继续保留人工复核流程",
      ],
      sources: [
        {
          excerpt: "现在这个版本会先查本地规则知识库，再把检索结果交给千问整理答案。",
          source: "系统说明",
          title: "检索增强问答已启用",
          updatedAt: "2026-04-10",
        },
      ],
    },
  };
}

function getRiskBadgeClassName(level: RiskLevel) {
  if (level === "high") {
    return "bg-rose-100 text-rose-700";
  }

  if (level === "medium") {
    return "bg-amber-100 text-amber-800";
  }

  if (level === "low") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-200 text-slate-700";
}

function getRiskLabel(level: RiskLevel) {
  if (level === "high") return "高风险";
  if (level === "medium") return "中风险";
  if (level === "low") return "低风险";
  return "待核实";
}

export function AntiDopingAssistant() {
  const [question, setQuestion] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [messages, setMessages] = useState<Message[]>([createWelcomeMessage()]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [ruleQuery, setRuleQuery] = useState("");
  const [ruleMatches, setRuleMatches] = useState<RuleMatch[]>([]);
  const [ruleError, setRuleError] = useState("");
  const [isRuleLoading, setIsRuleLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as Message[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      }
    } catch {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const canSubmit = useMemo(
    () => question.trim().length > 0 && !isLoading,
    [question, isLoading],
  );

  const totalQuestions = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages],
  );

  const highRiskAnswers = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.role === "assistant" && message.payload?.riskLevel === "high",
      ).length,
    [messages],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = question.trim();
    if (!value) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: imageName ? `${value}\n\n已上传图片：${imageName}` : value,
    };

    setError("");
    setIsLoading(true);
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setImageDataUrl("");
    setImageName("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl,
          question: value,
        }),
      });

      const data = (await response.json()) as
        | ({ error?: string } & Partial<AssistantPayload>)
        | undefined;
      const answer = data?.answer;

      if (!response.ok || !answer) {
        throw new Error(data?.error || "回答生成失败，请稍后再试。");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answer,
          payload: {
            answer,
            checks: data.checks || [],
            disclaimer:
              data.disclaimer ||
              "AI 仅作教育和信息参考，最终应以官方禁用清单、反兴奋剂机构、队医或医生意见为准。",
            riskLevel: data.riskLevel || "unknown",
            riskSummary: data.riskSummary || "当前无法明确判断风险等级。",
            reviewId: data.reviewId,
            nextActions: data.nextActions || [],
            sources: data.sources || [],
          },
        },
      ]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "系统繁忙，请稍后重试。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRuleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = ruleQuery.trim();
    if (!value) {
      setRuleMatches([]);
      setRuleError("");
      return;
    }

    setRuleError("");
    setIsRuleLoading(true);

    try {
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: value }),
      });

      const data = (await response.json()) as
        | { error?: string; matches?: RuleMatch[] }
        | undefined;

      if (!response.ok) {
        throw new Error(data?.error || "规则检索失败，请稍后再试。");
      }

      setRuleMatches(data?.matches || []);
    } catch (searchError) {
      setRuleError(
        searchError instanceof Error
          ? searchError.message
          : "规则检索失败，请稍后再试。",
      );
    } finally {
      setIsRuleLoading(false);
    }
  }

  function fillStarterQuestion(value: string) {
    setQuestion(value);
    setError("");
  }

  function clearHistory() {
    const welcome = createWelcomeMessage();
    setMessages([welcome]);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([welcome]));
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setImageDataUrl("");
      setImageName("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件。");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("图片太大了，请压缩到 4MB 以内后再上传。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageDataUrl(reader.result);
        setImageName(file.name);
        setError("");
      }
    };
    reader.onerror = () => setError("图片读取失败，请重新选择。");
    reader.readAsDataURL(file);
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-semibold text-cyan-700">AI 问答台</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              合规问答
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              输入问题或上传标签图片，系统会返回风险等级、核对项和下一步建议。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              已提问 {totalQuestions} 次
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              高风险提醒 {highRiskAnswers} 次
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-[1.5rem] px-4 py-4 text-sm leading-7 ${
                message.role === "assistant"
                  ? "bg-slate-50 text-slate-700"
                  : "ml-auto max-w-[88%] bg-cyan-700 text-white"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {message.role === "assistant" && message.payload ? (
                <div className="mt-4 space-y-4 rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClassName(message.payload.riskLevel)}`}
                    >
                      {getRiskLabel(message.payload.riskLevel)}
                    </span>
                    <p className="text-sm font-medium text-slate-700">
                      {message.payload.riskSummary}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        下一步动作
                      </h3>
                      <ul className="mt-2 space-y-2 text-sm text-slate-600">
                        {message.payload.nextActions.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        建议核对
                      </h3>
                      <ul className="mt-2 space-y-2 text-sm text-slate-600">
                        {message.payload.checks.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
                    {message.payload.disclaimer}
                  </div>

                  {message.payload.reviewId ? (
                    <div className="rounded-xl bg-cyan-50 px-3 py-2 text-xs leading-6 text-cyan-900">
                      复核编号：{message.payload.reviewId}。这条问题已写入后台复核队列。
                    </div>
                  ) : null}

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      命中的规则资料
                    </h3>
                    <div className="mt-2 space-y-3">
                      {message.payload.sources.length > 0 ? (
                        message.payload.sources.map((item) => (
                          <div
                            key={`${item.source}-${item.title}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">
                                {item.title}
                              </span>
                              <span>{item.source}</span>
                              <span>更新于 {item.updatedAt}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {item.excerpt}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          当前规则库没有命中直接相关资料，回答会更偏谨慎。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ))}

          {isLoading ? (
            <article className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-500">
              正在分析你的问题，并生成风险提示与建议...
            </article>
          ) : null}
        </div>

        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              输入运动员问题
            </span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="例如：我最近感冒，想吃含伪麻黄碱的药，比赛前一周安全吗？"
              className="min-h-32 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
            />
          </label>

          <label className="block rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
            <span className="block text-sm font-medium text-slate-700">
              上传药品或补剂标签图片
            </span>
            <span className="mt-1 block text-xs leading-6 text-slate-500">
              可选。支持 JPG、PNG、WebP，建议图片清晰且小于 4MB。
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            {imageName ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  已选择：{imageName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setImageDataUrl("");
                    setImageName("");
                  }}
                  className="text-xs font-semibold text-rose-600"
                >
                  移除图片
                </button>
              </div>
            ) : null}
          </label>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? "生成中..." : "发送问题"}
            </button>
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              清空本地历史
            </button>
            <a
              href="/admin"
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
            >
              打开复核后台
            </a>
            <p className="text-xs leading-6 text-slate-500">
              当前历史仅保存在本设备浏览器里，方便你继续测试网站流程。
            </p>
          </div>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[2rem] border border-cyan-100 bg-cyan-50 p-6">
          <p className="text-sm font-semibold text-cyan-800">当前网站已经具备的闭环</p>
          <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
            {STATUS_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">快速开始问题</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => fillStarterQuestion(item)}
                className="rounded-full border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">提问前核对清单</h3>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            {CHECKLIST_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">规则快速检索</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              调试视图
            </span>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleRuleSearch}>
            <input
              value={ruleQuery}
              onChange={(event) => setRuleQuery(event.target.value)}
              placeholder="例如：补剂 污染 比赛期"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isRuleLoading}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isRuleLoading ? "检索中..." : "查询规则"}
            </button>
          </form>

          {ruleError ? <p className="mt-3 text-sm text-rose-600">{ruleError}</p> : null}

          <div className="mt-4 space-y-3">
            {ruleMatches.length > 0 ? (
              ruleMatches.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{item.title}</span>
                    <span>{item.source}</span>
                    <span>{item.updatedAt}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.excerpt}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-slate-500">
                这里可以直接测试当前本地规则库能不能命中你的查询词。
              </p>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
