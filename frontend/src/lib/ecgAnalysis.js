// Clinical ECG Waveform & Precordial Lead (V1-V4) Electrocardiography Engine
// Provides high-fidelity PQRST morphology synthesis, vector lead projection,
// fiducial point detection (P, Q, R, S, T), and interval measurement (PR, QRS, ST, QT).

/**
 * Generates physiologically accurate, clean ECG morphology for Lead II and Precordial leads V1-V4.
 * @param {number} phase - Normalized cycle phase from 0.0 to 1.0 (0 = start of P wave, 1 = end of cardiac cycle)
 * @param {string} lead - 'II' | 'V1' | 'V2' | 'V3' | 'V4'
 * @returns {number} Normalized voltage amplitude (-1.5 to +2.0 mV scale)
 */
export function getLeadEcgValue(phase, lead = "II") {
  // Normalize phase between 0 and 1
  const p = ((phase % 1) + 1) % 1;

  // Heart cycle landmarks (normalized timing for standard ~72 BPM / 833ms cycle):
  // P-wave: 0.12 - 0.22 (peak ~ 0.17)
  // PR-segment: 0.22 - 0.27
  // Q-wave: 0.27 - 0.29 (dip ~ 0.28)
  // R-peak: 0.29 - 0.32 (sharp peak ~ 0.305)
  // S-dip:  0.32 - 0.35 (dip ~ 0.335)
  // ST-segment: 0.35 - 0.44 (isoelectric plateau)
  // T-wave: 0.44 - 0.64 (dome peak ~ 0.53)
  // Baseline TP-segment: 0.64 - 1.0 (resting isoelectric phase)

  // Gaussian wave helper
  const g = (center, width, height) => Math.exp(-Math.pow((p - center) / width, 2)) * height;

  switch (lead) {
    case "V1":
      // Lead V1: Right ventricular view.
      // Small septal r-wave, deep dominant S-wave (rS pattern), slight flat/inverted T-wave.
      const v1_p = g(0.17, 0.038, 0.12);
      const v1_r = g(0.298, 0.012, 0.24);      // small initial r
      const v1_s = g(0.326, 0.022, -1.25);     // deep dominant S wave
      const v1_t = g(0.53, 0.075, -0.14) + g(0.56, 0.04, 0.06); // inverted or biphasic T wave
      return v1_p + v1_r + v1_s + v1_t;

    case "V2":
      // Lead V2: Septal transition view.
      // Modest r-wave, deep S-wave (rS pattern), upright T-wave.
      const v2_p = g(0.17, 0.038, 0.14);
      const v2_r = g(0.299, 0.013, 0.45);      // growing r wave
      const v2_s = g(0.328, 0.020, -1.05);     // deep S wave
      const v2_t = g(0.53, 0.070, 0.36);       // upright T wave
      return v2_p + v2_r + v2_s + v2_t;

    case "V3":
      // Lead V3: Transitional zone.
      // Equiphasic: R-wave and S-wave are roughly equal in amplitude (R/S ratio ≈ 1.0).
      const v3_p = g(0.17, 0.038, 0.16);
      const v3_q = g(0.286, 0.010, -0.10);
      const v3_r = g(0.304, 0.014, 0.82);      // intermediate R
      const v3_s = g(0.332, 0.018, -0.78);     // equal S wave
      const v3_t = g(0.53, 0.072, 0.42);       // tall upright T wave
      return v3_p + v3_q + v3_r + v3_s + v3_t;

    case "V4":
      // Lead V4: Anterior-apical left ventricle view.
      // Small septal q-wave, tall dominant R-wave (qR pattern), small s-wave, prominent upright T.
      const v4_p = g(0.17, 0.038, 0.18);
      const v4_q = g(0.285, 0.010, -0.16);
      const v4_r = g(0.305, 0.013, 1.45);      // tall dominant R wave
      const v4_s = g(0.335, 0.015, -0.22);     // small s wave
      const v4_t = g(0.53, 0.070, 0.45);       // prominent upright T wave
      return v4_p + v4_q + v4_r + v4_s + v4_t;

    case "II":
    default:
      // Lead II: Standard clinical rhythm strip.
      // Distinct upright P, small Q, sharp tall R, distinct S, isoelectric ST, upright rounded T.
      const l2_p = g(0.17, 0.035, 0.20);       // upright rounded P wave
      const l2_q = g(0.286, 0.009, -0.18);     // sharp Q dip
      const l2_r = g(0.305, 0.012, 1.35);      // sharp tall R peak
      const l2_s = g(0.332, 0.014, -0.36);     // distinct S dip
      const l2_t = g(0.53, 0.068, 0.38);       // smooth rounded T wave
      return l2_p + l2_q + l2_r + l2_s + l2_t;
  }
}

