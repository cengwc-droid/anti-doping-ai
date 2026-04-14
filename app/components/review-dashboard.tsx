"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ReviewStatus = "pending" | "needs_review" | "reviewed" | "closed";

type QuestionRecord = {
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

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "待处理",
  needs_review: "需复核",
  reviewed: "已复核",
  closed: "已关闭",
};

const RISK_LABELS: Record<QuestionRecord["riskLevel"], string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  unknown: "待核实",
};

function getRiskClassName(riskLevel: QuestionRecord["riskLevel"]) {
  if (riskLevel === "high") return "bg-rose-100 text-rose-700";
  if (riskLevel === "medium") return "bg-amber-100 text-amber-800";
  if (riskLevel === "low") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-200 text-slate-700";
}

function getStatusClassName(status: ReviewStatus) {
  if (status === "needs_review") return "bg-rose-100 text-rose-700";
  if (status === "reviewed") return "bg-emerald-100 text-emerald-700";
  if (status === "closed") return "bg-slate-200 text-slate-700";
  return "bg-cyan-100 text-cyan-700";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ReviewDashboard() {
  const [records, setRecords] = useState<QuestionRecord[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | QuestionRecord["riskLevel"]>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState("");
  const [statusDraft, setStatusDraft] = useState<ReviewStatus>("needs_review");
  const [noteDraft, setNoteDraft] = useState("");

  const activeRecord = useMemo(
    () => records.find((record) => record.id === activeId),
    [activeId, records],
  );

  const stats = useMemo(
    () => ({
      total: records.length,
      needsReview: records.filter((record) => record.status === "needs_review")
        .length,
      reviewed: records.filter((record) => record.status === "reviewed").length,
      highRisk: records.filter((record) => record.riskLevel === "high").length,
    }),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          record.question,
          record.answer,
          record.riskSummary,
          record.reviewNote,
          record.model,
          ...record.sourceTitles,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesRisk =
        riskFilter === "all" || record.riskLevel === riskFilter;
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;

      return matchesQuery && matchesRisk && matchesStatus;
    });
  }, [query, records, riskFilter, statusFilter]);

  async function loadRecords() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/review", { cache: "no-store" });
      const data = (await response.json()) as
        | { error?: string; records?: QuestionRecord[] }
        | undefined;

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "复核记录加载失败。");
      }

      const nextRecords = data?.records || [];
      setRecords(nextRecords);

      if (!activeId && nextRecords[0]) {
        setActiveId(nextRecords[0].id);
        setStatusDraft(nextRecords[0].status);
        setNoteDraft(nextRecords[0].reviewNote);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "复核记录加载失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectRecord(record: QuestionRecord) {
    setActiveId(record.id);
    setStatusDraft(record.status);
    setNoteDraft(record.reviewNote);
    setError("");
  }

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeRecord) return;

    setError("");

    try {
      const response = await fetch("/api/review", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: activeRecord.id,
          status: statusDraft,
          reviewNote: noteDraft,
        }),
      });
      const data = (await response.json()) as
        | { error?: string; record?: QuestionRecord }
        | undefined;

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok || !data?.record) {
        throw new Error(data?.error || "复核记录更新失败。");
      }

      setRecords((current) =>
        current.map((record) =>
          record.id === data.record?.id ? data.record : record,
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "复核记录更新失败。",
      );
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">全部记录</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {stats.total}
            </p>
          </div>
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold text-rose-700">需复核</p>
            <p className="mt-2 text-3xl font-semibold text-rose-700">
              {stats.needsReview}
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-700">已复核</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">
              {stats.reviewed}
            </p>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800">高风险</p>
            <p className="mt-2 text-3xl font-semibold text-amber-800">
              {stats.highRisk}
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">提问记录</h2>
              <p className="mt-1 text-xs text-slate-500">
                当前显示 {filteredRecords.length} / {records.length} 条
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadRecords()}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              刷新
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-500">
                搜索关键词
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索问题、回答、备注、命中资料"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-500">
                风险等级
              </span>
              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(event.target.value as typeof riskFilter)
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
              >
                <option value="all">全部风险</option>
                {Object.entries(RISK_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-500">
                复核状态
              </span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as typeof statusFilter)
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
              >
                <option value="all">全部状态</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRiskFilter("all");
                setStatusFilter("all");
              }}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              清除筛选
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("needs_review")}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              只看需复核
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter("high")}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              只看高风险
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <p className="text-sm text-slate-500">正在加载复核记录...</p>
            ) : null}

            {!isLoading && records.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-500">
                暂时还没有记录。回到前台提交一个问题后，这里会自动出现复核条目。
              </p>
            ) : null}

            {!isLoading && records.length > 0 && filteredRecords.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-500">
                没有符合当前筛选条件的记录。
              </p>
            ) : null}

            {filteredRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => selectRecord(record)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  record.id === activeId
                    ? "border-cyan-300 bg-cyan-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClassName(record.riskLevel)}`}
                  >
                    {RISK_LABELS[record.riskLevel]}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(record.status)}`}
                  >
                    {STATUS_LABELS[record.status]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatTime(record.createdAt)}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-900">
                  {record.question}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                  {record.riskSummary}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
        {activeRecord ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClassName(activeRecord.riskLevel)}`}
              >
                {RISK_LABELS[activeRecord.riskLevel]}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(activeRecord.status)}`}
              >
                {STATUS_LABELS[activeRecord.status]}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {activeRecord.mode === "qwen" ? "千问" : "演示模式"} ·{" "}
                {activeRecord.model}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">用户问题</p>
              <h2 className="mt-2 text-2xl font-semibold leading-9 text-slate-950">
                {activeRecord.question}
              </h2>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">AI 风险摘要</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {activeRecord.riskSummary}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">AI 回答</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-8 text-slate-700">
                {activeRecord.answer}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">命中资料</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeRecord.sourceTitles.length > 0 ? (
                  activeRecord.sourceTitles.map((title) => (
                    <span
                      key={`${activeRecord.id}-${title}`}
                      className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700"
                    >
                      {title}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">暂无命中资料</span>
                )}
              </div>
            </div>

            <form className="space-y-3 border-t border-slate-200 pt-5" onSubmit={handleReviewSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  人工复核状态
                </span>
                <select
                  value={statusDraft}
                  onChange={(event) =>
                    setStatusDraft(event.target.value as ReviewStatus)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  人工备注
                </span>
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="例如：已转队医复核；需要补充完整成分表；建议查看官方禁用清单。"
                  className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                />
              </label>

              <button
                type="submit"
                className="rounded-full bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
              >
                保存复核结果
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-slate-500">请选择一条提问记录。</p>
        )}
      </div>
    </section>
  );
}
