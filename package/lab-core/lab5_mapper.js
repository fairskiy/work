export function asyncMapCallback(array, fn, callback) {
  let results = [];
  let completed = 0;
  let hasError = false;

  if (array.length === 0) return callback(null, results);

  array.forEach((item, index) => {
    fn(item, (err, res) => {
      if (hasError) return;
      if (err) {
        hasError = true;
        return callback(err);
      }
      results[index] = res;
      completed++;
      if (completed === array.length) {
        callback(null, results);
      }
    });
  });
}

export function asyncMapPromise(array, fn) {
  return new Promise((resolve, reject) => {
    asyncMapCallback(array, fn, (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

export function asyncMapAbortable(array, fn, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("Aborted", "AbortError"));
    }

    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", onAbort);

    asyncMapPromise(array, fn)
      .then(res => {
        signal?.removeEventListener("abort", onAbort);
        resolve(res);
      })
      .catch(err => {
        signal?.removeEventListener("abort", onAbort);
        reject(err);
      });
  });
}