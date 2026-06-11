import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Generating metadata…">
      <Card>
        <CardHeader className="pb-4">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>

          <div className="h-px bg-border" />

          {/* Description skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Tags skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-10" />
            <div className="flex flex-wrap gap-2">
              {[80, 64, 96, 72, 56, 88, 64, 80].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-6 rounded-full"
                  style={{ width: `${w}px` }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
