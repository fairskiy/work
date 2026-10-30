import { EventEmitter } from 'events';

export class SafeEventBus extends EventEmitter {
  subscribe(eventName, listener) {
    this.on(eventName, listener);
    return () => this.off(eventName, listener);
  }

  emit(eventName, ...args) {
    const listeners = this.rawListeners(eventName);

    if (eventName === 'error' && listeners.length === 0) {
      throw args[0] instanceof Error ? args[0] : new Error(String(args[0]));
    }

    let unhandledError = null;

    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (err) {
        if (eventName === 'error') {
          // Помилка error-listener не зупиняє інших слухачів.
          unhandledError ??= err;
        } else if (this.listenerCount('error') > 0) {
          try {
            this.emit('error', err, { eventName, args });
          } catch (errorHandlerError) {
            unhandledError ??= errorHandlerError;
          }
        } else {
          unhandledError ??= err;
        }
      }
    }

    if (unhandledError) throw unhandledError;
    return listeners.length > 0;
  }
}

export function runSmartHubSimulation() {
  const smartHub = new SafeEventBus();

  const logger = (temp) => console.log(`  [Logger] Temperature is ${temp}°C`);
  const conditioner = (temp) => temp > 25 && console.log("  [Conditioner] It's too hot! Turning on the AC.");
  const fireAlarm = (temp) => {
    if (temp > 60) {
      console.log("  [FireAlarm] Alert! Temperature > 60°C! Activating suppression system.");
      unsubscribeConditioner();
    }
  };

  const brokenSensor = (temp) => {
    if (temp === 28) throw new Error('Temperature sensor failed');
  };

  smartHub.subscribe('error', (err, info) => {
    console.log(`  [Error] ${info.eventName}: ${err.message}`);
  });
  smartHub.subscribe('temperatureChange', logger);
  smartHub.subscribe('temperatureChange', brokenSensor);
  const unsubscribeConditioner = smartHub.subscribe('temperatureChange', conditioner);
  smartHub.subscribe('temperatureChange', fireAlarm);

  const schedule = [
    ["Morning", 22],
    ["Afternoon", 28],
    ["Evening", 65],
    ["Later in evening", 90]
  ];

  schedule.forEach(([time, temp]) => {
    console.log(`\n• Симуляція періоду: ${time}`);
    smartHub.emit('temperatureChange', temp);
  });

  return smartHub;
}
