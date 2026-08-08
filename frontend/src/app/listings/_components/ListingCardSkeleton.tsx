import { Skeleton } from '@/components/ui/Skeleton';

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl p-3">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/4 mt-2" />
      </div>
    </div>
  );
}
