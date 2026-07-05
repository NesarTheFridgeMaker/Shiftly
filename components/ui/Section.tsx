import { ReactNode } from "react";
import Card from "./Card";
import CardHeader from "./CardHeader";
import CardBody from "./CardBody";

type SectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  compact?: boolean;
  hover?: boolean;
};

export default function Section({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "",
  compact = false,
  hover = false,
}: SectionProps) {
  return (
    <Card className={className} hover={hover}>
      <CardHeader
        title={title}
        description={description}
        action={action}
        compact={compact}
      />

      <CardBody className={bodyClassName} compact={compact}>
        {children}
      </CardBody>
    </Card>
  );
}