import { SelectHTMLAttributes } from "react";

type Option = {
  value: string;
  label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  options: Option[];
};

export default function Select({
  label,
  error,
  helperText,
  options,
  className = "",
  disabled,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[#0F172A]">
          {label}
        </label>
      )}

      <select
        disabled={disabled}
        className={[
          "h-12 w-full rounded-xl border bg-white px-4 text-sm text-[#111827]",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-4",
          error
            ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-red-100"
            : "border-[#CBD5E1] focus:border-[#2563EB] focus:ring-blue-100",
          "disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed",
          className,
        ].join(" ")}
        {...props}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

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