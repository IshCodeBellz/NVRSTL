"use client";
import { useState } from "react";

export default function TriggerDailyReportButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/cron/daily-order-shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setResult(`Sent • Orders: ${data.count} • Date: ${data.date}`);
    } catch (e: any) {
      setResult(`Failed: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm rounded bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send Daily Shipping Report Now"}
      </button>
      {result && (
        <p className="text-xs text-gray-600" role="status">
          {result}
        </p>
      )}
    </div>
  );
}


