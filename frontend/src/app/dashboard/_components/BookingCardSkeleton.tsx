import { Skeleton } from '@/components/ui/Skeleton';

export function BookingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:flex-row">
      <Skeleton className="h-48 w-full rounded-none sm:h-auto sm:w-48" />
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-4 flex justify-between">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="mb-4 h-4 w-1/4" />
          <div className="flex items-center gap-3 mt-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col justify-between gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
