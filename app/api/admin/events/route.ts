import { createAdminEventStream } from "@/lib/server/events/adminEvents";

export const dynamic = "force-dynamic";

export async function GET() {
  const stream = createAdminEventStream();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
