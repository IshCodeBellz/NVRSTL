"use client";
import { useEffect, useRef, useState } from "react";

// Simple global live region announcer. Dispatch custom events to announce.
// window.dispatchEvent(new CustomEvent('announce', { detail: 'Added to cart' }))

export function LiveRegion() {
  const [msg, setMsg] = useState("");
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") {
        setMsg(detail);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setMsg(""), 3000);
      }
    };
    window.addEventListener("announce", on);
    return () => {
      window.removeEventListener("announce", on);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {msg}
    </div>
  );
}
