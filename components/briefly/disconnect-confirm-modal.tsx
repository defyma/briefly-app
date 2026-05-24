type DisconnectConfirmModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export function DisconnectConfirmModal(props: DisconnectConfirmModalProps) {
  const { onCancel, onConfirm } = props;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-rose-300/15 bg-[#171414] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div>
          <p className="text-base font-medium text-white">Disconnect Pollinations?</p>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            This will remove the saved BYOP session from this browser. You can connect again anytime.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-stone-200 transition hover:border-white/20 hover:bg-white/5"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-rose-200 px-5 py-3 text-sm font-medium text-rose-950 transition hover:bg-rose-100"
            type="button"
            onClick={onConfirm}
          >
            Yes, disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
