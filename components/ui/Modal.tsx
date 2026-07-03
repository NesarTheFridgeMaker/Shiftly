import { ReactNode } from "react";
import Button from "./Button";

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose: () => void;
  isDanger?: boolean;
};

export default function Modal({
  isOpen,
  title,
  description,
  children,
  confirmText = "Bestätigen",
  cancelText = "Abbrechen",
  onConfirm,
  onClose,
  isDanger = false,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_60px_rgba(17,24,39,0.18)]">
        <h2 className="text-2xl font-normal tracking-[-0.02em] text-[#111827]">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            {description}
          </p>
        )}

        {children && <div className="mt-6">{children}</div>}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>

          {onConfirm && (
            <Button
              type="button"
              variant={isDanger ? "danger" : "primary"}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}