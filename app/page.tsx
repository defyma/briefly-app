import Link from "next/link";

export default function Home() {
  const products = [
    {
      name: "Meeting Notes",
      description:
        "Turn rough meeting notes into a clear summary, decisions, action items, and open questions.",
    },
    {
      name: "Task Breakdown",
      description:
        "Split a big goal into practical steps, priorities, and a checklist you can actually execute.",
    },
    {
      name: "Reply Draft",
      description:
        "Draft concise replies for email or chat with tone-aware follow-ups in seconds.",
    },
    {
      name: "Chat",
      description:
        "Brainstorm, refine, and continue ideas from any generated result in one focused thread.",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.7),_transparent_30%),linear-gradient(180deg,_#f6efe5_0%,_#f5f0e8_32%,_#efe4d1_100%)] text-stone-900">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.28em] text-stone-500">
              Briefly
            </p>
            <p className="mt-2 text-sm text-stone-600">
              Productivity copilot for messy notes, big goals, and replies.
            </p>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              className="rounded-full bg-stone-900 px-4 py-2 !text-white transition hover:bg-stone-700"
              href="/app"
            >
              Open app
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <h1 className="max-w-3xl font-sans text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-stone-950 sm:text-6xl lg:text-7xl">
              One workspace for four productivity moves that happen every day.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl">
              Briefly turns raw notes into action, breaks big goals into steps,
              drafts replies you can send with confidence, and gives you space to brainstorm the next move.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                className="rounded-full bg-stone-950 px-6 py-3 text-center text-base font-medium !text-white transition hover:bg-stone-800"
                href="/app"
              >
                Launch workspace
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_30px_80px_rgba(80,52,24,0.12)] backdrop-blur">
            <div className="rounded-[1.5rem] bg-stone-950 p-6 text-stone-50">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-stone-400">
                <span>Today in Briefly</span>
                <span>4 tools</span>
              </div>
              <div className="mt-6 space-y-4">
                {products.map((product) => (
                  <article
                    key={product.name}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <h2 className="text-lg font-medium text-white">
                      {product.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-stone-300">
                      {product.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-stone-300/60 py-8 text-sm text-stone-600">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p>Briefly by @defyma (Defy M Aminuddin)</p>
              <p>
                Made with ♡ by{" "}
                <a
                  className="text-stone-800 transition hover:text-stone-950"
                  href="https://pollinations.ai"
                  target="_blank"
                  rel="noreferrer"
                >
                  Pollinations.AI
                </a>
              </p>
            </div>
            <a
              className="text-stone-800 transition hover:text-stone-950"
              href="https://github.com/defyma/briefly-app"
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub 🐙
            </a>
          </div>
        </footer>
      </section>
    </main>
  );
}
