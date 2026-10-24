import readline from 'readline';

import {
    fibonacciGenerator,
    consumeWithTimeout,
    memoize,
    BiDirectionalPriorityQueue,
    Mode,
    asyncMapCallback,
    asyncMapPromise,
    asyncMapAbortable,
    generateTelemetry,
    batchStream,
    runSmartHubSimulation,
    ApiProxy,
    JwtStrategy,
    log
} from "lab-core";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function runLab1() {
  console.log("\n--- 1 лабораторна: синхронні та асинхронні генератори ---");
  console.log("1. Перші 5 чисел синхронного Фібоначчі:");
  const gen = fibonacciGenerator();
  for (let i = 0; i < 5; i++) console.log(`   Значення: ${gen.next().value}`);

  console.log("\n2. Споживання довільного ітератора протягом 0.01 секунд:");
  const iterator = fibonacciGenerator();
  let shown = 0;
  const processedCount = await consumeWithTimeout(iterator, 0.01, value => {
    if (shown < 5) console.log(`   Processed: ${value}`);
    shown++;
  });
  console.log(`   Загальна кількість оброблених елементів: ${processedCount}`);

}

async function runLab3() {
  console.log('\n--- лабораторна 3: мемоізація та кешування ---');
  let calls = 0;
  const square = (n) => {
      calls++;
      return n * n;
  };

  const lru = memoize(
      square,
      {
        limit: 2,
        strategy: 'LRU'
      }
  );
  lru(2);
  lru(3);
  lru(2);
  lru(4);
  console.log(`LRU: function calls = ${calls}`);

  calls = 0;
  const lfu = memoize(square, { limit: 2, strategy: 'LFU' });
  lfu(2);
  lfu(2);
  lfu(3);
  lfu(4);

  console.log(`LFU: function calls = ${calls}`);

  calls = 0;
  const ttlMemo = memoize(square, { limit: 2, strategy: 'TTL', ttl: 20 });
  ttlMemo(5);
  await new Promise(resolve => setTimeout(resolve, 30));
  ttlMemo(5);
  console.log(`TTL: function calls = ${calls}`);

  calls = 0;
  const custom = memoize(square, { limit: 2, strategy: 'CUSTOM', 
    customEviction: cache => cache.keys().next().value});
  custom(6);
  custom(7);
  custom(8);
  custom(6);

  console.log(`CUSTOM: function calls = ${calls}`);

  let keyCalls = 0;
  const identify = memoize(value => {
    keyCalls++; 
    return String(value);
  });
  identify(null);
  identify(NaN);
  identify(null);
  console.log(`Safe keys: ${keyCalls === 2 ? 'PASS' : 'FAIL'}`);
}

function runLab4() {
  console.log("\n--- лабораторна 4: двонаправлена черга з пріоритетами ---");
  const queue = new BiDirectionalPriorityQueue();
  queue.enqueue("Task Low", 10);
  queue.enqueue("Task High", 50);
  queue.enqueue("Task Critical", 100);
  queue.enqueue("Task Medium", 30);


  console.log(`HIGHEST елемент: ${queue.peek(Mode.HIGHEST)}`);
  console.log(`LOWEST елемент: ${queue.peek(Mode.LOWEST)}`);
  console.log(`OLDEST елемент: ${queue.peek(Mode.OLDEST)}`);
  console.log(`NEWEST елемент: ${queue.peek(Mode.NEWEST)}`);
  
  console.log("\nВидалення елементів:");

  console.log(`HIGHEST елемент: ${queue.dequeue(Mode.HIGHEST)}`);
  console.log(`LOWEST елемент: ${queue.dequeue(Mode.LOWEST)}`);
  console.log(`OLDEST елемент: ${queue.dequeue(Mode.OLDEST)}`);
  console.log(`NEWEST елемент: ${queue.dequeue(Mode.NEWEST)}`);

  console.log(`Залишилось елементів: ${queue.size}`);
  try {
    queue.peek("unknown");
  } catch (err) {
    console.log(`Перевірка режиму: ${err.name}`);
  }
}

