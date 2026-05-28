const bullets = [
  {
    title: "Pick the messy goal.",
    body: "One goal. Six months. Big enough that you cannot fake caring about it.",
  },
  {
    title: "Turn it into receipts.",
    body: "Spiral breaks the goal into months, then weeks. Not motivation. Just the next bit of proof.",
  },
  {
    title: "Fall off. Write it down.",
    body: "Missed weeks still count as data. No guilt. No streak worship. Just evidence that helps you return.",
  },
];

const prompts = [
  "Get 1 million Instagram followers",
  "Make $10k from a thing I built",
  "Write a novel where people can see it",
  "Run a marathon and stay normal about it",
];

const testimonials = [
  {
    quote: "Spiral did not hype me up. Good. It made me write down what I actually did.",
    name: "Nina Patel",
    role: "Building a weird product",
  },
  {
    quote: "I missed two weeks. Nothing exploded. I logged it and kept going.",
    name: "Theo Ramirez",
    role: "Indie creator",
  },
  {
    quote: "It feels like a notebook that calls your bluff. In a useful way.",
    name: "Jordan Lee",
    role: "Writer",
  },
];

const proof = [
  {
    name: "Maya Chen",
    goal: "Publish my first novel",
    week: "Week 19",
    score: "87",
    streak: "18 weeks logged",
    line: "Rewrote the ending before school. It is still rough. But chapter 24 finally exists.",
  },
  {
    name: "Priya Shah",
    goal: "Hit $10k MRR with my startup",
    week: "Week 23",
    score: "91",
    streak: "9 weeks logged",
    line: "Sent the email I kept avoiding. Booked three calls. The deck did not matter.",
  },
  {
    name: "Marcus Reed",
    goal: "Run a sub-4 hour marathon",
    week: "Week 14",
    score: "78",
    streak: "11 weeks logged",
    line: "Tempo run sucked. Kept the pace anyway. Logged the ugly splits.",
  },
  {
    name: "Ava Thompson",
    goal: "Grow my YouTube channel to 100k subscribers",
    week: "Week 27",
    score: "84",
    streak: "16 weeks logged",
    line: "Posted the video I wanted to hide. First 500 views came from the messy version.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#03020a] pb-24 text-white [scroll-behavior:smooth] sm:pb-0">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:72px_72px] motion-safe:animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(217,70,239,0.2),transparent_32%),radial-gradient(circle_at_12%_82%,rgba(59,130,246,0.16),transparent_28%)]" />
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/25 blur-[120px] motion-safe:animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[520px] w-[520px] rounded-full bg-purple-700/30 blur-[140px] motion-safe:animate-pulse" />
      </div>
      <section className="relative isolate flex min-h-screen items-center px-4 py-8 sm:px-10 lg:px-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(38,99,255,0.38),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.34),transparent_28%),radial-gradient(circle_at_60%_85%,rgba(14,165,233,0.18),transparent_35%)]" />
        <div className="absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px] animate-pulse" />
        <div className="absolute left-[12%] top-[18%] -z-10 h-3 w-3 animate-bounce rounded-full bg-cyan-300 shadow-[0_0_28px_rgba(103,232,249,0.9)]" />
        <div className="absolute right-[18%] top-[26%] -z-10 h-2 w-2 animate-ping rounded-full bg-fuchsia-300" />
        <div className="absolute bottom-[22%] left-[48%] -z-10 h-2 w-2 animate-pulse rounded-full bg-blue-300" />
        <div className="absolute left-1/2 top-0 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#05030b] to-transparent" />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-black uppercase tracking-[0.24em] text-blue-200 shadow-[0_0_40px_rgba(59,130,246,0.22)]">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
              Spiral / goal tracking for messy people
            </div>

            <div className="space-y-5">
              <h1 className="max-w-6xl text-5xl font-black uppercase leading-[0.82] tracking-[-0.085em] text-white sm:text-8xl sm:leading-[0.78] sm:tracking-[-0.095em] lg:text-9xl">
                <span className="block animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">Track the goal</span>
                <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
                  <span className="bg-[linear-gradient(90deg,#67e8f9,#a78bfa,#f0abfc,#67e8f9)] bg-[length:300%_100%] bg-clip-text text-transparent motion-safe:animate-pulse">without lying.</span>
                </span>
              </h1>
              <p className="max-w-2xl text-base font-semibold leading-7 text-zinc-300 sm:text-2xl sm:leading-9">
                Spiral is goal tracking that expects chaos. Pick the thing. Log what happened. Use the evidence. No guilt. No streak cult.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="/signup"
                className="group min-h-14 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 px-8 py-4 text-center text-base font-black uppercase tracking-wide text-[#05030b] shadow-[0_0_42px_rgba(59,130,246,0.45)] transition duration-300 active:scale-95 hover:scale-[1.02] hover:shadow-[0_0_70px_rgba(34,211,238,0.55)]"
              >
                Start tracking
                <span className="inline-block transition group-hover:translate-x-1"> →</span>
              </a>
              <a
                href="/login"
                className="min-h-14 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-center text-base font-black uppercase tracking-wide text-white backdrop-blur transition duration-300 active:scale-95 hover:border-cyan-300/60 hover:bg-cyan-300/10"
              >
                I already fell off
              </a>
            </div>

            <div className="grid gap-4 pt-2 md:grid-cols-3">
              {bullets.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/30 backdrop-blur"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/20 text-lg font-black text-cyan-200 ring-1 ring-cyan-300/30">
                    0{index + 1}
                  </div>
                  <h2 className="text-lg font-black uppercase leading-5 tracking-tight text-white">{item.title}</h2>
                  <p className="mt-3 text-sm font-medium leading-6 text-zinc-400">{item.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-cyan-400/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0718]/90 p-5 shadow-2xl shadow-blue-950/40 backdrop-blur-xl sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Goal on the table</p>
                  <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Get 1M followers</h3>
                </div>
                <div className="rounded-2xl border border-purple-300/20 bg-purple-500/10 px-4 py-3 text-right">
                  <p className="text-xs font-bold uppercase text-zinc-400">Spiral score</p>
                  <p className="text-3xl font-black text-purple-200">62%</p>
                </div>
              </div>

              <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Week 1 proof</p>
                <p className="mt-3 text-xl font-black leading-7 text-white">
                  Post 5 reels this week no matter what, even bad ones. Especially bad ones.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm font-bold text-zinc-400">
                  <span>Your Spiral</span>
                  <span>Weeks logged: 5 / blank: 3</span>
                </div>
                <div className="grid grid-cols-8 gap-3">
                  {[8, 6, null, 9, null, 4, 7, null].map((score, index) => (
                    <div
                      key={index}
                      className={`flex aspect-square items-center justify-center rounded-full border text-sm font-black ${
                        score
                          ? "border-cyan-200 bg-gradient-to-br from-cyan-300 to-blue-500 text-[#05030b] shadow-[0_0_24px_rgba(34,211,238,0.45)]"
                          : "border-white/20 bg-white/5 text-zinc-600"
                      }`}
                    >
                      {score ?? ""}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-bold text-zinc-400">Example goals. Big. Dumb. Real:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {prompts.map((prompt) => (
                    <span key={prompt} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-wide text-zinc-200">
                      {prompt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/10 bg-black/20 px-6 py-20 backdrop-blur sm:px-10 lg:px-16">
        <div className="absolute left-10 top-10 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="mx-auto mb-12 max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-300">First setup</p>
          <h2 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-none tracking-[-0.075em] text-white sm:text-7xl">Start simple. Keep it honest.</h2>
        </div>
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {[
            ["01", "Name the thing", "One goal. Not ten. Write the thing you keep thinking about, even if it sounds too big."],
            ["02", "Make proof for this week", "Pick one action you can actually do. Small is fine. Fake plans are not."],
            ["03", "Come back either way", "Did it? Log it. Missed it? Log that too. Spiral works better when you stop hiding the mess."],
          ].map(([number, title, body]) => (
            <div key={title} className="group rounded-[2.35rem] border border-white/10 bg-white/[0.055] p-8 shadow-2xl shadow-blue-950/20 transition duration-300 hover:-translate-y-3 hover:border-cyan-300/50 hover:bg-cyan-300/[0.06] hover:shadow-cyan-950/30">
              <p className="text-6xl font-black tracking-[-0.12em] text-cyan-300/80 transition group-hover:text-fuchsia-300">{number}</p>
              <h3 className="mt-7 text-3xl font-black uppercase leading-none tracking-[-0.055em]">{title}</h3>
              <p className="mt-5 text-base font-semibold leading-7 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-fuchsia-300">Real logs</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-black uppercase leading-none tracking-[-0.075em] sm:text-7xl">Proof beats vibes.</h2>
            </div>
            <a href="/signup" className="rounded-full bg-white px-7 py-4 text-sm font-black uppercase text-[#05030b] shadow-[0_0_34px_rgba(255,255,255,0.28)] transition motion-safe:animate-pulse hover:scale-105 hover:bg-cyan-200 active:scale-95">Start one now</a>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {proof.map((item) => (
              <div key={item.name} className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.025] p-7 transition duration-300 hover:-translate-y-3 hover:border-fuchsia-300/50 hover:shadow-2xl hover:shadow-fuchsia-950/25">
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-3xl transition group-hover:bg-cyan-300/25" />
                <div className="relative mb-7 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-black uppercase leading-none">{item.name}</p>
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">{item.week}</p>
                  </div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-lg font-black text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.18)] group-hover:animate-spin">{item.score}</div>
                </div>
                <p className="relative text-2xl font-black uppercase leading-[0.95] tracking-[-0.06em] text-white">{item.goal}</p>
                <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-zinc-500">Logged weeks</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-cyan-200">{item.streak}</p>
                </div>
                <p className="relative mt-5 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-5 text-sm font-bold leading-6 text-fuchsia-100">&ldquo;{item.line}&rdquo;</p>
                <div className="relative mt-6">
                  <div className="flex justify-between text-[0.65rem] font-black uppercase tracking-[0.22em] text-zinc-500">
                    <span>Spiral score</span>
                    <span>{item.score}/100</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-5xl font-black uppercase leading-none tracking-[-0.06em] sm:text-7xl">
            Ready to track the <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">mess?</span>
          </h2>
          <p className="mt-6 text-xl font-medium text-zinc-300">Stop pretending it will be neat. Start logging what happens.</p>
          <a href="/signup" className="mt-10 inline-block rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 px-12 py-5 text-lg font-black uppercase tracking-wide text-[#05030b] shadow-[0_0_42px_rgba(59,130,246,0.45)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_70px_rgba(34,211,238,0.55)]">
            Start tracking &rarr;
          </a>
        </div>
      </section>
    </main>
  );
}
