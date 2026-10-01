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
  type = "button",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-[#31AEF0] text-white hover:bg-[#219DDB]",

    secondary:
      "bg-white text-black hover:bg-[#E7EDF1]",

    danger:
      "bg-[#EF4444] text-white hover:bg-[#DC2626]",

    ghost:
      "bg-transparent text-[#667085] hover:bg-[#E7EDF1] hover:text-black",
  };

  const sizes = {
    sm: "h-9 px-3.5 text-sm",
    md: "h-11 px-4.5 text-sm",
    lg: "h-12 px-5.5 text-base",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold",
        "transition-all duration-200 ease-out",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#31AEF0]/20",
        "disabled:pointer-events-none disabled:opacity-50",
        "select-none",
        fullWidth ? "w-full" : "",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.25"
          />
          <path
            d="M21 12a9 9 0 0 1-9 9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}

      {loading ? "Bitte warten..." : children}
    </button>
  );
}