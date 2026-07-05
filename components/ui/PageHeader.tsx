import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
};

export default function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: PageHeaderProps) {
  return (
    <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
            {eyebrow}
          </p>
        )}

        <h1 className="text-[2.6rem] leading-tight font-light tracking-[-0.04em] text-[#0F172A]">
          {title}
        </h1>

        {description && (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#64748B]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex shrink-0 items-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}