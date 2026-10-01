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
          <p className="mb-3 inline-flex rounded-full bg-[#E7F5FC] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.10em] text-[#168FD0]">
            {eyebrow}
          </p>
        )}

        <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.05em] text-black">
          {title}
        </h1>

        {description && (
          <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#667085]">
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