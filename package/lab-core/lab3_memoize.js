function createDefaultKeyResolver() {
  const objectIds = new WeakMap();
  const symbolIds = new Map();
  let nextId = 1;
  const getId = (storage, value) => {
    if (!storage.has(value)) {
      storage.set(value, nextId++);
    }
    return storage.get(value);
  };

  const tokenFor = (value) => {
    if (value === null) return 'null';
    const type = typeof value;
    if (type === 'number') {
      if (Number.isNaN(value)) return 'number:NaN';
      if (Object.is(value, -0)) return 'number:-0';
      if (value === Infinity) return 'number:Infinity';
      if (value === -Infinity) return 'number:-Infinity';
      return `number:${value}`; 
    }
    if (type === 'string') return `string:${JSON.stringify(value)}`;
    if (type === 'boolean') return `boolean:${value}`;
    if (type === 'undefined') return 'undefined';
    if (type === 'bigint') return `bigint:${value.toString()}`;
    if (type === 'symbol') return `symbol:${getId(symbolIds, value)}`;
    if (type === 'function' || type === 'object') return `object:${getId(objectIds, value)}`;
    return `${type}:${String(value)}`;
  };
  return (args) => args.map(tokenFor).map(token => `${token.length}:${token}`).join('|');
}

export function memoize(fn, { limit = Infinity, strategy = 'LRU', ttl = 60000, customEviction, keyResolver} = {}) {
  const cache = new Map();
  const resolveKey = keyResolver || createDefaultKeyResolver();

  return function(...args) {
    const key = resolveKey(args);
    const now = Date.now();

    if (cache.has(key)) {
      const entry = cache.get(key);

      if (strategy === 'TTL' && now - entry.timestamp > ttl) {
        cache.delete(key);
      } else {
        entry.count++;
        if (strategy === 'LRU') {
          cache.delete(key);
          cache.set(key, entry);
        }
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