import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({
  label,
  error,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[#111827]">
          {label}
        </label>
      )}

      <input
        className={[
          "h-12 rounded-xl border bg-white px-4 text-sm text-[#111827] outline-none transition",
          error
            ? "border-[#EF4444] focus:border-[#EF4444]"
            : "border-[#CBD5E1] focus:border-[#2563EB]",
          "placeholder:text-[#94A3B8] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]",
          className,
        ].join(" ")}
        {...props}
      />

      {error && (
        <p className="text-xs text-[#EF4444]">
          {error}
        </p>
      )}
    </div>
  );
}