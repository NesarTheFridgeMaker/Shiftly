import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-[0_8px_18px_rgba(37,99,235,0.18)]",
    secondary:
      "bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F8FAFC]",
    danger: "bg-[#EF4444] text-white hover:bg-red-600",
    ghost:
      "bg-transparent text-[#6B7280] hover:text-[#111827] hover:bg-[#F1F5F9]",
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-sm",
    lg: "h-12 px-5 text-base",
  };

  return (
    <button
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        fullWidth ? "w-full" : "",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? "Bitte warten..." : children}
    </button>
  );
}