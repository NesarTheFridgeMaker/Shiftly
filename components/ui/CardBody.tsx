import { ReactNode } from "react";

type CardBodyProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

export default function CardBody({
  children,
  className = "",
  compact = false,
}: CardBodyProps) {
  return (
    <div
      className={[
        compact ? "p-5" : "p-6",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}