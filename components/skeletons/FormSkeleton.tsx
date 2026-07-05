import Skeleton from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";
import CardHeader from "@/components/ui/CardHeader";
import CardBody from "@/components/ui/CardBody";

export default function FormSkeleton() {
  return (
    <Card>
      <CardHeader title="" />

      <CardBody>
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4">
            <Skeleton className="h-11 w-28 rounded-xl" />
            <Skeleton className="h-11 w-36 rounded-xl" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}