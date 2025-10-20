"use client";

import { useState, useEffect } from "react";
import { type OrderEventMetadata } from "@/lib/server/orderEventService";

interface OrderEvent {
  id: string;
  orderId: string;
  kind: string;
  message: string | null;
  meta: string | null;
  createdAt: Date;
  parsedMeta?: OrderEventMetadata;
}

interface OrderEventTimelineProps {
  orderId: string;
}

export default function OrderEventTimeline({
  orderId,
}: OrderEventTimelineProps) {
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(
          `/api/admin/orders/${orderId}/events-enhanced`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch order events");
        }
        const data = await response.json();
        setEvents(data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [orderId]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading order events: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Order Event Timeline
      </h3>

      <div className="space-y-3">
        {events.map((event, index) => (
          <OrderEventCard key={event.id} event={event} isLatest={index === 0} />
        ))}
      </div>

      {events.length === 0 && (
        <p className="text-gray-500 italic">No events found for this order.</p>
      )}
    </div>
  );
}

function OrderEventCard({
  event,
  isLatest,
}: {
  event: OrderEvent;
  isLatest: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const getEventColor = (kind: string) => {
    switch (kind) {
      case "ORDER_CREATED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PAYMENT_SUCCEEDED":
        return "bg-green-100 text-green-800 border-green-200";
      case "PAYMENT_FAILED":
        return "bg-red-100 text-red-800 border-red-200";
      case "STOCK_RESTORED":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DISCOUNT_APPLIED":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "ORDER_SHIPPED":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "SYSTEM_EVENT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getEventIcon = (kind: string) => {
    switch (kind) {
      case "ORDER_CREATED":
        return "📝";
      case "PAYMENT_SUCCEEDED":
        return "✅";
      case "PAYMENT_FAILED":
        return "❌";
      case "STOCK_RESTORED":
        return "📦";
      case "DISCOUNT_APPLIED":
        return "🏷️";
      case "ORDER_SHIPPED":
        return "🚚";
      case "SYSTEM_EVENT":
        return "⚙️";
      default:
        return "📋";
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all duration-200 ${
        isLatest ? "ring-2 ring-blue-500 ring-opacity-50" : ""
      } ${getEventColor(event.kind)}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-2xl">{getEventIcon(event.kind)}</span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold truncate">
                {event.kind.replace(/_/g, " ")}
              </h4>
              <span className="text-xs text-gray-600">
                {new Date(event.createdAt).toLocaleString()}
              </span>
            </div>

            <p className="text-sm mt-1 text-gray-700">
              {event.message || "No message"}
            </p>

            {/* Quick metadata preview */}
            {event.parsedMeta && (
              <div className="mt-2 text-xs text-gray-600">
                {event.parsedMeta.paymentAmount && (
                  <span className="inline-block bg-white bg-opacity-50 px-2 py-1 rounded mr-2">
                    Amount: {event.parsedMeta.paymentCurrency}{" "}
                    {(event.parsedMeta.paymentAmount / 100).toFixed(2)}
                  </span>
                )}
                {event.parsedMeta.totalQuantity && (
                  <span className="inline-block bg-white bg-opacity-50 px-2 py-1 rounded mr-2">
                    Quantity: {event.parsedMeta.totalQuantity}
                  </span>
                )}
                {event.parsedMeta.discountCode && (
                  <span className="inline-block bg-white bg-opacity-50 px-2 py-1 rounded mr-2">
                    Code: {event.parsedMeta.discountCode}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {event.meta && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {expanded ? "Hide Details" : "Show Details"}
          </button>
        )}
      </div>

      {/* Expanded metadata */}
      {expanded && event.parsedMeta && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h5 className="text-xs font-semibold text-gray-700 mb-2">
            Event Metadata
          </h5>
          <div className="bg-white bg-opacity-75 rounded p-3 text-xs">
            <pre className="whitespace-pre-wrap font-mono text-gray-700 overflow-x-auto">
              {JSON.stringify(event.parsedMeta, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