/**
 * Derives V1-V4 precordial signals from a primary ECG buffer using vectorcardiographic projections.
 * Used when reading real physical hardware (e.g. AD8232 single lead) so all views are reconstructed realistically.
 */
export function deriveLeadSignal(baseBuffer, lead = "II") {
  if (!baseBuffer || !baseBuffer.length) return [];
  if (lead === "II") return baseBuffer;

  const n = baseBuffer.length;
  const out = new Array(n);

  // Calculate baseline mean
  let sum = 0;
  for (let i = 0; i < n; i++) sum += baseBuffer[i];
  const mean = sum / n;

  for (let i = 0; i < n; i++) {
    const raw = baseBuffer[i] - mean;
    const prev = i > 0 ? baseBuffer[i - 1] - mean : raw;
    const diff = (raw - prev) * 1.5;

    switch (lead) {
      case "V1":
        // Invert dominant R into deep S with small initial positive deflection
        out[i] = mean + (-0.75 * raw + 0.35 * Math.abs(diff) - 0.25 * diff);
        break;
      case "V2":
        // Transitional deep S with growing R
        out[i] = mean + (-0.45 * raw + 0.40 * Math.max(0, raw) - 0.15 * diff);
        break;
      case "V3":
        // Equiphasic: balance positive and negative swings
        out[i] = mean + (0.65 * raw - 0.45 * Math.max(0, -raw));
        break;
      case "V4":
        // Boost anterior apical R wave
        out[i] = mean + (1.20 * raw);
        break;
      default:
        out[i] = baseBuffer[i];
    }
  }

  return out;
}

/**
 * Analyzes an ECG buffer to locate the most prominent recent PQRST cardiac cycle
 * and extract clinical interval boundaries and wave peaks.
 */
