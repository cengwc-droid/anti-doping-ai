import { AntiDopingAssistant } from "./components/anti-doping-assistant";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(224,242,254,0.85),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_42%,#ffffff_100%)] px-5 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[1.5rem] border border-white/70 bg-white/90 px-5 py-4 shadow-[0_18px_70px_-55px_rgba(15,23,42,0.55)] backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                Anti-Doping AI
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                兴奋剂风险问答工作台
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                药品、补剂、标签图片和比赛期用药风险的合规初筛。
              </p>
            </div>

            <a
              href="/admin"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
            >
              后台复核
            </a>
          </div>
        </header>

        <section id="ask">
          <AntiDopingAssistant />
        </section>
      </div>
    </main>
  );
}
