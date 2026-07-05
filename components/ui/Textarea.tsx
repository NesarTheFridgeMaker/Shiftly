import { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  helperText?: string;
};

export default function Textarea({
  label,
  error,
  helperText,
  className = "",
  disabled,
  ...props
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[#0F172A]">
          {label}
        </label>
      )}

      <textarea
        disabled={disabled}
        className={[
          "min-h-[120px] w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#111827]",
          "resize-y transition-all duration-200 ease-out",
          "placeholder:text-[#94A3B8]",
          "focus:outline-none focus:ring-4",
          error
            ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-red-100"
            : "border-[#CBD5E1] focus:border-[#2563EB] focus:ring-blue-100",
          "disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed",
          className,
        ].join(" ")}
        {...props}
      />

      {error ? (
        <p className="text-xs text-[#EF4444]">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-[#64748B]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}