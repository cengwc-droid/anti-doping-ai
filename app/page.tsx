import { AntiDopingAssistant } from "./components/anti-doping-assistant";

const principles = [
  "先识别风险，再给出下一步核验建议",
  "图片识别只作辅助，关键信息进入人工复核",
  "回答展示命中资料、风险等级和复核编号",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(224,242,254,0.85),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_42%,#ffffff_100%)] px-5 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/90 px-6 py-6 shadow-[0_24px_90px_-55px_rgba(15,23,42,0.55)] backdrop-blur sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
                Anti-Doping AI
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                运动员兴奋剂风险问答与复核工作台
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-600">
                面向药品、补剂、治疗豁免和比赛期用药场景，提供规则检索、AI
                风险提示、标签图片识别和后台人工复核闭环。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#ask"
                className="rounded-full bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
              >
                开始提问
              </a>
              <a
                href="/admin"
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
              >
                后台复核
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {principles.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </header>

        <section id="ask">
          <AntiDopingAssistant />
        </section>
      </div>
    </main>
  );
}
