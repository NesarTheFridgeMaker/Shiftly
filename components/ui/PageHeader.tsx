import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
      <div>
        <h1 className="text-[2.6rem] leading-tight font-light tracking-[-0.04em] text-[#111827]">
          {title}
        </h1>

        {description && (
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}