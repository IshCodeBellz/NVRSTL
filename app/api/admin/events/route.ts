import { NextRequest } from "next/server";
import { createAdminEventStream } from "@/lib/server/events/adminEvents";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const stream = createAdminEventStream();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
