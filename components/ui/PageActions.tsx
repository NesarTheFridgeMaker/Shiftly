import { ReactNode } from "react";

type PageActionsProps = {
  children: ReactNode;
  className?: string;
};

export default function PageActions({
  children,
  className = "",
}: PageActionsProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end ${className}`}
    >
      {children}
    </div>
  );
}