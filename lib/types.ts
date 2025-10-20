// Optional jersey customization payload attached to cart lines (client-side persisted)
export interface JerseyCustomization {
  patch?: string;
  patch2?: string;
  sleeveAd?: string;
  nameAndNumber?: {
    font: string;
    name: string;
    number: string;
  } | null;
  notes?: string;
}

export interface ProductSummary {
  productId: string;
  name: string;
  priceCents: number; // canonical integer minor units
  image: string;
  size?: string;
  // Unique per-line key for custom selections (e.g., jersey options)
  lineKey?: string;
  // Optional client-side metadata for jersey customizations
  customizations?: JerseyCustomization;
}

export interface CartItem extends ProductSummary {
  id: string; // unique line id (productId + size or nanoid)
  qty: number;
}

export interface WishlistItem extends ProductSummary {
  id: string; // productId(+size)
}

export interface CartState {
  items: CartItem[];
}

export interface WishlistState {
  items: WishlistItem[];
}

export interface CartContextValue extends CartState {
  addItem: (item: ProductSummary, qty?: number) => void;
  updateQty: (lineId: string, qty: number) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
  subtotal: number;
  totalQuantity: number;
  hydrated?: boolean; // true once local storage (or server sync) loaded
}

export interface WishlistContextValue extends WishlistState {
  add: (item: ProductSummary) => void;
  remove: (id: string) => void;
  toggle: (item: ProductSummary) => void;
  moveToCart: (
    id: string,
    addToCart: (item: ProductSummary, qty?: number) => void
  ) => void;
  has: (id: string) => boolean;
  clear: () => void;
  syncing?: boolean; // true while merging with server
}

export function lineIdFor(
  productId: string,
  size?: string,
  customKey?: string
) {
  // Backward compatible: if no customKey provided, keep existing id format
  const parts: string[] = [productId];
  if (size) parts.push(size);
  if (customKey) parts.push(customKey);
  return parts.join("__");
}

// NextAuth session types
export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  isAdmin?: boolean;
}

export interface ExtendedSession {
  user: SessionUser;
  expires: string;
}
