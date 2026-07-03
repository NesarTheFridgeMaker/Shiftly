import Card from "./Card";
import CardBody from "./CardBody";
import Badge from "./Badge";
import { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: ReactNode;
  subtitle?: string;
  badge?: string;
  badgeVariant?:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "muted";
};

export default function StatCard({
  title,
  value,
  subtitle,
  badge,
  badgeVariant = "primary",
}: StatCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[#6B7280]">
              {title}
            </p>

            <h3 className="mt-3 text-5xl font-light tracking-[-0.03em] text-[#111827]">
              {value}
            </h3>

            {subtitle && (
              <p className="mt-2 text-sm text-[#6B7280]">
                {subtitle}
              </p>
            )}
          </div>

          {badge && (
            <Badge variant={badgeVariant}>
              {badge}
            </Badge>
          )}
        </div>
      </CardBody>
    </Card>
  );
}