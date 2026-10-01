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
        "flex flex-col items-center justify-center rounded-[24px]",
        "bg-[#E7EDF1] text-center",
        compact ? "px-5 py-8" : "px-6 py-12",
      ].join(" ")}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
        {icon ?? (
          <svg
            className="h-6 w-6 text-[#8A94A3]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4" />
            <circle
              cx="12"
              cy="16"
              r="1"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        )}
      </div>

      <h3 className="text-xl font-bold tracking-[-0.025em] text-black">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-[#667085]">
          {description}
        </p>
      )}

      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}