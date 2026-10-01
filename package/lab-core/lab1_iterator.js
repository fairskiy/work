const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Асинхронний генератор з лімітом кроків та затримкою
export async function* consumeWithTimeout(iterator, timeoutSeconds, processor = value => console.log(`  Processed: ${value}`)) {
    if (!iterator || typeof iterator.next !== 'function') {
        throw new TypeError('Invalid iterator provided');
    }
    if (typeof timeoutSeconds !== 'number' || timeoutSeconds < 0) {
        throw new RangeError('Timeout must be a non-negative number');
    }
    if (typeof processor !== 'function') {
        throw new TypeError('Processor must be a function');
    }
    const deadline = Date.now() + timeoutSeconds * 1000;
    let processedCount = 0;
    while (Date.now() < deadline) {
        const result  = iterator.next();
        if (result.done) break;
        await processor(result.value, processedCount); // Затримка 1 секунда
        processedCount++;
    }
    return processedCount;
}