import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/app/components/admin-login-form";

export const metadata = {
  title: "后台登录",
};

export default async function AdminLoginPage() {
  if (await hasAdminSession()) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(224,242,254,0.9),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_55%,#ffffff_100%)] px-5 py-8 text-slate-900">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_24px_90px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
        <p className="text-sm font-semibold text-cyan-700">Admin Console</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          后台登录
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          只有登录后才能查看问题复核记录和更新人工备注。
        </p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
