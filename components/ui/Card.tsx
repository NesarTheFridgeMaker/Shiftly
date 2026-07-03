import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-3xl shadow-[0_10px_24px_rgba(17,24,39,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}