import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export default function Card({
  children,
  className = "",
  hover = false,
}: CardProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl",
        "border border-[#E2E8F0]",
        "bg-white",
        "shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
        "transition-all duration-200 ease-out",
        hover
          ? "hover:-translate-y-1 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)]"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}