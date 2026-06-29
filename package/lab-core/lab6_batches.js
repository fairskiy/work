const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function* generateTelemetry() {
  let id = 1;
  while (true) {
    await delay(50);
    yield { id: id++, cpuLoad: Math.floor(Math.random() * 100), timestamp: Date.now() };
  }
}

export async function* batchStream(iterator, batchSize) {
  let batch = [];
  for await (const item of iterator) {
    if (batch.push(item) === batchSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length) yield batch;
}