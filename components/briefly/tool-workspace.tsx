import { BrieflyLogo } from "@/components/briefly-logo";
import type {
  GeneratedBrief,
  GeneratedSection,
  ToolDefinition,
  ToolId,
} from "@/lib/briefly-tools";
import { TOOL_DEFINITIONS } from "@/lib/briefly-tools";

type ToolState = {
  input: string;
  result: GeneratedBrief | null;
  error: string;
  isLoading: boolean;
};

type LoadingOutputProps = {
  toolName: string;
};

type ToolWorkspaceProps = {
  activeTool: ToolDefinition;
  activeState: ToolState;
  activeViewLabel: string;
  chatAvailable: boolean;
  copiedToolId: ToolId | null;
  featuresLocked: boolean;
  resolvedModel: string;
  onCopy: (toolId: ToolId) => void | Promise<void>;
  onDiscussInChat: (toolId: ToolId) => void;
  onGenerate: (toolId: ToolId) => void | Promise<void>;
  onInputChange: (toolId: ToolId, value: string) => void;
  onOpenSettings: () => void;
  onSetActiveView: (toolId: ToolId | "chat") => void;
};

function LoadingOutput({ toolName }: LoadingOutputProps) {
  return (
    <div className="mt-4 flex flex-1 flex-col px-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-950">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-stone-950" />
              <span
                className="h-2.5 w-2.5 animate-pulse rounded-full bg-stone-950"
                style={{ animationDelay: "140ms" }}
              />
            </span>
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-cyan-200/80">
            AI processing
          </p>
        </div>
        <div className="rounded-full border border-cyan-200/15 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100/80">
          {toolName}
        </div>
      </div>

      <div className="mt-14 flex items-center gap-3 text-3xl italic text-stone-300">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
        <span>Thinking...</span>
      </div>

      <p className="mt-5 max-w-xl text-sm leading-7 text-stone-400">
        Briefly is reading the input, structuring the response, and preparing a cleaner output card.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[1.25rem] border border-white/8 bg-black/20 p-4"
          >
            <div className="h-3 w-28 animate-pulse rounded-full bg-white/15" />
            <div className="mt-4 space-y-3">
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
          Pipeline
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
            Read input
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
            Detect intent
          </span>
          <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-amber-100">
            Structure output
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
            Render result
          </span>
        </div>
      </div>
    </div>
  );
}

