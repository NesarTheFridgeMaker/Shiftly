import Skeleton from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";

type StatsSkeletonProps = {
  count?: number;
};

export default function StatsSkeleton({
  count = 4,
}: StatsSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardBody>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-12 w-20" />
            <Skeleton className="mt-3 h-4 w-36" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}