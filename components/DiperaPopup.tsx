"use client";

type Props = {
  open: boolean;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
};

export default function DiperaPopup({
  open,
  message,
  onClose,
  onConfirm,
  confirmText = "OK",
  cancelText = "Abbrechen",
}: Props) {
  if (!open) return null;

  const isConfirmPopup = Boolean(onConfirm);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="max-w-lg w-full rounded-3xl bg-[#0B1220] p-8 shadow-2xl text-center">
        <p className="text-white text-2xl font-bold mb-8">
          {message}
        </p>

        {isConfirmPopup ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-700 to-red-500 text-white font-bold hover:scale-105 transition"
            >
              {confirmText}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 text-white font-bold hover:scale-105 transition"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}