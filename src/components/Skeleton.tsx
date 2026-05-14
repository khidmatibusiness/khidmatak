import { type ReactNode } from "react";

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: "color-mix(in oklab, var(--color-muted) 70%, transparent)", ...style }}
    />
  );
}

export function SkeletonCard({ children }: { children?: ReactNode }) {
  return <div className="glass rounded-3xl p-4 space-y-3">{children}</div>;
}

export function BookingsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-start gap-3">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
              <Skeleton className="h-2.5 w-1/2" />
              <div className="flex justify-between pt-1">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export function WalletTxSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-14 rounded-2xl" />
      </div>
      <div className="glass rounded-3xl p-2 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ProDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 rounded-3xl" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center gap-3">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}
