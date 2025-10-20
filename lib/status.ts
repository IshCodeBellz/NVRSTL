// Centralized domain status/type enums & helpers (SQLite-safe replacement for Prisma enums)
// Once Postgres migration is done, we can mirror these as native DB enums.

export const OrderStatus = {
  PENDING: "PENDING",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  PAID: "PAID",
  FULFILLING: "FULFILLING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  PAYMENT_PENDING: "PAYMENT_PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const OrderEventKind = {
  ORDER_CREATED: "ORDER_CREATED",
  DISCOUNT_APPLIED: "DISCOUNT_APPLIED",
  PAYMENT_ATTEMPT: "PAYMENT_ATTEMPT",
  PAYMENT_SUCCEEDED: "PAYMENT_SUCCEEDED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  ORDER_PAID: "ORDER_PAID",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ORDER_REFUNDED: "ORDER_REFUNDED",
  FULFILLMENT_STARTED: "FULFILLMENT_STARTED",
  ORDER_SHIPPED: "ORDER_SHIPPED",
  ORDER_DELIVERED: "ORDER_DELIVERED",
} as const;
export type OrderEventKind =
  (typeof OrderEventKind)[keyof typeof OrderEventKind];

export const DiscountKind = {
  PERCENT: "PERCENT",
  FIXED: "FIXED",
} as const;
export type DiscountKind = (typeof DiscountKind)[keyof typeof DiscountKind];

// Runtime type guards
export function isOrderStatus(v: string): v is OrderStatus {
  return (Object.values(OrderStatus) as string[]).includes(v);
}
export function isPaymentStatus(v: string): v is PaymentStatus {
  return (Object.values(PaymentStatus) as string[]).includes(v);
}
export function isOrderEventKind(v: string): v is OrderEventKind {
  return (Object.values(OrderEventKind) as string[]).includes(v);
}
export function isDiscountKind(v: string): v is DiscountKind {
  return (Object.values(DiscountKind) as string[]).includes(v);
}

// Narrowing helpers that throw for invalid values (useful at trust boundaries like API input)
export function assertOrderStatus(v: string): OrderStatus {
  if (!isOrderStatus(v)) throw new Error(`Invalid OrderStatus: ${v}`);
  return v;
}
export function assertPaymentStatus(v: string): PaymentStatus {
  if (!isPaymentStatus(v)) throw new Error(`Invalid PaymentStatus: ${v}`);
  return v;
}
export function assertOrderEventKind(v: string): OrderEventKind {
  if (!isOrderEventKind(v)) throw new Error(`Invalid OrderEventKind: ${v}`);
  return v;
}
export function assertDiscountKind(v: string): DiscountKind {
  if (!isDiscountKind(v)) throw new Error(`Invalid DiscountKind: ${v}`);
  return v;
}

// Transition maps centralised here (source of truth for tests and admin route)
export const OrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["FULFILLING", "CANCELLED", "REFUNDED"],
  FULFILLING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true; // idempotent no-op update allowed
  return OrderTransitions[from].includes(to);
}
