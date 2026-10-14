// Generates realistic, medical-grade multi-lead ECG (Lead II, V1, V2, V3, V4)
// and PPG (with systolic peak and dicrotic notch) waveforms at 200 Hz.
import { getLeadEcgValue } from "./ecgAnalysis";

const SAMPLE_RATE = 200;

function ppgWaveform(phase) {
  // Main arterial systolic expansion + dicrotic notch from aortic valve closure
  const systolic = Math.exp(-Math.pow((phase - 0.20) * 14, 2)) * 1.0;
  const dicrotic = Math.exp(-Math.pow((phase - 0.44) * 20, 2)) * 0.28;
  return systolic + dicrotic;
}

export function createDemoSource({ onSample, bpm = 72, lead = "II" }) {
  let interval = null;
  let t = 0;
  let currentBpm = bpm;
  let currentLead = lead;

  function tick() {
    const cycleSeconds = 60 / currentBpm;
    const phase = (t % cycleSeconds) / cycleSeconds;
    // Minimal baseline micro-noise (0.5% max) for authentic analog feel without degrading crispness
    const noise = () => (Math.random() - 0.5) * 3;

    const ecgII = Math.round(512 + getLeadEcgValue(phase, "II") * 380 + noise());
    const ecgV1 = Math.round(512 + getLeadEcgValue(phase, "V1") * 380 + noise());
    const ecgV2 = Math.round(512 + getLeadEcgValue(phase, "V2") * 380 + noise());
    const ecgV3 = Math.round(512 + getLeadEcgValue(phase, "V3") * 380 + noise());
    const ecgV4 = Math.round(512 + getLeadEcgValue(phase, "V4") * 380 + noise());

    const activeEcg = Math.round(512 + getLeadEcgValue(phase, currentLead) * 380 + noise());
    const ppg = Math.round(512 + ppgWaveform((phase + 0.12) % 1) * 340 + noise() * 0.5);

    onSample(activeEcg, ppg, {
      II: ecgII,
      V1: ecgV1,
      V2: ecgV2,
      V3: ecgV3,
      V4: ecgV4,
      bpm: Math.round(currentBpm),
    });

    t += 1 / SAMPLE_RATE;
    // subtle natural respiratory variation
    if (Math.random() < 0.005) {
      currentBpm = Math.max(62, Math.min(88, currentBpm + (Math.random() - 0.5) * 1.5));
    }
  }

  return {
    type: "demo",
    sampleRateHz: SAMPLE_RATE,
    setLead(newLead) {
      currentLead = newLead || "II";
    },
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
