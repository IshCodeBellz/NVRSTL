export default function LoadingProduct() {
  return (
    <div className="container mx-auto px-4 py-10 grid gap-12 md:grid-cols-2 animate-pulse">
      <div className="grid gap-4">
        <div className="aspect-[3/4] bg-neutral-200 rounded" />
        <div className="aspect-[3/4] bg-neutral-200 rounded" />
      </div>
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="h-8 bg-neutral-200 rounded w-2/3" />
          <div className="h-6 bg-neutral-200 rounded w-1/4" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 bg-neutral-200 rounded" />
          ))}
        </div>
        <div className="h-10 bg-neutral-200 rounded" />
        <div className="h-10 bg-neutral-200 rounded" />
      </div>
    </div>
  );
}
