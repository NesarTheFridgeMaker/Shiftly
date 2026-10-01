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
        "relative overflow-hidden rounded-[28px]",
        "bg-[#F2F5F8]",
        "transition-all duration-200 ease-out",
        hover ? "hover:bg-[#E7EDF1]" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}