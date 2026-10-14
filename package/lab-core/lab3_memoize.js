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
  if (typeof fn !== 'function') {
    throw new TypeError('First argument must be a function');
  }
  const validStrategies = new Set(['LRU', 'LFU', 'TTL', 'CUSTOM']);
  if (!validStrategies.has(strategy)) {
    throw new TypeError(`Invalid strategy: ${strategy}. Valid strategies are: ${Array.from(validStrategies).join(', ')}`);
  }
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 0)) {
    throw new TypeError('Limit must be a non-negative integer or Infinity');
  }
  if (strategy === 'TTL' && (typeof ttl !== 'number' || ttl <= 0)) {
    throw new TypeError('TTL must be a positive number when using TTL strategy');
  }
  if (strategy === 'CUSTOM' && typeof customEviction !== 'function') {
    throw new TypeError('customEviction must be a function when using CUSTOM strategy');
  }
  if (keyResolver !== undefined && typeof keyResolver !== 'function') {
    throw new TypeError('keyResolver must be a function if provided');
  }

  const cache = new Map();
  const resolveKey = keyResolver || createDefaultKeyResolver();
 
  const clearExpired = (now) => {
    if (strategy !== 'TTL') {
      return;
    }
    for (const [key, entry] of cache) {
      if (now - entry.timestamp >= ttl) {
        cache.delete(key);
      }
    }
  };

  const evictOne = () => { 
    if(cache.size === 0) return;
    if(strategy === 'CUSTOM') {
      const sizeBefore = cache.size;
      const keyToEvict = customEviction(cache);
      if(keyToEvict !== undefined) {
        cache.delete(keyToEvict);
      }
      if(sizeBefore > cache.size) return;
    }
    if(strategy === 'LFU') {
      let victim;
      let minCount = Infinity;
      for (const [key, entry] of cache) {
        if (entry.count < minCount) {
          minCount = entry.count;
          victim = key;
        }
      }
      cache.delete(victim);
      return;
    }
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  };

  return function(...args) {
    if (limit === 0) {
      return fn.apply(this, args);
    }
    const key = resolveKey(args);
    const now = Date.now();
    clearExpired(now);
    
    if (cache.has(key)) {
      const entry = cache.get(key);

        entry.count++;
        if (strategy === 'LRU') {
          cache.delete(key);
          cache.set(key, entry);
        }
        return entry.value;
    }    

    const result = fn.apply(this, args);

    if (limit !== Infinity) {
      while (cache.size >= limit) {
        evictOne();
      }
    }

    cache.set(key, { value: result, timestamp: now, count: 1 });
    return result;
  };
}