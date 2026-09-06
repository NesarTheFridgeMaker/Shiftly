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
  const valueLength =
    typeof value === "string" || typeof value === "number"
      ? String(value).length
      : 0;

  let valueSize = "text-4xl";

  if (valueLength >= 8) {
    valueSize = "text-3xl";
  }

  if (valueLength >= 11) {
    valueSize = "text-2xl";
  }

  return (
    <Card>
      <CardBody>
        <div className="min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm text-[#6B7280]">
              {title}
            </p>

            {badge && (
              <div className="shrink-0">
                <Badge variant={badgeVariant}>
                  {badge}
                </Badge>
              </div>
            )}
          </div>

          <div
            className={`
              mt-4
              min-w-0
              whitespace-nowrap
              font-light
              leading-none
              tracking-[-0.035em]
              text-[#111827]
              ${valueSize}
            `}
          >
            {value}
          </div>

          {subtitle && (
            <p className="mt-3 text-sm text-[#6B7280]">
              {subtitle}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}