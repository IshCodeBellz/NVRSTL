"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function AccountSettingsClient({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Update failed");
      } else {
        setMessage("Profile updated");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-md">
      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <input
          disabled
          value={email}
          className="w-full border rounded px-3 py-2 text-sm bg-neutral-100"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>
      {message && <p className="text-xs text-green-600">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-3 items-center">
        <button
          disabled={saving}
          type="submit"
          className="rounded bg-neutral-900 text-white text-sm px-4 py-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-sm underline"
        >
          Sign out
        </button>
      </div>
    </form>
  );
}
