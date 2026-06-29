const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Синхронний генератор
export function* fibonacciGenerator() {
    let curr = 0, next = 1;
    while (true) {
        yield curr;
        [curr, next] = [next, curr + next];
    }
}

// Асинхронний генератор з лімітом кроків та затримкою
export async function* asyncFibonacciGenerator(count = 10, delay = 500) {
    let curr = 0, next = 1; 
    for (let i = 0; i < count; i++) {
        await sleep(delay);
        yield curr;
        [curr, next] = [next, curr + next];
    }
}