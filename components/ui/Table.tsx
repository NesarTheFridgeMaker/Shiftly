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
        "overflow-hidden rounded-[24px]",
        "bg-white",
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
    <thead className="bg-[#E7EDF1] text-xs font-bold uppercase tracking-[0.08em] text-[#667085]">
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
    <tr className="transition-colors duration-200 hover:bg-[#F2F5F8]">
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
    <th className="border-b border-black/[0.06] px-5 py-4 text-left">
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
    <td className="border-b border-black/[0.05] px-5 py-4 text-sm text-[#323542]">
      {children}
    </td>
  );
}