"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface SharedWishlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  shareCode: string;
  createdAt: string;
  itemCount: number;
  owner: {
    id: string;
    name: string;
  };
}

export default function SocialWishlistDashboard() {
  const { data: session } = useSession();
  const [wishlists, setWishlists] = useState<SharedWishlist[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedWishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (session) {
      loadWishlists();
    }
  }, [session]);

  async function loadWishlists() {
    try {
      const [myWishlistsRes, sharedRes] = await Promise.all([
        fetch("/api/wishlist/shared"),
        fetch("/api/wishlist/shared-with-me"),
      ]);

      if (myWishlistsRes.ok) {
        const myData = await myWishlistsRes.json();
        setWishlists(myData.wishlists || []);
      }

      if (sharedRes.ok) {
        const sharedData = await sharedRes.json();
        setSharedWithMe(sharedData.wishlists || []);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold mb-4">Social Wishlists</h1>
        <p className="text-neutral-600 mb-6">
          Create and share wishlists with friends and family.
        </p>
        <Link
          href="/login"
          className="bg-neutral-900 text-white px-6 py-2 rounded hover:bg-neutral-800"
        >
          Sign In to Continue
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-neutral-200 rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Social Wishlists</h1>
          <p className="text-neutral-600">
            Create, share, and discover wishlists
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-neutral-900 text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Create Wishlist
        </button>
      </div>

      {/* Create Wishlist Form */}
      {showCreateForm && (
        <CreateWishlistForm
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            loadWishlists();
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Wishlists */}
        <div>
          <h2 className="text-lg font-semibold mb-4">My Wishlists</h2>
          {wishlists.length === 0 ? (
            <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center">
              <div className="text-neutral-400 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <p className="text-neutral-600 mb-4">No wishlists created yet</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                Create your first wishlist
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {wishlists.map((wishlist) => (
                <WishlistCard
                  key={wishlist.id}
                  wishlist={wishlist}
                  isOwner={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Shared With Me */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Shared With Me</h2>
          {sharedWithMe.length === 0 ? (
            <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center">
              <div className="text-neutral-400 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
              </div>
              <p className="text-neutral-600">No shared wishlists yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedWithMe.map((wishlist) => (
                <WishlistCard
                  key={wishlist.id}
                  wishlist={wishlist}
                  isOwner={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wishlist Card Component
function WishlistCard({
  wishlist,
  isOwner,
}: {
  wishlist: SharedWishlist;
  isOwner: boolean;
}) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/wishlist/shared/${wishlist.shareCode}`;

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Handle error silently
    }
  }

  async function shareViaEmail() {
    const subject = `Check out my wishlist: ${wishlist.name}`;
    const body = `I wanted to share my wishlist "${wishlist.name}" with you!\n\nView it here: ${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{wishlist.name}</h3>
          {wishlist.description && (
            <p className="text-neutral-600 text-sm mb-2">
              {wishlist.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span>{wishlist.itemCount} items</span>
            <span>•</span>
            <span>{new Date(wishlist.createdAt).toLocaleDateString()}</span>
            {!isOwner && (
              <>
                <span>•</span>
                <span>by {wishlist.owner.name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                wishlist.isPublic ? "bg-green-400" : "bg-yellow-400"
              }`}
            ></div>
            <span className="text-xs text-neutral-500">
              {wishlist.isPublic ? "Public" : "Private"}
            </span>
          </div>

          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
              </button>

              {showShareMenu && (
                <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg p-2 z-10 w-48">
                  <button
                    onClick={copyShareLink}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 rounded"
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={shareViaEmail}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 rounded"
                  >
                    Share via Email
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/wishlist/${wishlist.id}`}
          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
        >
          View Wishlist →
        </Link>

        {isOwner && (
          <Link
            href={`/wishlist/${wishlist.id}/edit`}
            className="text-neutral-600 hover:text-neutral-800 text-sm"
          >
            Edit
          </Link>
        )}
      </div>
    </div>
  );
}

// Create Wishlist Form Component
function CreateWishlistForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/wishlist/shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
        }),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create wishlist");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create New Wishlist</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Wishlist Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g., Birthday Wishlist"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-2"
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              placeholder="Add a description for your wishlist"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-neutral-300 focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-sm">
              Make this wishlist public (discoverable by others)
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-neutral-900 text-white py-2 rounded hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Wishlist"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
