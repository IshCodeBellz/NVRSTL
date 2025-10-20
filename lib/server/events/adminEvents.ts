// Server-only in-memory SSE broadcaster for admin events (single process)

const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(payload);
  for (const c of clients) {
    try {
      c.enqueue(encoded);
    } catch {
      // ignore enqueue errors from closed streams
    }
  }
}

export function createAdminEventStream(): ReadableStream<Uint8Array> {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      clients.add(controller);
      // Heartbeat every 25s to keep connections alive
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: hb\n\n`));
        } catch {
          // ignore
        }
      }, 25_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (controllerRef) clients.delete(controllerRef);
      controllerRef = null;
      heartbeat = null;
    },
  });

  return stream;
}
