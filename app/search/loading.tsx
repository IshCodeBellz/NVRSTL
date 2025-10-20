export default function LoadingSearch() {
  return (
    <div className="container mx-auto px-4 py-10 space-y-8 animate-pulse">
      <div className="h-8 bg-neutral-200 rounded w-1/2" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-neutral-200 rounded" />
        ))}
      </div>
    </div>
  );
}
