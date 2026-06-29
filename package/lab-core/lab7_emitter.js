import { EventEmitter } from 'events';

export function runSmartHubSimulation() {
  const smartHub = new EventEmitter();

  const logger = (temp) => console.log(`  [Logger] Temperature is ${temp}°C`);
  const conditioner = (temp) => temp > 25 && console.log("  [Conditioner] It's too hot! Turning on the AC.");
  const fireAlarm = (temp) => {
    if (temp > 60) {
      console.log("  [FireAlarm] Alert! Temperature > 60°C! Activating suppression system.");
      smartHub.off('temperatureChange', conditioner);
    }
  };

  smartHub.on('temperatureChange', logger);
  smartHub.on('temperatureChange', conditioner);
  smartHub.on('temperatureChange', fireAlarm);

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
}