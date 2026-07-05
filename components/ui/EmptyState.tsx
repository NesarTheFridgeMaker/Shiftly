import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
};

export default function EmptyState({
  title,
  description,
  action,
  icon,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#CBD5E1]",
        "bg-[#F8FAFC] text-center",
        compact ? "px-5 py-8" : "px-6 py-12",
      ].join(" ")}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        {icon ?? (
          <svg
            className="h-6 w-6 text-[#94A3B8]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4" />
            <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
          </svg>
        )}
      </div>

      <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#0F172A]">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-[#64748B]">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-7">
          {action}
        </div>
      )}
    </div>
  );
}