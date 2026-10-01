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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-lg
          rounded-[30px]
          bg-white
          shadow-[0_28px_80px_rgba(17,24,39,0.16)]
          animate-[fadeIn_.18s_ease-out]
        "
      >
        <div className="px-6 pt-6 sm:px-7 sm:pt-7">
          <h2 className="text-2xl font-bold tracking-[-0.03em] text-black">
            {title}
          </h2>

          {description && (
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="px-6 pt-6 sm:px-7">
            {children}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 px-6 pb-6 sm:flex-row sm:justify-end sm:px-7 sm:pb-7">
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