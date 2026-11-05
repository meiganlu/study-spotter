// Small in-memory cache with a size cap and expiry, keyed by place ID
// Resets on restart and isn't shared between server instances
// Kept short-lived on purpose: Google's terms don't allow storing Places content
// (like reviews) long-term, and these values are derived from it
export class LruCache<V> {
  // A Map keeps insertion order, so the first key is always the least recently used
  private entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(private maxEntries: number, private ttlMs: number) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }

    // Move to the end to mark it as recently used
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });

    // Drop the least recently used entries once over the cap
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
