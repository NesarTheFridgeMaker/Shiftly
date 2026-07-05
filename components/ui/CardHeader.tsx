import { ReactNode } from "react";

type CardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
};

export default function CardHeader({
  title,
  description,
  action,
  compact = false,
}: CardHeaderProps) {
  return (
    <div
      className={[
        "flex flex-col gap-4 border-b border-[#E2E8F0]",
        "md:flex-row md:items-start md:justify-between",
        compact ? "px-5 py-4" : "px-6 py-5",
      ].join(" ")}
    >
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-[#64748B]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}