import Skeleton from "@/components/ui/Skeleton";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export default function TableSkeleton({
  rows = 6,
  columns = 5,
}: TableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-sm">
      {/* Tabellenkopf */}
      <div className="grid border-b border-[#E2E8F0] bg-[#F8FAFC] p-5">
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-4 w-20"
            />
          ))}
        </div>
      </div>

      {/* Tabellenzeilen */}
      <div>
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="grid border-b border-[#F1F5F9] p-5 last:border-b-0"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, column) => (
              <Skeleton
                key={column}
                className="mr-6 h-5"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}