import { ReactNode, useEffect } from "react";
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
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-lg
          rounded-3xl
          border border-[#E2E8F0]
          bg-white
          shadow-[0_24px_60px_rgba(15,23,42,0.18)]
          animate-[fadeIn_.18s_ease-out]
        "
      >
        <div className="px-6 pt-6">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
            {title}
          </h2>

          {description && (
            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="px-6 pt-6">
            {children}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#E2E8F0] px-6 py-5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>

          {onConfirm && (
            <Button
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