import { ReactNode } from "react";

type CardBodyProps = {
  children: ReactNode;
  className?: string;
};

export default function CardBody({
  children,
  className = "",
}: CardBodyProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}