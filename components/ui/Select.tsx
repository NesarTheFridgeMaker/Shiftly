import { SelectHTMLAttributes } from "react";

type Option = {
  value: string;
  label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: Option[];
};

export default function Select({
  label,
  error,
  options,
  className = "",
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[#111827]">
          {label}
        </label>
      )}

      <select
        className={[
          "h-12 rounded-xl border bg-white px-4 text-sm text-[#111827] outline-none transition",
          error
            ? "border-[#EF4444] focus:border-[#EF4444]"
            : "border-[#CBD5E1] focus:border-[#2563EB]",
          "disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]",
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

      {error && (
        <p className="text-xs text-[#EF4444]">
          {error}
        </p>
      )}
    </div>
  );
}