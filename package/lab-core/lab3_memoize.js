export function memoize(fn, { limit = Infinity, strategy = 'LRU', ttl = 60000, customEviction } = {}) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);
    const now = Date.now();

    if (cache.has(key)) {
      const entry = cache.get(key);

      if (strategy === 'TTL' && now - entry.timestamp > ttl) {
        cache.delete(key);
      } else {
        entry.count++;
        if (strategy === 'LRU') cache.set(key, cache.get(key) && (cache.delete(key), entry));
        return entry.value;
      }
    }

    const result = fn(...args);

    if (cache.size >= limit) {
      if (strategy === 'CUSTOM' && typeof customEviction === 'function') {
        customEviction(cache);
      } else {
        let victim = cache.keys().next().value;

        if (strategy === 'LFU') {
          let min = Infinity;
          for (const [k, e] of cache) if (e.count < min) { min = e.count; victim = k; }
        }
        
        cache.delete(victim);
      }
    }

    cache.set(key, { value: result, timestamp: now, count: 1 });
    return result;
  };
}