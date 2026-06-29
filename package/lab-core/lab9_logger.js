import fs from "fs";

const logTargets = {
  console: (msg) => console.log(msg),
  file: (msg) => fs.appendFileSync("logs.txt", msg + "\n"),
  service: (msg) => fs.appendFileSync("service.txt", msg + "\n")
};

export function log(options = {}) {
  const { level = "INFO", output = "console", json = false, onlyErrors = false, formatter } = options;
  const isErrorConfig = level === "ERROR" || onlyErrors;

  return function (fn, name) {
    return async function (...args) {
      const start = Date.now();
      const time = new Date().toISOString();

      const emitLog = (type, extraData) => {
        if (type !== "ERROR" && isErrorConfig) return;

        const base = { time, level: type, name, args, ...extraData };
        let msg = formatter ? formatter(base) : json ? JSON.stringify(base) : "";

        if (!msg) {
          msg = type === "ERROR" 
            ? `[${time}] [ERROR] ${name}: ${base.error}`
            : `[${time}] [${type}] ${name} ${extraData.result !== undefined ? `finished: ${JSON.stringify(extraData.result)} | Time: ${extraData.time}ms` : `called with: ${JSON.stringify(args)}`}`;
        }

        (logTargets[output] || logTargets.console)(msg);
      };

      emitLog(level, {});

      try {
        const result = await fn.apply(this, args);
        emitLog(level, { result, time: Date.now() - start });
        return result;
      } catch (error) {
        emitLog("ERROR", { error: error.message });
        throw error;
      }
    };
  };
}