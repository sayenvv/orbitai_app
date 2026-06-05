export const STREAM_RENDER_INTERVAL_MS = 32;

export type StreamRenderFlusher = {
  start: () => void;
  stop: () => void;
  getBuffer: () => string;
  setBuffer: (value: string) => void;
  append: (chunk: string) => void;
};

export function createStreamRenderFlusher(onFlush: (content: string) => void): StreamRenderFlusher {
  let buffer = "";
  let lastFlushed = "";
  let lastFlushAt = 0;
  let rafId: number | null = null;

  const flushIfDue = (force = false) => {
    const now = performance.now();
    if (!force && buffer === lastFlushed) return;
    if (!force && now - lastFlushAt < STREAM_RENDER_INTERVAL_MS) return;
    lastFlushed = buffer;
    lastFlushAt = now;
    onFlush(lastFlushed);
  };

  return {
    getBuffer: () => buffer,
    setBuffer: (value: string) => {
      buffer = value;
    },
    append: (chunk: string) => {
      buffer += chunk;
    },
    start: () => {
      const tick = () => {
        flushIfDue(false);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    },
    stop: () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flushIfDue(true);
    },
  };
}