async function runLab5() {
  console.log("\n--- лабораторна 5: асинхронні мапери колекцій ---");

  const asyncWorker = (item, cb) => {
    const timer = setTimeout(() => cb(null, item * 10), 100);
    return () => clearTimeout(timer);
  };

  await new Promise((resolve, reject) => {
    asyncMapCallback([1, 2, 3], asyncWorker, (err, result) => {
      if (err) return reject(err);
      console.log("Результат Callback-мапера:", result);
      resolve();
    });
  });

  const resPromise = await asyncMapPromise([1, 2, 3], asyncWorker);
  console.log("Результат Promise-мапера:", resPromise);

  let completedAfterAbort = 0;
  let clearedOnAbort = 0;

  const abortableWorker = (item, cb) => {
    const timer = setTimeout(() => {
      completedAfterAbort++;
      cb(null, item * 10);
    }, 200);

    return () => {
      clearedOnAbort++;
      clearTimeout(timer);
    };
  };

  console.log("Запуск Abortable-мапера і скасування під час роботи...");

  const controller = new AbortController();

  const operation = asyncMapAbortable(
    [1, 2, 3],
    abortableWorker,
    controller.signal
  );

  setTimeout(() => controller.abort(), 20);

  try {
    await operation;
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
    console.log("Перехоплено очікувану помилку:", err.name);
  }

  await new Promise(resolve => setTimeout(resolve, 220));

  console.log("Очищено таймерів:", clearedOnAbort);
  console.log("Worker-ів завершилось після abort:", completedAfterAbort);
}

async function runLab6() {
  console.log("\n--- лабораторна 6: батчинг телеметрії ---");
  const batchIterator = batchStream(generateTelemetry(), 3);
  console.log("Зчитуємо перші 2 батчі по 3 елементи:");

  try {
    for (let i = 1; i <= 2; i++) {
      const { value: batch } = await batchIterator.next();
      console.log(`Батч #${i}:`, batch);
    }
  } finally {
    await batchIterator.return();
  }

  async function* failingProducer() {
    yield 1;
    throw new Error('Producer failed');
  }

  try {
    for await (const batch of batchStream(failingProducer(), 1)) {
      console.log('Тестовий batch:', batch);
    }
  } catch (err) {
    console.log('Помилка producer:', err.message);
  }
}

function runLab7() {
  console.log("\n--- лабораторна 7: симуляція реактивного смарт-хабу ---");
  runSmartHubSimulation();
}

async function runLab8() {
  console.log("\n--- лабораторна 8: api proxy та rate limiter ---");
  const api = new ApiProxy(new JwtStrategy('old_expired_token'), 2);
  await Promise.all([api.request('/data/1'), api.request('/data/2')]);
}

async function runLab9() {
  console.log("\n--- лабораторна 9: декоратор логування ---");
  class SimpleService {
    calculate(a, b) { return a + b; }
  }
  const service = new SimpleService();
  service.calculate = log({ level: "INFO", output: "console" })(service.calculate.bind(service), "calculate");
  
  console.log("   Виклик декорованого методу:");
  await service.calculate(5, 10);
}

function showMenu() {
  console.log("\n=======================================================");
  console.log("               Курсова робота     ");
  console.log("=======================================================");
  console.log("1. Лаба 1: Синхронні / Асинхронні генератори");
  console.log("2. Лаба 3: Мемоізація функцій та стратегії кешування");
  console.log("3. Лаба 4: Двонаправлена черга з пріоритетами");
  console.log("4. Лаба 5: Асинхронні мапери (Promises & AbortSignal)");
  console.log("5. Лаба 6: Асинхронні потоки та батчинг телеметрії");
  console.log("6. Лаба 7: EventEmitter та реактивна система SmartHub");
  console.log("7. Лаба 8: Авторизаційний Проксі та Rate Limiter");
  console.log("8. Лаба 9: Функціональний Декоратор Логування (AOP)");
  console.log("0. Вийти з курсової роботи");
  console.log("=======================================================");

  rl.question('Оберіть номер лабораторної для демонстрації: ', async (choice) => {
    const formattedChoice = choice.trim();
    
    if (formattedChoice === '0') {
      console.log("\nДякуємо за перегляд курсової роботи! Завершення процесу.");
      rl.close();
      return; //
    }

    try {
      switch (formattedChoice) {
        case '1': await runLab1(); break;
        case '2': await runLab3(); break;
        case '3': runLab4(); break;
        case '4': await runLab5(); break;
        case '5': await runLab6(); break;
        case '6': runLab7(); break;
        case '7': await runLab8(); break;
        case '8': await runLab9(); break;
        default: console.log("Невірний вибір. Будь ласка, оберіть номер від 0 до 8."); break;
      }
    } catch (err) {
        console.error("Сталася помилка під час виконання лабораторної:", err);
    }

    await sleep(1500);
    showMenu(); // Повертаємося в меню тільки після завершення роботи лаби
  });
}

showMenu();