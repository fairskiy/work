// Синхронний генератор
export function* fibonacciGenerator() {
    let curr = 0, next = 1;
    while (true) {
        yield curr;
        [curr, next] = [next, curr + next];
    }
}

