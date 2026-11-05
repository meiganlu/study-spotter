// Simple per-IP rate limit: at most MAX_REQUESTS ranking requests per minute
// In memory, so it's per server instance; a shared store would make it exact
const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000;

const windows = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Clear out old windows now and then so the map doesn't grow forever
  if (windows.size > 1000) {
    for (const [key, w] of windows) if (now > w.resetAt) windows.delete(key);
  }

  const w = windows.get(ip);
  if (!w || now > w.resetAt) {
    windows.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  w.count++;
  return w.count > MAX_REQUESTS;
}
