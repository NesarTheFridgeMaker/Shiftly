"use client";

import { InputHTMLAttributes } from "react";

type TimeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string) => void;
};

function formatTime(rawValue: string) {
  const cleaned = rawValue.replace(/\D/g, "").slice(0, 4);

  if (!cleaned) return "";

  if (cleaned.length <= 2) {
    return cleaned;
  }

  if (cleaned.length === 3) {
    return `0${cleaned.slice(0, 1)}:${cleaned.slice(1)}`;
  }

  return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
}

function normalizeOnBlur(value: string) {
  const cleaned = value.replace(/\D/g, "");

  if (!cleaned) return "";

  if (cleaned.length === 1) {
    return `0${cleaned}:00`;
  }

  if (cleaned.length === 2) {
    return `${cleaned}:00`;
  }

  if (cleaned.length === 3) {
    return `0${cleaned.slice(0, 1)}:${cleaned.slice(1)}`;
  }

  return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
}

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;

  const [hours, minutes] = value.split(":").map(Number);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export default function TimeInput({
  label,
  error,
  helperText,
  value,
  onChange,
  className = "",
  disabled,
  ...props
}: TimeInputProps) {
  const hasFormatError = value.length === 5 && !isValidTime(value);
  const hasError = Boolean(error) || hasFormatError;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[#0F172A]">
          {label}
        </label>
      )}

      <input
        type="text"
        inputMode="numeric"
        placeholder="HH:MM"
        disabled={disabled}
        value={value}
        onChange={(event) => {
        const value = event.target.value
            .replace(/[^\d:]/g, "")
            .slice(0, 5);

        onChange(value);
        }}
        onBlur={() => onChange(normalizeOnBlur(value))}
        className={[
          "h-12 w-full rounded-xl border bg-white px-4 text-sm text-[#111827]",
          "transition-all duration-200 ease-out",
          "placeholder:text-[#94A3B8]",
          "focus:outline-none focus:ring-4",
          hasError
            ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-red-100"
            : "border-[#CBD5E1] focus:border-[#2563EB] focus:ring-blue-100",
          "disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed",
          className,
        ].join(" ")}
        {...props}
      />

      {error ? (
        <p className="text-xs text-[#EF4444]">{error}</p>
      ) : hasFormatError ? (
        <p className="text-xs text-[#EF4444]">
          Bitte gib eine gültige Uhrzeit ein.
        </p>
      ) : helperText ? (
        <p className="text-xs text-[#64748B]">{helperText}</p>
      ) : null}
    </div>
  );
}