import { useEffect, useRef } from "react";

// bufferRef: { current: Float32Array-like ring buffer array of recent samples }
// color: stroke color; grid: whether to draw a console-style grid
export default function WaveformChart({
  bufferRef,
  color = "#17b6c4",
  height = 140,
  grid = true,
  label,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const scaleRef = useRef({ min: 0, max: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function resize() {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = "100%";
      canvas.style.height = `${height}px`;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (grid) {
        ctx.strokeStyle = "rgba(23,182,196,0.12)";
        ctx.lineWidth = 1;
        const step = w / 20;
        for (let x = 0; x < w; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        const stepY = h / 6;
        for (let y = 0; y < h; y += stepY) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }

      const buffer = bufferRef.current;
      if (buffer && buffer.length > 1) {
        const displaySamples = conditionSignal(Array.from(buffer), label);
        const values = displaySamples.filter(Number.isFinite).sort((a, b) => a - b);
        if (!values.length) {
          rafRef.current = requestAnimationFrame(draw);
          return;
        }

        // Ignore isolated ADC spikes so the actual waveform is not flattened.
        const low = percentile(values, 0.02);
        const high = percentile(values, 0.98);
        const center = (low + high) / 2;
        const halfRange = Math.max((high - low) / 2, 1);
        const targetMin = center - halfRange * 1.12;
        const targetMax = center + halfRange * 1.12;
        const scale = scaleRef.current;
        scale.min += (targetMin - scale.min) * 0.18;
        scale.max += (targetMax - scale.max) * 0.18;
        const range = Math.max(scale.max - scale.min, 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * devicePixelRatio;
        ctx.lineJoin = "round";
        ctx.beginPath();
        const n = buffer.length;
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * w;
          const value = Math.max(scale.min, Math.min(scale.max, displaySamples[i]));
          const y = h - ((value - scale.min) / range) * (h * 0.85) - h * 0.075;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [bufferRef, color, height, grid]);

  return (
    <div className="relative w-full">
      {label && (
        <span className="absolute top-2 left-3 text-xs font-mono tracking-wide text-teal-400/90 z-10">{label}</span>
      )}
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
  const medianFiltered = samples.map((value, index) => {
    const window = samples.slice(Math.max(0, index - 1), Math.min(samples.length, index + 2));
    return [...window].sort((a, b) => a - b)[Math.floor(window.length / 2)];
  });

  if (label !== "ECG") return movingAverage(medianFiltered, 5);

  // ECG display filter: reject isolated ADC steps and remove the slow baseline.
  const baselineWindow = Math.max(15, Math.round(samples.length / 20));
  const baseline = movingAverage(medianFiltered, baselineWindow);
  return medianFiltered.map((value, index) => value - baseline[index]);
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
