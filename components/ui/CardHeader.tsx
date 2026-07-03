import { ReactNode } from "react";

type CardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function CardHeader({
  title,
  description,
  action,
}: CardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-[#E5E7EB] px-6 py-5">
      <div>
        <h2 className="text-2xl font-normal tracking-[-0.02em] text-[#111827]">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-[#6B7280]">
            {description}
          </p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}