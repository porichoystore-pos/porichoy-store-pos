// ============================================
// Simple in-memory TTL cache (no external deps)
// Used for frequently-read, rarely-changing data
// (categories, popular products, etc.)
// ============================================

class TTLCache {
  constructor() {
    this.store = new Map();

    // Periodic sweep of expired entries to prevent memory growth
    this._sweeper = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (entry.expires <= now) this.store.delete(key);
      }
    }, 60 * 1000);
    // Don't keep the process alive just for the sweeper
    if (this._sweeper.unref) this._sweeper.unref();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = 60 * 1000) {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }

  // Delete by exact key (string) or pattern (RegExp)
  del(pattern) {
    if (pattern == null) return;
    for (const key of this.store.keys()) {
      const match = pattern instanceof RegExp ? pattern.test(key) : key === pattern;
      if (match) this.store.delete(key);
    }
  }

  clear() {
    this.store.clear();
  }
}

module.exports = new TTLCache();
