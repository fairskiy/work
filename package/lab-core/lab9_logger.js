import fs from 'node:fs';

export class ConsoleLogger {
  write(message) {
    console.log(message);
  }
}

export class FileLogger {
  constructor(filename = 'logs.txt') {
    this.filename = filename;
  }

  write(message) {
    fs.appendFileSync(this.filename, message + '\n');
  }
}

export class ExternalServiceLogger {
  constructor(send) {
    if (typeof send !== 'function') throw new TypeError('send must be a function');
    this.send = send;
  }

  write(message, entry) {
    return this.send(message, entry);
  }
}

export function log(options = {}) {
  const { level = 'INFO', logger = new ConsoleLogger(), json = false,
    onlyErrors = false, formatter } = options;

  if (!['INFO', 'DEBUG', 'ERROR'].includes(level)) {
    throw new RangeError(`Unknown log level: ${level}`);
  }
  if (!logger || typeof logger.write !== 'function') {
    throw new TypeError('logger must have write()');
  }
  if (formatter !== undefined && typeof formatter !== 'function') {
    throw new TypeError('formatter must be a function');
  }

  const errorOnly = level === 'ERROR' || onlyErrors;

  return function (fn, name = fn?.name || 'anonymous') {
    if (typeof fn !== 'function') throw new TypeError('fn must be a function');

    return function (...args) {
      const start = performance.now();

      const emitLog = (type, details = {}) => {
        if (errorOnly && type !== 'ERROR') return;

        const entry = {
          timestamp: new Date().toISOString(), level: type, name, args, ...details
        };
        const message = formatter
          ? formatter(entry)
          : json ? JSON.stringify(entry)
          : type === 'ERROR'
            ? `[${entry.timestamp}] [ERROR] ${name}: ${entry.error}`
            : Object.prototype.hasOwnProperty.call(details, 'result')
              ? `[${entry.timestamp}] [${type}] ${name} finished: ${JSON.stringify(details.result)} | Time: ${entry.executionTime}ms`
              : `[${entry.timestamp}] [${type}] ${name} called with: ${JSON.stringify(args)}`;

        // A logging transport must not change the wrapped function's result.
        try {
          const pending = logger.write(message, entry);
          if (pending && typeof pending.then === 'function') {
            Promise.resolve(pending).catch(() => {});
          }
        } catch {
          // Ignore transport failures.
        }
      };

      const onError = error => {
        emitLog('ERROR', {
          error: error?.message || String(error),
          executionTime: Math.round(performance.now() - start)
        });
        throw error;
      };

      if (!errorOnly) emitLog(level);

      let result;
      try {
        result = fn.apply(this, args);
      } catch (error) {
        return onError(error);
      }

      if (result && typeof result.then === 'function') {
        return Promise.resolve(result).then(value => {
          if (!errorOnly) emitLog(level, {
            result: value, executionTime: Math.round(performance.now() - start)
          });
          return value;
        }, onError);
      }

      if (!errorOnly) emitLog(level, {
        result, executionTime: Math.round(performance.now() - start)
      });
      return result;
    };
  };
}
