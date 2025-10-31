"use client";
import { useState, useTransition } from "react";

interface DiscountCode {
  id: string;
  code: string;
  kind: "FIXED" | "PERCENT";
  valueCents: number | null;
  percent: number | null;
  minSubtotalCents: number | null;
  usageLimit: number | null;
  timesUsed: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

interface Props {
  initial: DiscountCode[];
}

export default function DiscountCodesClient({ initial }: Props) {
  const [codes, setCodes] = useState<DiscountCode[]>(initial);
  const [creating, startCreate] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    const payload: Record<string, string | number | undefined> =
      Object.fromEntries(formData.entries()) as Record<string, string>;
    // Normalize empty strings to undefined
    for (const k of Object.keys(payload))
      if (payload[k] === "") payload[k] = undefined;
    if (payload.valueCents)
      payload.valueCents = Number(payload.valueCents) * 100; // accept dollars
    if (payload.minSubtotalCents)
      payload.minSubtotalCents = Number(payload.minSubtotalCents) * 100;
    if (payload.percent) payload.percent = Number(payload.percent);

    const res = await fetch("/api/discount-codes", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      alert("Create failed");
      return;
    }
    const created = await res.json();
    setCodes((prev) => [created, ...prev]);
    (document.getElementById("create-form") as HTMLFormElement)?.reset();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this code?")) return;
    const res = await fetch(`/api/discount-codes/${id}`, { method: "DELETE" });
    if (res.ok) setCodes((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleSave(id: string, form: HTMLFormElement) {
    const formData = new FormData(form);
    const payload: Record<string, string | number | undefined> =
      Object.fromEntries(formData.entries()) as Record<string, string>;
    for (const k of Object.keys(payload))
      if (payload[k] === "") payload[k] = undefined;
    if (payload.kind === "FIXED") {
      if (payload.valueCents)
        payload.valueCents = Number(payload.valueCents) * 100;
      payload.percent = undefined;
    } else {
      if (payload.percent) payload.percent = Number(payload.percent);
      payload.valueCents = undefined;
    }
    if (payload.minSubtotalCents)
      payload.minSubtotalCents = Number(payload.minSubtotalCents) * 100;

    const res = await fetch(`/api/discount-codes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      alert("Update failed");
      return;
    }
    const updated = await res.json();
    setCodes((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingId(null);
  }

  return (
    <div className="p-6 space-y-6">
      <form
        id="create-form"
        className="grid gap-2 md:grid-cols-8 text-xs border border-gray-200 bg-white p-4 rounded items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          startCreate(() => handleCreate(new FormData(form)));
        }}
      >
        <input
          required
          name="code"
          placeholder="CODE"
          className="border p-1 rounded col-span-1"
        />
        <select name="kind" className="border p-1 rounded col-span-1">
          <option value="FIXED">FIXED</option>
          <option value="PERCENT">PERCENT</option>
        </select>
        <input
          name="valueCents"
          type="number"
          min="0"
          placeholder="value ($)"
          className="border p-1 rounded col-span-1"
        />
        <input
          name="percent"
          type="number"
          min="1"
          max="100"
          placeholder="percent"
          className="border p-1 rounded col-span-1"
        />
        <input
          name="minSubtotalCents"
          type="number"
          min="0"
          placeholder="min subtotal ($)"
          className="border p-1 rounded col-span-1"
        />
        <input
          name="usageLimit"
          type="number"
          min="1"
          placeholder="usage limit"
          className="border p-1 rounded col-span-1"
        />
        <input
          name="startsAt"
          type="datetime-local"
          className="border p-1 rounded col-span-1"
        />
        <input
          name="endsAt"
          type="datetime-local"
          className="border p-1 rounded col-span-1"
        />
        <button
          disabled={creating}
          className="bg-blue-600 text-white rounded px-3 py-1 text-xs col-span-1"
        >
          {creating ? "..." : "Create"}
        </button>
      </form>
      <table className="w-full text-xs border border-gray-200 bg-white rounded">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="p-2">Code</th>
            <th className="p-2">Kind</th>
            <th className="p-2">Value/Percent</th>
            <th className="p-2">Usage</th>
            <th className="p-2">Window</th>
            <th className="p-2">Min Subtotal</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => {
            const editing = editingId === c.id;
            if (editing)
              return (
                <tr key={c.id} className="border-t bg-yellow-50">
                  <td className="p-1 font-mono">
                    <form
                      className="flex flex-wrap gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSave(c.id, e.currentTarget);
                      }}
                    >
                      <input
                        name="code"
                        defaultValue={c.code}
                        className="border p-1 rounded w-24"
                      />
                      <select
                        name="kind"
                        defaultValue={c.kind}
                        className="border p-1 rounded w-24"
                      >
                        <option value="FIXED">FIXED</option>
                        <option value="PERCENT">PERCENT</option>
                      </select>
                      {c.kind === "FIXED" ? (
                        <input
                          name="valueCents"
                          type="number"
                          defaultValue={c.valueCents ? c.valueCents / 100 : ""}
                          className="border p-1 rounded w-24"
                        />
                      ) : (
                        <input
                          name="percent"
                          type="number"
                          defaultValue={c.percent ?? ""}
                          className="border p-1 rounded w-20"
                        />
                      )}
                      <input
                        name="minSubtotalCents"
                        type="number"
                        defaultValue={
                          c.minSubtotalCents ? c.minSubtotalCents / 100 : ""
                        }
                        className="border p-1 rounded w-24"
                      />
                      <input
                        name="usageLimit"
                        type="number"
                        defaultValue={c.usageLimit ?? ""}
                        className="border p-1 rounded w-20"
                      />
                      <input
                        name="startsAt"
                        type="datetime-local"
                        defaultValue={c.startsAt ? c.startsAt.slice(0, 16) : ""}
                        className="border p-1 rounded"
                      />
                      <input
                        name="endsAt"
                        type="datetime-local"
                        defaultValue={c.endsAt ? c.endsAt.slice(0, 16) : ""}
                        className="border p-1 rounded"
                      />
                      <div className="flex gap-1">
                        <button
                          className="bg-green-600 text-white px-2 rounded"
                          type="submit"
                        >
                          Save
                        </button>
                        <button
                          className="bg-neutral-400 text-white px-2 rounded"
                          type="button"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </td>
                  <td colSpan={6} />
                </tr>
              );
            return (
              <tr key={c.id} className="border-t">
                <td className="p-2 font-mono">{c.code}</td>
                <td className="p-2">{c.kind}</td>
                <td className="p-2">
                  {c.kind === "FIXED"
                    ? (c.valueCents ?? 0) / 100
                    : c.percent + "%"}
                </td>
                <td className="p-2">
                  {c.timesUsed}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                </td>
                <td className="p-2">
                  {[c.startsAt, c.endsAt].some(Boolean)
                    ? `${
                        c.startsAt
                          ? new Date(c.startsAt).toLocaleDateString()
                          : ""
                      } - ${
                        c.endsAt ? new Date(c.endsAt).toLocaleDateString() : ""
                      }`
                    : "Always"}
                </td>
                <td className="p-2">
                  {c.minSubtotalCents
                    ? (c.minSubtotalCents / 100).toFixed(2)
                    : "-"}
                </td>
                <td className="p-2 space-x-1">
                  <button
                    className="text-blue-600 underline"
                    onClick={() => setEditingId(c.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 underline"
                    onClick={() => handleDelete(c.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
