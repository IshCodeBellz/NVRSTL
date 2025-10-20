"use client";
import { useTransition, useState } from "react";

export default function RestoreProductButton({
  productId,
}: {
  productId: string;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      disabled={pending || done}
      onClick={() => {
        start(async () => {
          await fetch(`/api/admin/products/${productId}/restore`, {
            method: "POST",
          });
          setDone(true);
          // simplistic: rely on manual refresh or next navigation
          window.location.reload();
        });
      }}
      className="text-xs underline disabled:opacity-40"
    >
      {done ? "Restored" : pending ? "Restoring…" : "Restore"}
    </button>
  );
}
