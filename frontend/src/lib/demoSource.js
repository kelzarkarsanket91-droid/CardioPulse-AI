// Generates a realistic-looking ECG (PQRST) and PPG (with dicrotic notch) waveform
// at ~200 Hz so the whole app can be exercised without any hardware attached.

const SAMPLE_RATE = 200;

function ecgWaveform(phase) {
  // phase runs 0..1 across one heartbeat cycle
  const p = Math.exp(-Math.pow((phase - 0.15) * 40, 2)) * 0.15;
  const q = Math.exp(-Math.pow((phase - 0.28) * 120, 2)) * -0.2;
  const r = Math.exp(-Math.pow((phase - 0.3) * 160, 2)) * 1.2;
  const s = Math.exp(-Math.pow((phase - 0.33) * 120, 2)) * -0.35;
  const t = Math.exp(-Math.pow((phase - 0.55) * 20, 2)) * 0.3;
  return p + q + r + s + t;
}

function ppgWaveform(phase) {
  const main = Math.exp(-Math.pow((phase - 0.18) * 12, 2)) * 1.0;
  const dicrotic = Math.exp(-Math.pow((phase - 0.45) * 18, 2)) * 0.25;
  return main + dicrotic;
}

export function createDemoSource({ onSample, bpm = 72 }) {
  let interval = null;
  let t = 0;
  let currentBpm = bpm;

  function tick() {
    const cycleSeconds = 60 / currentBpm;
    const phase = (t % cycleSeconds) / cycleSeconds;
    const noise = () => (Math.random() - 0.5) * 0.02;

    const ecg = Math.round((512 + ecgWaveform(phase) * 380 + noise() * 100));
    const ppg = Math.round((512 + ppgWaveform((phase + 0.08) % 1) * 340 + noise() * 60));

    onSample(ecg, ppg);
    t += 1 / SAMPLE_RATE;
    // gentle natural HR drift
    if (Math.random() < 0.002) currentBpm = Math.max(58, Math.min(95, currentBpm + (Math.random() - 0.5) * 4));
  }

  return {
    type: "demo",
    sampleRateHz: SAMPLE_RATE,
    start() {
      if (interval) return;
      interval = setInterval(tick, 1000 / SAMPLE_RATE);
    },
    stop() {
      clearInterval(interval);
      interval = null;
    },
  };
}
