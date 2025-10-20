"use client";
import Link from "next/link";
export default function ProductError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-20 text-center space-y-6">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
        {error.message || "We couldn’t load this product right now."}
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
