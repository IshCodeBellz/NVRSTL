"use client";
import Link from "next/link";
export default function SearchError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-20 text-center space-y-6">
      <h1 className="text-2xl font-bold">Search Unavailable</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
        {error.message || "Try refining your query or reloading."}
      </p>
      <div className="flex gap-4 justify-center">
        <button onClick={() => reset()} className="btn-outline">
          Retry
        </button>
        <Link href="/" className="btn-primary">
          Go Home
        </Link>
      </div>
    </div>
  );
}
