import { BYOP_MODEL_OPTIONS } from "@/lib/briefly-tools";

const DEFAULT_BYOP_BUDGET = "10";
const DEFAULT_BYOP_EXPIRY_DAYS = "7";

type ByopSettingsModalProps = {
  byopConnected: boolean;
  byopNotice: string;
  selectedModel: string;
  onClose: () => void;
  onConnect: () => void;
  onDisconnectRequest: () => void;
  onSelectModel: (value: string) => void;
};

export function ByopSettingsModal(props: ByopSettingsModalProps) {
  const {
    byopConnected,
    byopNotice,
    selectedModel,
    onClose,
    onConnect,
    onDisconnectRequest,
    onSelectModel,
  } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-emerald-400/15 bg-[#171414] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">BYOP Settings</p>
            <p className="mt-1 text-sm leading-6 text-emerald-50/80">
              Connect Pollinations, pick a model, and manage this browser session.
            </p>
          </div>
          <button
            aria-label="Close BYOP settings"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300 transition hover:border-white/20 hover:text-white"
            type="button"
            onClick={onClose}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Connect Pollinations</p>
              <p className="mt-1 text-sm leading-6 text-emerald-50/80">
                Official BYOP flow for Briefly.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!byopConnected ? (
                <button
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-stone-950 transition hover:bg-stone-100"
                  type="button"
                  onClick={onConnect}
                >
                  Connect Pollinations
                </button>
              ) : null}
              {byopConnected ? (
                <button
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/5"
                  type="button"
                  onClick={onDisconnectRequest}
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-emerald-50/75">
            <span className="rounded-full border border-white/10 px-3 py-2">
              {byopConnected ? "connected" : "not connected"}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              budget {DEFAULT_BYOP_BUDGET}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              expiry {DEFAULT_BYOP_EXPIRY_DAYS}d
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              route /app
            </span>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm text-emerald-100">Model</label>
          <select
            className="mt-2 w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm text-white outline-none"
            value={selectedModel}
            onChange={(event) => onSelectModel(event.target.value)}
          >
            {BYOP_MODEL_OPTIONS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.id} = {model.label}
              </option>
            ))}
          </select>
        </div>

        {byopNotice ? (
          <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-200/10 px-4 py-3 text-sm text-emerald-50">
            {byopNotice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