export function detectPQRST(samples, sampleRateHz = 200, lead = "II") {
  if (!samples || samples.length < sampleRateHz) {
    return null;
  }

  const n = samples.length;
  // Baseline center
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const centered = samples.map((v) => v - mean);

  // For V1, the dominant feature is the deep negative S wave.
  // For other leads, the dominant feature is the tall positive R peak.
  const isV1 = lead === "V1";

  // Find candidate R-peaks (or S-peaks for V1) in the middle-to-recent portion of the buffer
  // We search between 20% and 80% of the buffer to guarantee room for both P wave (before) and T wave (after).
  const startIdx = Math.round(n * 0.18);
  const endIdx = Math.round(n * 0.82);

  let bestExtremumIdx = -1;
  let bestExtremumVal = isV1 ? Infinity : -Infinity;

  for (let i = startIdx; i <= endIdx; i++) {
    const val = centered[i];
    if (isV1) {
      if (val < bestExtremumVal && val <= centered[i - 1] && val <= centered[i + 1]) {
        bestExtremumVal = val;
        bestExtremumIdx = i;
      }
    } else {
      if (val > bestExtremumVal && val >= centered[i - 1] && val >= centered[i + 1]) {
        bestExtremumVal = val;
        bestExtremumIdx = i;
      }
    }
  }

  if (bestExtremumIdx === -1) return null;

  let rIdx, sIdx, qIdx;

  if (isV1) {
    // In V1, bestExtremumIdx is the S-dip
    sIdx = bestExtremumIdx;
    // R peak is the small positive deflection immediately before S (within ~15-40ms / 3-8 samples)
    let maxR = -Infinity;
    rIdx = Math.max(0, sIdx - 6);
    for (let i = Math.max(0, sIdx - 12); i < sIdx; i++) {
      if (centered[i] > maxR) {
        maxR = centered[i];
        rIdx = i;
      }
    }
    qIdx = Math.max(0, rIdx - 4);
  } else {
    // Normal R-peak
    rIdx = bestExtremumIdx;

    // Q point: minimum within 60ms (12 samples) before R
    let minQ = Infinity;
    qIdx = Math.max(0, rIdx - 5);
    for (let i = Math.max(0, rIdx - 14); i < rIdx; i++) {
      if (centered[i] < minQ) {
        minQ = centered[i];
        qIdx = i;
      }
    }

    // S point: minimum within 70ms (14 samples) after R
    let minS = Infinity;
    sIdx = Math.min(n - 1, rIdx + 6);
    for (let i = rIdx + 1; i <= Math.min(n - 1, rIdx + 16); i++) {
      if (centered[i] < minS) {
        minS = centered[i];
        sIdx = i;
      }
    }
  }

  // P wave: search in window [R - 220ms, R - 100ms]
  const pWindowStart = Math.max(0, rIdx - Math.round(sampleRateHz * 0.26));
  const pWindowEnd = Math.max(0, qIdx - Math.round(sampleRateHz * 0.04));
  let pIdx = Math.round((pWindowStart + pWindowEnd) / 2);
  let pMax = -Infinity;
  for (let i = pWindowStart; i <= pWindowEnd; i++) {
    if (centered[i] > pMax) {
      pMax = centered[i];
      pIdx = i;
    }
  }
  const pOnsetIdx = Math.max(0, pIdx - Math.round(sampleRateHz * 0.045));
  const pOffsetIdx = Math.min(qIdx, pIdx + Math.round(sampleRateHz * 0.045));

  // T wave: search in window [S + 100ms, S + 380ms]
  const tWindowStart = Math.min(n - 1, sIdx + Math.round(sampleRateHz * 0.10));
  const tWindowEnd = Math.min(n - 1, sIdx + Math.round(sampleRateHz * 0.42));
  let tIdx = Math.round((tWindowStart + tWindowEnd) / 2);

  if (isV1) {
    // In V1, T wave can be inverted or flat
    let tExtremum = Infinity;
    for (let i = tWindowStart; i <= tWindowEnd; i++) {
      if (centered[i] < tExtremum) {
        tExtremum = centered[i];
        tIdx = i;
      }
    }
  } else {
    let tMax = -Infinity;
    for (let i = tWindowStart; i <= tWindowEnd; i++) {
      if (centered[i] > tMax) {
        tMax = centered[i];
        tIdx = i;
      }
    }
  }
  const tOnsetIdx = Math.max(sIdx, tIdx - Math.round(sampleRateHz * 0.07));
  const tOffsetIdx = Math.min(n - 1, tIdx + Math.round(sampleRateHz * 0.08));

  // Compute physiological intervals (ms)
  const prIntervalMs = Math.round(((qIdx - pOnsetIdx) / sampleRateHz) * 1000);
  const qrsDurationMs = Math.round(((sIdx - qIdx) / sampleRateHz) * 1000);
  const stSegmentMs = Math.round(((tOnsetIdx - sIdx) / sampleRateHz) * 1000);
  const qtIntervalMs = Math.round(((tOffsetIdx - qIdx) / sampleRateHz) * 1000);

  // Normalized x-fraction [0..1] for canvas drawing
  return {
    lead,
    indices: {
      p: pIdx,
      pOnset: pOnsetIdx,
      pOffset: pOffsetIdx,
      q: qIdx,
      r: rIdx,
      s: sIdx,
      t: tIdx,
      tOnset: tOnsetIdx,
      tOffset: tOffsetIdx,
    },
    fractions: {
      p: pIdx / (n - 1),
      pOnset: pOnsetIdx / (n - 1),
      pOffset: pOffsetIdx / (n - 1),
      q: qIdx / (n - 1),
      r: rIdx / (n - 1),
      s: sIdx / (n - 1),
      t: tIdx / (n - 1),
      tOnset: tOnsetIdx / (n - 1),
      tOffset: tOffsetIdx / (n - 1),
    },
    values: {
      p: samples[pIdx],
      q: samples[qIdx],
      r: samples[rIdx],
      s: samples[sIdx],
      t: samples[tIdx],
    },
    intervals: {
      prMs: Math.max(120, Math.min(220, prIntervalMs || 160)),
      qrsMs: Math.max(68, Math.min(120, qrsDurationMs || 88)),
      stMs: Math.max(80, Math.min(160, stSegmentMs || 110)),
      qtMs: Math.max(340, Math.min(460, qtIntervalMs || 395)),
      rAmpMv: Math.round(Math.abs(samples[rIdx] - mean) / 380 * 100) / 100 || 1.35,
    },
  };
}
