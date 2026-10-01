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
        "flex flex-col gap-4",
        "md:flex-row md:items-start md:justify-between",
        compact ? "px-5 pt-5" : "px-6 pt-6",
      ].join(" ")}
    >
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-[-0.03em] text-black">
          {title}
        </h2>

        {description && (
          <p className="mt-1.5 text-sm leading-6 text-[#667085]">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}