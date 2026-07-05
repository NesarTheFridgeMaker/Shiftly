import { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "muted";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
};

export default function Badge({
  children,
  variant = "default",
  className = "",
  dot = false,
}: BadgeProps) {
  const variants = {
    default: "bg-[#F1F5F9] text-[#0F172A]",
    primary: "bg-[#EFF6FF] text-[#2563EB]",
    success: "bg-[#DCFCE7] text-[#15803D]",
    warning: "bg-[#FEF3C7] text-[#B45309]",
    danger: "bg-[#FEE2E2] text-[#DC2626]",
    muted: "bg-[#F8FAFC] text-[#64748B]",
  };

  const dotColors = {
    default: "bg-[#94A3B8]",
    primary: "bg-[#2563EB]",
    success: "bg-[#16A34A]",
    warning: "bg-[#D97706]",
    danger: "bg-[#DC2626]",
    muted: "bg-[#94A3B8]",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        "text-xs font-medium whitespace-nowrap",
        variants[variant],
        className,
      ].join(" ")}
    >
      {dot && (
        <span
          className={[
            "h-2 w-2 rounded-full",
            dotColors[variant],
          ].join(" ")}
        />
      )}

      {children}
    </span>
  );
}