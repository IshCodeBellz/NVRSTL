import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { addConnection, removeConnection } from "@/lib/server/realtime";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptionsEnhanced);

  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "user"; // user, admin, order

  // Create a readable stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const initialMessage = {
        type: "connected",
        timestamp: new Date().toISOString(),
        userId,
      };

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
      );

      // Store the connection
      const connectionId = `${userId}-${type}-${Date.now()}`;

      // Create a writer for this connection
      const writer = {
        write: (data: Record<string, unknown>) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } catch (_error) {
            logger.error("Error writing to SSE stream:", _error);
          }
        },
        close: () => {
          try {
            controller.close();
          } catch (_error) {
            logger.error("Error closing SSE stream:", _error);
          }
        },
      };

      addConnection(connectionId, writer);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        removeConnection(connectionId);
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "heartbeat",
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );
        } catch {
          clearInterval(heartbeat);
          removeConnection(connectionId);
        }
      }, 30000); // 30 second heartbeat

      // Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
      });
    },

    cancel() {
      // Clean up when stream is cancelled
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
