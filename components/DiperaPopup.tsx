"use client";

import { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  XCircle,
} from "lucide-react";

import Button from "@/components/ui/Button";

type PopupVariant =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "upgrade";

type Props = {
  open: boolean;

  title?: string;
  message: string;
  highlight?: string;

  variant?: PopupVariant;
  icon?: ReactNode;

  onClose: () => void;
  onConfirm?: () => void;

  confirmText?: string;
  cancelText?: string;

  isConfirmLoading?: boolean;
  closeOnBackdropClick?: boolean;
};

const variantStyles: Record<
  PopupVariant,
  {
    iconWrapper: string;
    iconColor: string;
    defaultIcon: ReactNode;
    confirmVariant:
      | "primary"
      | "secondary"
      | "danger";
  }
> = {
  info: {
    iconWrapper: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    defaultIcon: <Info className="h-6 w-6" />,
    confirmVariant: "primary",
  },

  success: {
    iconWrapper: "bg-[#DCFCE7]",
    iconColor: "text-[#15803D]",
    defaultIcon: <CheckCircle2 className="h-6 w-6" />,
    confirmVariant: "primary",
  },

  warning: {
    iconWrapper: "bg-[#FEF3C7]",
    iconColor: "text-[#B45309]",
    defaultIcon: <AlertTriangle className="h-6 w-6" />,
    confirmVariant: "primary",
  },

  danger: {
    iconWrapper: "bg-[#FEE2E2]",
    iconColor: "text-[#DC2626]",
    defaultIcon: <XCircle className="h-6 w-6" />,
    confirmVariant: "danger",
  },

  upgrade: {
    iconWrapper: "bg-[#EFF6FF]",
    iconColor: "text-[#005CA8]",
    defaultIcon: <Sparkles className="h-6 w-6" />,
    confirmVariant: "primary",
  },
};

export default function DiperaPopup({
  open,

  title,
  message,
  highlight,

  variant = "info",
  icon,

  onClose,
  onConfirm,

  confirmText = "Bestätigen",
  cancelText = "Abbrechen",

  isConfirmLoading = false,
  closeOnBackdropClick = true,
}: Props) {
  if (!open) return null;

  const isConfirmPopup = Boolean(onConfirm);
  const style = variantStyles[variant];

  function handleBackdropClick(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    if (
      !closeOnBackdropClick ||
      isConfirmLoading ||
      event.target !== event.currentTarget
    ) {
      return;
    }

    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={
        title ? "dipera-popup-title" : undefined
      }
      aria-describedby="dipera-popup-message"
      onMouseDown={handleBackdropClick}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm sm:p-6"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-[#E2E8F0] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="p-6 text-center sm:p-8">
          <div
            className={[
              "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl",
              style.iconWrapper,
              style.iconColor,
            ].join(" ")}
          >
            {icon ?? style.defaultIcon}
          </div>

          {title && (
            <h2
              id="dipera-popup-title"
              className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0F172A]"
            >
              {title}
            </h2>
          )}

          {highlight && (
            <div className="mt-5 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-4">
              <p className="text-sm font-medium text-[#64748B]">
                Aktuelles Limit
              </p>

              <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#005CA8]">
                {highlight}
              </p>
            </div>
          )}

          <p
            id="dipera-popup-message"
            className={[
              "text-sm leading-6 text-[#64748B]",
              title || highlight ? "mt-5" : "mt-4",
            ].join(" ")}
          >
            {message}
          </p>

          {isConfirmPopup ? (
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="secondary"
                disabled={isConfirmLoading}
                onClick={onClose}
              >
                {cancelText}
              </Button>

              <Button
                type="button"
                variant={style.confirmVariant}
                loading={isConfirmLoading}
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
    </div>
  );
}