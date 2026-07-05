import { ReactNode } from "react";

type TableProps = {
  children: ReactNode;
  className?: string;
};

export function Table({
  children,
  className = "",
}: TableProps) {
  return (
    <div
      className={[
        "overflow-hidden rounded-3xl",
        "border border-[#E2E8F0]",
        "bg-white",
        "shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <thead className="bg-[#F8FAFC] text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
      {children}
    </thead>
  );
}

export function TableBody({
  children,
}: {
  children: ReactNode;
}) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <tr
      className="
        transition-colors
        duration-200
        hover:bg-[#F8FAFC]
        even:bg-white
      "
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="border-b border-[#E2E8F0] px-5 py-4 text-left">
      {children}
    </th>
  );
}

export function TableCell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <td className="border-b border-[#F1F5F9] px-5 py-4 text-sm text-[#0F172A]">
      {children}
    </td>
  );
}