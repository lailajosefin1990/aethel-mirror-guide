const DashboardSkeleton = () => (
  <div className="min-h-screen px-5 py-8 animate-pulse">
    <div className="w-full max-w-app mx-auto space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-32 bg-muted rounded" />
        <div className="h-6 w-48 bg-muted rounded" />
      </div>
      <div className="rounded-md border border-border p-5 space-y-3">
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
      <div className="space-y-3">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="rounded-md border border-border p-4 space-y-2">
          <div className="h-4 w-2/3 bg-muted rounded" />
          <div className="h-3 w-1/2 bg-muted rounded" />
        </div>
        <div className="rounded-md border border-border p-4 space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-3 w-1/3 bg-muted rounded" />
        </div>
      </div>
      <div className="h-12 w-full bg-muted rounded-sm" />
    </div>
  </div>
);

export default DashboardSkeleton;
