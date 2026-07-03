import { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export default function Textarea({
  label,
  error,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[#111827]">
          {label}
        </label>
      )}

      <textarea
        className={[
          "min-h-[120px] rounded-xl border bg-white px-4 py-3 text-sm text-[#111827] outline-none transition resize-y",
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