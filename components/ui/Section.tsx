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
};

export default function Section({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "",
}: SectionProps) {
  return (
    <Card className={className}>
      <CardHeader
        title={title}
        description={description}
        action={action}
      />

      <CardBody className={bodyClassName}>
        {children}
      </CardBody>
    </Card>
  );
}