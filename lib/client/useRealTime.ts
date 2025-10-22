"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface RealTimeEvent {
  type: string;
  timestamp: string;
  userId?: string;
  orderId?: string;
  payload?: Record<string, unknown>;
}

interface UseRealTimeOptions {
  type?: "user" | "admin" | "order";
  onEvent?: (event: RealTimeEvent) => void;
  onError?: (error: Event) => void;
  onReconnect?: () => void;
}

export function useRealTime(options: UseRealTimeOptions = {}) {
  const { type = "user", onEvent, onError, onReconnect } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    try {
      const url = `/api/realtime/events?type=${type}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log("Real-time connection established");
      };

      eventSource.onmessage = (event) => {
        try {
          const data: RealTimeEvent = JSON.parse(event.data);
          setLastEvent(data);
          onEvent?.(data);
        } catch (err) {
          console.error("Error parsing SSE message:", err);
        }
      };

      eventSource.onerror = (event) => {
        console.error("SSE connection error:", event);
        setIsConnected(false);
        setError("Connection error");
        onError?.(event);

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`
            );
            onReconnect?.();
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error("Error creating EventSource:", err);
      setError("Failed to establish connection");
    }
  }, [type, onEvent, onError, onReconnect]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    reconnectAttempts.current = 0;
  };

  const sendEvent = async (eventData: Partial<RealTimeEvent>) => {
    // For sending events back to server if needed
    try {
      const response = await fetch("/api/realtime/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error("Failed to send event");
      }
    } catch (err) {
      console.error("Error sending real-time event:", err);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [type, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    lastEvent,
    error,
    connect,
    disconnect,
    sendEvent,
  };
}

// Specialized hooks for different use cases
export function useOrderUpdates(orderId?: string) {
  const [orderUpdates, setOrderUpdates] = useState<RealTimeEvent[]>([]);

  const { isConnected, error } = useRealTime({
    type: "user",
    onEvent: (event) => {
      if (
        event.type === "order_update" &&
        (!orderId || event.orderId === orderId)
      ) {
        setOrderUpdates((prev) => [...prev.slice(-9), event]); // Keep last 10 updates
      }
    },
  });

  return { orderUpdates, isConnected, error };
}

export function useAdminAlerts() {
  const [alerts, setAlerts] = useState<RealTimeEvent[]>([]);

  const { isConnected, error } = useRealTime({
    type: "admin",
    onEvent: (event) => {
      if (event.type === "admin_alert") {
        setAlerts((prev) => [...prev.slice(-19), event]); // Keep last 20 alerts
      }
    },
  });

  return { alerts, isConnected, error };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<RealTimeEvent[]>([]);

  const { isConnected, error } = useRealTime({
    type: "user",
    onEvent: (event) => {
      if (event.type === "notification") {
        setNotifications((prev) => [...prev.slice(-9), event]); // Keep last 10 notifications
      }
    },
  });

  return { notifications, isConnected, error };
}
