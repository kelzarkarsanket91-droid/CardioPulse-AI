// Talks to the ESP32 over the Web Serial API (Chrome/Edge desktop only).
// Firmware streams keyed values at 115200 baud, for example:
// "ECG_HR:72,...,ECG:512,PPG_IR:478".

export function isSerialSupported() {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export async function createSerialSource({ onSample, onMetrics, onDisconnect }) {
  if (!isSerialSupported()) {
    throw new Error("Web Serial isn't supported in this browser. Use Chrome or Edge on desktop.");
  }
  const port = await navigator.serial.requestPort();
  try {
    await port.open({ baudRate: 115200 });
  } catch (err) {
    throw new Error(
      "The ESP32 serial port is busy. Stop PlatformIO Serial Monitor in VS Code, close Arduino Serial Monitor, then try Connect device again."
    );
  }

  const textDecoder = new TextDecoderStream();
  const readableClosed = port.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();

  let buffer = "";
  let reading = false;

  async function readLoop() {
    reading = true;
    try {
      while (reading) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          const keyedValues = Object.fromEntries(
            line.split(",").map((part) => {
              const separator = part.indexOf(":");
              return separator > 0 ? [part.slice(0, separator), part.slice(separator + 1)] : [part, ""];
            })
          );
          const keyedEcg = Number(keyedValues.ECG);
          const keyedPpg = Number(keyedValues.PPG_IR);
          if (!Number.isNaN(keyedEcg) && !Number.isNaN(keyedPpg)) {
            if (onMetrics) {
              onMetrics({
                ecg: keyedEcg,
                ppg: keyedPpg,
                bpm: parseMetric(keyedValues.PPG_PR),
                spo2: parseMetric(keyedValues.SPO2),
                systolic: parseMetric(keyedValues.BP_Sys),
                diastolic: parseMetric(keyedValues.BP_Dia),
                pi: parseMetric(keyedValues.PI),
                temperature: parseMetric(keyedValues.TEMP),
              });
            }
            onSample(keyedEcg, keyedPpg);
            continue;
          }

          // Keep compatibility with simple "ecg,ppg" firmware streams.
          const parts = line.split(",");
          if (parts.length >= 2) {
            const ecg = Number(parts[0]);
            const ppg = Number(parts[1]);
            if (!Number.isNaN(ecg) && !Number.isNaN(ppg)) onSample(ecg, ppg);
          }
        }
      }
    } catch (err) {
      // Port likely unplugged mid-read; surface via onDisconnect.
    } finally {
      reading = false;
      if (onDisconnect) onDisconnect();
    }
  }

  return {
    type: "serial",
    sampleRateHz: 200, // matches firmware's target rate; charts adapt to actual arrival timing
    start() {
      readLoop();
    },
    async stop() {
      reading = false;
      try {
        await reader.cancel();
      } catch (_) {}
      try {
        await readableClosed;
      } catch (_) {}
      try {
        await port.close();
      } catch (_) {}
    },
  };
}

function parseMetric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
