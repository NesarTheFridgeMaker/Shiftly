"use client";

import Button from "@/components/ui/Button";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/35 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-[#E5E7EB] bg-white p-6 text-center shadow-[0_24px_70px_rgba(17,24,39,0.18)]">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
          !
        </div>

        <p className="text-xl font-light leading-8 tracking-[-0.02em] text-[#111827]">
          {message}
        </p>

        {isConfirmPopup ? (
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              {cancelText}
            </Button>

            <Button
              type="button"
              variant="danger"
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="primary"
              onClick={onClose}
            >
              OK
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}