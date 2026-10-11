// Simple, dependency-free vitals estimation from raw sample buffers.
// This is for demo/education purposes, not a clinical-grade algorithm.

// Detects R-peaks in an ECG buffer using an adaptive threshold + refractory period,
// then converts the average peak-to-peak interval into BPM.
export function estimateBpmFromEcg(buffer, sampleRateHz) {
  if (!buffer.length) return null;
  const mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
  const max = Math.max(...buffer);
  const threshold = mean + (max - mean) * 0.55;
  const refractorySamples = Math.round(sampleRateHz * 0.28); // ~250 BPM ceiling

  const peaks = [];
  let lastPeak = -Infinity;
  for (let i = 1; i < buffer.length - 1; i++) {
    if (buffer[i] > threshold && buffer[i] >= buffer[i - 1] && buffer[i] >= buffer[i + 1]) {
      if (i - lastPeak > refractorySamples) {
        peaks.push(i);
        lastPeak = i;
      }
    }
  }
  if (peaks.length < 2) return null;
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) intervals.push(peaks[i] - peaks[i - 1]);
  const avgSamples = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = (60 * sampleRateHz) / avgSamples;
  if (bpm < 30 || bpm > 220) return null;
  return Math.round(bpm);
}

// Finds pulse peaks in a raw IR PPG buffer when the firmware has not reported PPG_PR.
export function estimateBpmFromPpg(buffer, sampleRateHz) {
  if (buffer.length < sampleRateHz * 2) return null;
  const mean = buffer.reduce((sum, value) => sum + value, 0) / buffer.length;
  const min = Math.min(...buffer);
  const max = Math.max(...buffer);
  const threshold = mean + (max - min) * 0.35;
  const refractorySamples = Math.round(sampleRateHz * 0.45);
  const peaks = [];
  let lastPeak = -Infinity;

  for (let i = 2; i < buffer.length - 2; i += 1) {
    if (buffer[i] >= threshold && buffer[i] >= buffer[i - 1] && buffer[i] >= buffer[i + 1]) {
      if (i - lastPeak > refractorySamples) {
        peaks.push(i);
        lastPeak = i;
      }
    }
  }
  if (peaks.length < 2) return null;
  const intervals = peaks.slice(1).map((peak, index) => peak - peaks[index]);
  const bpm = (60 * sampleRateHz) / (intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length);
  return bpm >= 60 && bpm <= 100 ? Math.round(bpm) : null;
}

// Rough SpO2 estimate from PPG AC/DC ratio. Real pulse-oximetry needs calibrated
// red + infrared channels; this single-channel estimate is for demo purposes only.
export function estimateSpo2FromPpg(buffer) {
  if (buffer.length < 20) return null;
  const dc = buffer.reduce((a, b) => a + b, 0) / buffer.length;
  const ac = Math.max(...buffer) - Math.min(...buffer);
  if (dc === 0) return null;
  const perfusionIndex = (ac / dc) * 100;
  // Maps a normalized ratio onto a plausible 92-99% band - illustrative only.
  const ratio = Math.min(1, ac / (dc * 0.6 || 1));
  const spo2 = Math.round(99 - ratio * 6);
  return { spo2: Math.max(90, Math.min(99, spo2)), perfusionIndex: Math.round(perfusionIndex * 10) / 10 };
}

// Rough pulse-transit-time-style BP estimate placeholder, scaled from BPM.
// Clearly an estimate - real PAT-based BP needs a synced ECG+PPG delay calibration.
export function estimateBpFromBpm(bpm) {
  if (!bpm) return null;
  const systolic = Math.round(100 + (bpm - 70) * 0.5);
  const diastolic = Math.round(68 + (bpm - 70) * 0.3);
  return { systolic: Math.max(90, Math.min(160, systolic)), diastolic: Math.max(55, Math.min(100, diastolic)) };
}

export function signalQuality(buffer) {
  if (buffer.length < 10) return "No signal";
  const mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
  const variance = buffer.reduce((a, b) => a + (b - mean) ** 2, 0) / buffer.length;
  const std = Math.sqrt(variance);
  if (std < 2) return "No signal";
  if (std < 15) return "Weak";
  if (std < 300) return "Good";
  return "Noisy";
}