function RenderOutputSections({ sections }: { sections: GeneratedSection[] }) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {sections.map((section) => (
        <section
          key={section.key}
          className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4"
        >
          <h4 className="text-sm font-medium uppercase tracking-[0.18em] text-stone-300">
            {section.label}
          </h4>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-200">
            {section.items.map((item, index) => (
              <li
                key={`${section.key}-${index}`}
                className="rounded-xl bg-white/5 px-3 py-2"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ToolWorkspace(props: ToolWorkspaceProps) {
  const {
    activeTool,
    activeState,
    activeViewLabel,
    chatAvailable,
    copiedToolId,
    featuresLocked,
    resolvedModel,
    onCopy,
    onDiscussInChat,
    onGenerate,
    onInputChange,
    onOpenSettings,
    onSetActiveView,
  } = props;

  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <section className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <BrieflyLogo imageClassName="h-10 w-auto" variant="dark" />
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                Three focused tools, one calmer workflow.
              </h1>
            </div>

            <button
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20"
              type="button"
              onClick={onOpenSettings}
            >
              Show BYOP settings
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-stone-300">
              {featuresLocked ? "Features locked" : "BYOP connected"}
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-stone-300">
              Model: {resolvedModel || "none"}
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-stone-300">
              Active view: {activeViewLabel}
            </div>
          </div>

          {featuresLocked ? (
            <p className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
              Connect Pollinations first. All Briefly tools and chat are disabled until BYOP is connected.
            </p>
          ) : null}
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          {TOOL_DEFINITIONS.map((tool) => {
            const isActive = tool.id === activeTool.id;

            return (
              <button
                key={tool.id}
                className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-amber-200 text-stone-950"
                    : "border border-white/10 bg-white/5 text-stone-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
                type="button"
                onClick={() => onSetActiveView(tool.id)}
              >
                {tool.name}
              </button>
            );
          })}
          <button
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-stone-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!chatAvailable}
            type="button"
            onClick={() => onSetActiveView("chat")}
          >
            Chat
          </button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-medium text-white">{activeTool.name}</h2>
            <p className="mt-2 text-sm leading-7 text-stone-400">
              {activeTool.shortDescription}
            </p>

            <label className="mt-6 block text-sm text-stone-300">
              {activeTool.inputLabel}
            </label>
            <textarea
              className="mt-2 min-h-72 w-full rounded-[1.5rem] border border-white/10 bg-stone-900/80 px-4 py-4 text-sm text-stone-100 outline-none placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={featuresLocked}
              placeholder={activeTool.placeholder}
              value={activeState.input}
              onChange={(event) => onInputChange(activeTool.id, event.target.value)}
            />

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-amber-200 px-5 py-3 text-sm font-medium text-stone-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={featuresLocked || activeState.isLoading}
                type="button"
                onClick={() => void onGenerate(activeTool.id)}
              >
                {activeState.isLoading ? "Generating..." : activeTool.ctaLabel}
              </button>
            </div>

            {activeState.error ? (
              <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {activeState.error}
              </p>
            ) : null}
          </section>

          <section
            className={`flex min-h-[38rem] flex-col rounded-[2rem] border p-5 ${
              activeState.isLoading
                ? "thinking-shell border border-transparent bg-white/5"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                    Output
                  </p>
                  <p className="mt-2 text-sm text-stone-400">
                    {activeTool.introLabel}
                  </p>
                </div>
              </div>

              {activeState.isLoading ? (
                <LoadingOutput toolName={activeTool.name} />
              ) : activeState.result ? (
                <div className="mt-4 flex flex-1 flex-col">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xl font-medium text-white">
                        {activeState.result.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {activeState.result.model &&
                        activeState.result.mode === "pollinations" ? (
                          <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-300">
                            {activeState.result.model}
                          </div>
                        ) : null}
                        <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-300">
                          {activeState.result.mode}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-200/20 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={featuresLocked}
                        type="button"
                        onClick={() => onDiscussInChat(activeTool.id)}
                      >
                        Discuss in Chat
                      </button>
                      <button
                        className="rounded-full border border-white/10 px-3 py-2 text-xs text-stone-300 transition hover:border-white/30 hover:text-white"
                        type="button"
                        onClick={() => void onCopy(activeTool.id)}
                      >
                        {copiedToolId === activeTool.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-stone-300">
                      {activeState.result.intro}
                    </p>
                    {activeState.result.warning ? (
                      <p className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
                        {activeState.result.warning}
                      </p>
                    ) : null}
                  </div>

                  <RenderOutputSections sections={activeState.result.sections} />
                </div>
              ) : (
                <div className="mt-4 flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 px-6 text-center text-sm leading-7 text-stone-500">
                  Choose a tool, add input, then generate to see a wider and cleaner structured result here.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-7xl px-6 pb-8 pt-2 text-sm text-stone-500 sm:px-10 lg:px-12">
        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>Briefly by @defyma (Defy M Aminuddin)</p>
            <p>
              Made with ♡ by{" "}
              <a
                className="text-stone-300 transition hover:text-white"
                href="https://pollinations.ai"
                target="_blank"
                rel="noreferrer"
              >
                Pollinations.AI
              </a>
            </p>
          </div>
          <a
            className="text-stone-300 transition hover:text-white"
            href="https://github.com/defyma/briefly-app"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub 🐙
          </a>
        </div>
      </footer>
    </main>
  );
}
