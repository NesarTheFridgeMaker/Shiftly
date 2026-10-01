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
        <label className="text-sm font-semibold text-[#323542]">
          {label}
        </label>
      )}

      <textarea
        disabled={disabled}
        className={[
          "min-h-[120px] w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#323542]",
          "resize-y transition-all duration-200 ease-out",
          "placeholder:text-[#8A94A3]",
          "focus:outline-none focus:ring-4",
          error
            ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-red-100"
            : "border-black/[0.08] focus:border-[#31AEF0] focus:ring-[#31AEF0]/10",
          "disabled:cursor-not-allowed disabled:bg-[#E7EDF1] disabled:text-[#8A94A3]",
          className,
        ].join(" ")}
        {...props}
      />

      {error ? (
        <p className="text-xs text-[#EF4444]">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#667085]">{helperText}</p>
      ) : null}
    </div>
  );
}