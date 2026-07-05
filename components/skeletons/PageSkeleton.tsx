import Skeleton from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";

export default function PageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Seitenüberschrift */}
      <div>
        <Skeleton className="h-12 w-72" />
        <Skeleton className="mt-3 h-5 w-[28rem] max-w-full" />
      </div>

      {/* Kartenbereich */}
      <Card>
        <CardBody>
          <div className="space-y-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}