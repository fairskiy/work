export function asyncMapCallback(array, fn, callback) {
  if (!Array.isArray(array)) throw new TypeError('array must be an array');
  if (typeof fn !== 'function') throw new TypeError('fn must be a function');
  if (typeof callback !== 'function') throw new TypeError('callback must be a function');

  const results = new Array(array.length);
  let completed = 0;
  let finished = false;

  if (array.length === 0) return callback(null, []);

  array.forEach((item, index) => {
    if (finished) return;
    let called = false;

    try {
      fn(item, (err, value) => {
        if (finished || called) return;
        called = true;

        if (err) {
          finished = true;
          return callback(err);
        }

        results[index] = value;
        completed++;
        if (completed === array.length) {
          finished = true;
          callback(null, results);
        }
      });
    } catch (err) {
      if (!finished) {
        finished = true;
        callback(err);
      }
    }
  });
}

export function asyncMapPromise(array, fn) {
  return new Promise((resolve, reject) => {
    try {
      asyncMapCallback(array, fn, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function asyncMapAbortable(array, fn, signal) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(array)) return reject(new TypeError('array must be an array'));
    if (typeof fn !== 'function') return reject(new TypeError('fn must be a function'));
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    if (array.length === 0) return resolve([]);

    const results = new Array(array.length);
    const cleanupFunctions = [];
    let completed = 0;
    let finished = false;

    const cleanupWorkers = () => {
      while (cleanupFunctions.length > 0) {
        try {
          cleanupFunctions.pop()();
        } catch (err) {
          // Cleanup errors must not replace the original error.
        }
      }
    };

    const finish = (err, values) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', onAbort);
      if (err) {
        cleanupWorkers();
        reject(err);
      } else {
        cleanupFunctions.length = 0;
        resolve(values);
      }
    };

    const onAbort = () => finish(new DOMException('Aborted', 'AbortError'));
    signal?.addEventListener('abort', onAbort, { once: true });

    array.forEach((item, index) => {
      if (finished) return;
      let called = false;

      try {
        const cleanup = fn(item, (err, value) => {
          if (finished || called) return;
          called = true;
          if (err) return finish(err);

          results[index] = value;
          completed++;
          if (completed === array.length) finish(null, results);
        }, signal);

        if (typeof cleanup === 'function') {
          if (finished) {
            // If an abort/error happened during a synchronous worker,
            // its cleanup handle is still released.
            try { cleanup(); } catch (err) { /* Ignore cleanup errors. */ }
          } else {
            cleanupFunctions.push(cleanup);
          }
        }
      } catch (err) {
        finish(err);
      }
    });
  });
}
