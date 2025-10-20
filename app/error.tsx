"use client";
import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center p-6 bg-neutral-50 text-neutral-800">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm opacity-80">{error.message}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
