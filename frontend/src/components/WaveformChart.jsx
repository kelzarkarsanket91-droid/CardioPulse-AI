import { useEffect, useRef } from "react";
import { detectPQRST } from "../lib/ecgAnalysis";

export default function WaveformChart({
  bufferRef,
  color = "#17b6c4",
  height = 180,
  grid = true,
  label = "ECG",
  lead = "II",
  showAnnotations = true,
  showRegions = true,
  onAnalysisUpdate = null,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const scaleRef = useRef({ min: 0, max: 1 });
  const isEcg = label.includes("ECG") || ["II", "V1", "V2", "V3", "V4"].includes(lead);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = height * (window.devicePixelRatio || 1);
      canvas.style.width = "100%";
      canvas.style.height = `${height}px`;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, w, h);

      // 1. Draw Medical ECG Grid (standard 1mm / 5mm scale)
      if (grid) {
        ctx.save();
        // Minor grid lines (1mm equivalent)
        ctx.strokeStyle = isEcg ? "rgba(23, 182, 196, 0.08)" : "rgba(242, 184, 75, 0.08)";
        ctx.lineWidth = 1;
        const minorStepX = w / 50;
        const minorStepY = h / 20;

        ctx.beginPath();
        for (let x = 0; x < w; x += minorStepX) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += minorStepY) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Major grid lines (5mm / 0.20 sec equivalent)
        ctx.strokeStyle = isEcg ? "rgba(23, 182, 196, 0.20)" : "rgba(242, 184, 75, 0.20)";
        ctx.lineWidth = 1.2 * dpr;
        const majorStepX = minorStepX * 5;
        const majorStepY = minorStepY * 5;

        ctx.beginPath();
        for (let x = 0; x < w; x += majorStepX) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += majorStepY) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();

        // 1 mV Calibration pulse on left margin (standard 10mm high, 0.2s wide)
        if (isEcg && w > 120) {
          ctx.strokeStyle = "rgba(23, 182, 196, 0.5)";
          ctx.lineWidth = 1.5 * dpr;
          const calX = 14 * dpr;
          const calY = h * 0.75;
          const calH = h * 0.35;
          const calW = 12 * dpr;
          ctx.beginPath();
          ctx.moveTo(calX, calY);
          ctx.lineTo(calX + 4 * dpr, calY);
          ctx.lineTo(calX + 4 * dpr, calY - calH);
          ctx.lineTo(calX + 4 * dpr + calW, calY - calH);
          ctx.lineTo(calX + 4 * dpr + calW, calY);
          ctx.lineTo(calX + 4 * dpr + calW + 4 * dpr, calY);
          ctx.stroke();

          ctx.fillStyle = "rgba(23, 182, 196, 0.6)";
          ctx.font = `${8 * dpr}px monospace`;
          ctx.fillText("1 mV", calX + 4 * dpr, calY - calH - 3 * dpr);
        }
        ctx.restore();
      }

      const buffer = bufferRef.current;
      if (buffer && buffer.length > 1) {
        const displaySamples = conditionSignal(Array.from(buffer), label);
        const values = displaySamples.filter(Number.isFinite).sort((a, b) => a - b);
        if (!values.length) {
          rafRef.current = requestAnimationFrame(draw);
          return;
        }

        // Auto-scale to prevent flattening from isolated spikes
        const low = percentile(values, 0.02);
        const high = percentile(values, 0.98);
        const center = (low + high) / 2;
        const halfRange = Math.max((high - low) / 2, 1);
        const targetMin = center - halfRange * 1.15;
        const targetMax = center + halfRange * 1.15;
        const scale = scaleRef.current;
        scale.min += (targetMin - scale.min) * 0.22;
        scale.max += (targetMax - scale.max) * 0.22;
        const range = Math.max(scale.max - scale.min, 1);

        // Helper to convert index and value to canvas coordinates
        const n = displaySamples.length;
        const getY = (val) => {
          const clamped = Math.max(scale.min, Math.min(scale.max, val));
          return h - ((clamped - scale.min) / range) * (h * 0.78) - h * 0.11;
        };
        const getX = (idxFraction) => idxFraction * w;

        // 2. Perform PQRST Detection & Region Boundary Calculation
        let pqrst = null;
        if (isEcg && (showRegions || showAnnotations)) {
          pqrst = detectPQRST(displaySamples, 200, lead);
          if (pqrst && onAnalysisUpdate) {
            onAnalysisUpdate(pqrst.intervals);
          }
        }

        // 3. Draw Highlighted Region Bands (PR Interval, QRS Complex, ST Segment, T Wave)
        if (isEcg && showRegions && pqrst) {
          ctx.save();
          const { fractions } = pqrst;

          // Region band drawer helper
          const drawBand = (x1Frac, x2Frac, bgFill, borderStroke, tagLabel, tagColor) => {
            const x1 = Math.max(0, getX(x1Frac));
            const x2 = Math.min(w, getX(x2Frac));
            const bandW = x2 - x1;
            if (bandW <= 0) return;

            // Translucent shaded column
            ctx.fillStyle = bgFill;
            ctx.fillRect(x1, 0, bandW, h);

            // Left and right boundary lines
            ctx.strokeStyle = borderStroke;
            ctx.lineWidth = 1 * dpr;
            ctx.setLineDash([3 * dpr, 3 * dpr]);
            ctx.beginPath();
            ctx.moveTo(x1, 0);
            ctx.lineTo(x1, h);
            ctx.moveTo(x2, 0);
            ctx.lineTo(x2, h);
            ctx.stroke();
            ctx.setLineDash([]);

            // Top tag pill
            if (bandW > 24 * dpr) {
              const pillW = Math.min(bandW - 4, 76 * dpr);
              const pillH = 14 * dpr;
              const pillX = x1 + (bandW - pillW) / 2;
              const pillY = 6 * dpr;

              ctx.fillStyle = "rgba(10, 24, 46, 0.85)";
              ctx.beginPath();
              ctx.roundRect(pillX, pillY, pillW, pillH, 4 * dpr);
              ctx.fill();

              ctx.strokeStyle = tagColor;
              ctx.lineWidth = 1 * dpr;
              ctx.stroke();

              ctx.fillStyle = tagColor;
              ctx.font = `600 ${8 * dpr}px system-ui, -apple-system, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(tagLabel, pillX + pillW / 2, pillY + pillH / 2);
            }
          };

          // PR Interval Zone (Cyan)
          drawBand(
            fractions.pOnset,
            fractions.q,
            "rgba(6, 182, 212, 0.09)",
            "rgba(6, 182, 212, 0.4)",
            "PR Interval",
            "#06b6d4"
          );

          // QRS Complex Zone (Emerald)
          drawBand(
            fractions.q,
            fractions.s,
            "rgba(16, 185, 129, 0.14)",
            "rgba(16, 185, 129, 0.5)",
            "QRS Complex",
            "#10b981"
          );

          // ST Segment Zone (Amber)
          drawBand(
            fractions.s,
            fractions.tOnset,
            "rgba(245, 158, 11, 0.12)",
            "rgba(245, 158, 11, 0.45)",
            "ST Segment",
            "#f59e0b"
          );

          // T Wave Zone (Purple)
          drawBand(
            fractions.tOnset,
            fractions.tOffset,
            "rgba(168, 85, 247, 0.09)",
            "rgba(168, 85, 247, 0.4)",
            "T Wave",
            "#a855f7"
          );

          ctx.restore();
        }

        // 4. Draw Waveform Stroke
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2 * dpr;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * w;
          const y = getY(displaySamples[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        // 5. Draw P, Q, R, S, T Point Badges & Markers
        if (isEcg && showAnnotations && pqrst) {
          ctx.save();
          const { fractions, values } = pqrst;

          const points = [
            { letter: "P", xFrac: fractions.p, val: values.p, bg: "#06b6d4", textColor: "#ffffff", above: true },
            { letter: "Q", xFrac: fractions.q, val: values.q, bg: "#eab308", textColor: "#000000", above: false },
            { letter: "R", xFrac: fractions.r, val: values.r, bg: "#10b981", textColor: "#ffffff", above: lead !== "V1" },
            { letter: "S", xFrac: fractions.s, val: values.s, bg: "#ef4444", textColor: "#ffffff", above: false },
            { letter: "T", xFrac: fractions.t, val: values.t, bg: "#a855f7", textColor: "#ffffff", above: lead !== "V1" },
          ];

          for (const pt of points) {
            const px = getX(pt.xFrac);
            const py = getY(pt.val);

            // Pulsing point dot on the waveform
            ctx.fillStyle = pt.bg;
            ctx.beginPath();
            ctx.arc(px, py, 3.5 * dpr, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();

            // Circular badge indicator
            const badgeRadius = 9 * dpr;
            const offsetY = pt.above ? -18 * dpr : 18 * dpr;
            const badgeY = Math.max(badgeRadius + 6, Math.min(h - badgeRadius - 6, py + offsetY));

            // Connector leader line
            ctx.strokeStyle = pt.bg;
            ctx.lineWidth = 1 * dpr;
            ctx.beginPath();
            ctx.moveTo(px, py + (pt.above ? -4 * dpr : 4 * dpr));
            ctx.lineTo(px, badgeY + (pt.above ? badgeRadius : -badgeRadius));
            ctx.stroke();

            // Badge circle
            ctx.fillStyle = pt.bg;
            ctx.beginPath();
            ctx.arc(px, badgeY, badgeRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();

            // Badge letter text
            ctx.fillStyle = pt.textColor;
            ctx.font = `bold ${10 * dpr}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(pt.letter, px, badgeY + 0.5 * dpr);
          }
          ctx.restore();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bufferRef, color, height, grid, label, lead, showAnnotations, showRegions]);

  return (
    <div className="relative w-full">
      <div className="absolute top-2 left-3 flex items-center gap-2 z-10 pointer-events-none">
        <span className="text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-navy-950/80 border border-teal-500/30 text-teal-300">
          {label}
        </span>
        {isEcg && (
          <span className="text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded bg-navy-900/80 text-navy-200/70 border border-navy-700">
            {lead === "II"
              ? "Lead II • Diagnostic Rhythm Strip"
              : `Lead ${lead} • Precordial Chest Lead`}
          </span>
        )}
      </div>
      <canvas ref={canvasRef} className="w-full rounded-xl" style={{ height }} />
    </div>
  );
}

function percentile(values, fraction) {
  const index = (values.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (index - lower);
}

function conditionSignal(samples, label) {
  if (samples.length < 5) return samples;

  // Median filtering removes sharp isolated noise blips while preserving R-peak spikes
  const medianFiltered = samples.map((value, index) => {
    const window = samples.slice(Math.max(0, index - 1), Math.min(samples.length, index + 2));
    return [...window].sort((a, b) => a - b)[Math.floor(window.length / 2)];
  });

  if (label !== "ECG" && !label.includes("Lead") && !label.includes("V")) {
    return movingAverage(medianFiltered, 5);
  }

  // Baseline wander suppression: stable baseline removal with gentle window
  const baselineWindow = Math.max(25, Math.round(samples.length / 14));
  const baseline = movingAverage(medianFiltered, baselineWindow);
  return medianFiltered.map((value, index) => value - baseline[index] * 0.85);
}

function movingAverage(samples, windowSize) {
  const half = Math.floor(windowSize / 2);
  return samples.map((_, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(samples.length, index + half + 1);
    const values = samples.slice(start, end);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });
}
