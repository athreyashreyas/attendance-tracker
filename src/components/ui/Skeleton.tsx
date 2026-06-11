interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-card bg-parchment-200 ${className}`}
      aria-hidden="true"
    />
  );
}

/** A placeholder course card shown while the dashboard loads. */
export function CourseCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-card bg-parchment-50 p-4 shadow-sm">
      <Skeleton className="h-12 w-1.5 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-16 w-16 rounded-full" />
    </div>
  );
}
