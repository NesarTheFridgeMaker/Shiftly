import { ReactNode } from "react";

type PageActionsProps = {
  children: ReactNode;
  className?: string;
  align?: "left" | "right" | "between";
};

export default function PageActions({
  children,
  className = "",
  align = "right",
}: PageActionsProps) {
  const alignment = {
    left: "sm:justify-start",
    right: "sm:justify-end",
    between: "sm:justify-between",
  };

  return (
    <div
      className={[
        "flex flex-col gap-3",
        "sm:flex-row sm:items-center",
        alignment[align],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}