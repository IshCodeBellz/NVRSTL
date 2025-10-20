// Store active connections globally
const connections = new Map<
  string,
  {
    write: (data: Record<string, unknown>) => void;
    close: () => void;
  }
>();

/**
 * Broadcast real-time updates to connected clients
 */
export function broadcastUpdate(data: {
  type: "order_update" | "notification" | "admin_alert";
  userId?: string;
  orderId?: string;
  payload: Record<string, unknown>;
}) {
  for (const [connectionId, writer] of connections.entries()) {
    try {
      // Filter connections based on user/type if needed
      if (data.userId && !connectionId.includes(data.userId)) {
        continue;
      }

      writer.write({
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error broadcasting to connection:", connectionId, error);
      connections.delete(connectionId);
    }
  }
}

/**
 * Add a connection to the global connections map
 */
export function addConnection(
  connectionId: string,
  writer: {
    write: (data: Record<string, unknown>) => void;
    close: () => void;
  }
) {
  connections.set(connectionId, writer);
}

/**
 * Remove a connection from the global connections map
 */
export function removeConnection(connectionId: string) {
  connections.delete(connectionId);
}

/**
 * Get all active connections (for monitoring)
 */
export function getActiveConnections() {
  return connections.size;
}
