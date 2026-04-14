import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { ReviewDashboard } from "../components/review-dashboard";

export const metadata = {
  title: "复核后台",
};

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_55%,#ffffff_100%)] px-5 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_90px_-55px_rgba(15,23,42,0.5)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-cyan-700">
                Review Console
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                问题复核后台
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                这里用于查看运动员提问、AI 风险判断、命中的规则资料和人工复核状态。
                当前版本使用本地文件存储，适合内测；正式部署时建议换成数据库和账号权限。
              </p>
            </div>

            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              返回前台
            </Link>
            <form action="/api/admin/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                退出登录
              </button>
            </form>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">
              {session.username} · {session.role === "admin" ? "管理员" : "审核员"}
            </span>
          </div>
        </header>

        <ReviewDashboard />
      </div>
    </main>
  );
}
