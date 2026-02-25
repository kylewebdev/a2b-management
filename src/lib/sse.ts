/**
 * Create an SSE stream with a writer interface.
 * Returns a Response suitable for Next.js API routes.
 */
export function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  const writer = {
    /** Send a data event */
    send(data: unknown) {
      if (!controller) return;
      try {
        const json = JSON.stringify(data);
        controller.enqueue(encoder.encode(`data: ${json}\n\n`));
      } catch {
        controller = null;
      }
    },

    /** Send a named event */
    sendEvent(event: string, data: unknown) {
      if (!controller) return;
      try {
        const json = JSON.stringify(data);
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${json}\n\n`));
      } catch {
        controller = null;
      }
    },

    /** Close the stream */
    close() {
      if (!controller) return;
      try {
        controller.close();
      } catch {
        // Controller may already be closed if client disconnected
      }
      controller = null;
    },
  };

  return { stream, writer };
}

/**
 * Create an SSE Response with correct headers.
 */
export function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
