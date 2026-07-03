import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12">
      <div className="mb-4 h-12 w-12 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_10px_24px_rgba(17,24,39,0.06)]" />

      <h3 className="text-xl font-normal tracking-[-0.02em] text-[#111827]">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-[#6B7280]">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}