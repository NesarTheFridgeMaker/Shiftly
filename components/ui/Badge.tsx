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
    default: "bg-[#E7EDF1] text-[#323542]",
    primary: "bg-[#E7F5FC] text-[#168FD0]",
    success: "bg-[#DCFCE7] text-[#15803D]",
    warning: "bg-[#FEF3C7] text-[#B45309]",
    danger: "bg-[#FEE2E2] text-[#DC2626]",
    muted: "bg-white text-[#667085]",
  };

  const dotColors = {
    default: "bg-[#8A94A3]",
    primary: "bg-[#31AEF0]",
    success: "bg-[#16A34A]",
    warning: "bg-[#D97706]",
    danger: "bg-[#DC2626]",
    muted: "bg-[#8A94A3]",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        "whitespace-nowrap text-xs font-semibold",
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