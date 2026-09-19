export function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-xl border bg-card" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border bg-card" />
        <div className="h-72 animate-pulse rounded-xl border bg-card" />
      </div>
    </div>
  );
}
