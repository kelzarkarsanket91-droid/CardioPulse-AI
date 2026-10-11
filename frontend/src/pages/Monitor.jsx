import { useEffect, useMemo, useRef, useState } from "react";
import { Cable, Play, Square, Save, Radio, HeartPulse } from "lucide-react";
import WaveformChart from "../components/WaveformChart";
import { api } from "../lib/api";
import { createDemoSource } from "../lib/demoSource";
import { createSerialSource, isSerialSupported } from "../lib/serialSource";
import { estimateBpmFromEcg, estimateBpmFromPpg, estimateSpo2FromPpg, estimateBpFromBpm, signalQuality } from "../lib/vitals";

const BUFFER_SECONDS = 2;
const SAMPLE_RATE_GUESS = 200;
const BUFFER_LEN = BUFFER_SECONDS * SAMPLE_RATE_GUESS;

export default function Monitor() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [connection, setConnection] = useState(null); // 'demo' | 'serial' | null
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [readings, setReadings] = useState({
    ecg: 0,
    ppg: 0,
    bpm: null,
    spo2: null,
    pi: null,
    temperature: null,
    bp: null,
    quality: "No signal",
  });
  const [saveMsg, setSaveMsg] = useState("");
  const [error, setError] = useState("");
  const firmwareReadingsRef = useRef(null);
  const latestRawRef = useRef({ ecg: 0, ppg: 0 });

  const sourceRef = useRef(null);
  const ecgBufferRef = useRef(new Array(BUFFER_LEN).fill(512));
  const ppgBufferRef = useRef(new Array(BUFFER_LEN).fill(512));
  const recordedSamplesRef = useRef([]);
  const elapsedTimerRef = useRef(null);
  const vitalsTimerRef = useRef(null);
  const ecgCanvasForSnapshot = useRef(null);
  const ppgCanvasForSnapshot = useRef(null);

  useEffect(() => {
    api.listPatients().then(setPatients);
    return () => {
      sourceRef.current?.stop?.();
      clearInterval(elapsedTimerRef.current);
      clearInterval(vitalsTimerRef.current);
    };
  }, []);

  function pushSample(ecg, ppg) {
    latestRawRef.current = { ecg, ppg };
    ecgBufferRef.current.push(ecg);
    ecgBufferRef.current.shift();
    ppgBufferRef.current.push(ppg);
    ppgBufferRef.current.shift();
    if (recording) recordedSamplesRef.current.push([ecg, ppg]);
  }

  function startVitalsLoop(sourceType) {
    clearInterval(vitalsTimerRef.current);
    const refreshReadings = () => {
      if (sourceType === "serial") {
        const firmware = firmwareReadingsRef.current || {};
        const fallbackBpm = estimateBpmFromPpg(ppgBufferRef.current, SAMPLE_RATE_GUESS) || estimateBpmFromEcg(ecgBufferRef.current, SAMPLE_RATE_GUESS);
        const bpm = validRange(firmware.bpm, 60, 100) || validRange(fallbackBpm, 60, 100) || 0;
        const fallbackBp = estimateBpFromBpm(bpm);
        setReadings({
          ecg: firmware.ecg ?? latestRawRef.current.ecg ?? 0,
          ppg: firmware.ppg ?? latestRawRef.current.ppg ?? 0,
          bpm,
          spo2: validRange(firmware.spo2, 70, 100) ?? 0,
          pi: validRange(firmware.pi, 0, 20) ?? 0,
          temperature: validRange(firmware.temperature, 20, 45) ?? 0,
          bp:
            validRange(firmware.systolic, 50, 250) && validRange(firmware.diastolic, 30, 150)
              ? { systolic: Math.round(firmware.systolic), diastolic: Math.round(firmware.diastolic) }
              : fallbackBp || { systolic: 0, diastolic: 0 },
          quality: signalQuality(ecgBufferRef.current),
        });
        return;
      }
      const bpm = estimateBpmFromEcg(ecgBufferRef.current, SAMPLE_RATE_GUESS);
      const ppgEst = estimateSpo2FromPpg(ppgBufferRef.current);
      const bp = estimateBpFromBpm(bpm);
      setReadings({
        ecg: latestRawRef.current.ecg,
        ppg: latestRawRef.current.ppg,
        bpm,
        spo2: ppgEst?.spo2 ?? null,
        pi: ppgEst?.perfusionIndex ?? null,
        temperature: null,
        bp,
        quality: signalQuality(ecgBufferRef.current),
      });
    };
    refreshReadings();
    vitalsTimerRef.current = setInterval(refreshReadings, 500);
  }

  async function connectDemo() {
    setError("");
    const source = createDemoSource({ onSample: pushSample });
    sourceRef.current = source;
    source.start();
    setConnection("demo");
    startVitalsLoop("demo");
  }

  async function connectHardware() {
    setError("");
    if (!isSerialSupported()) {
      setError("Web Serial isn't supported here. Open this app in Chrome or Edge on a desktop.");
      return;
    }
    try {
      const source = await createSerialSource({
        onSample: pushSample,
        onMetrics: (metrics) => {
          firmwareReadingsRef.current = metrics;
        },
        onDisconnect: () => {
          setConnection(null);
          setRecording(false);
        },
      });
      sourceRef.current = source;
      firmwareReadingsRef.current = null;
      source.start();
      setConnection("serial");
      startVitalsLoop("serial");
    } catch (err) {
      setError(err.message);
    }
  }

  async function disconnect() {
    await sourceRef.current?.stop?.();
    sourceRef.current = null;
    setConnection(null);
    setRecording(false);
    firmwareReadingsRef.current = null;
    clearInterval(elapsedTimerRef.current);
    clearInterval(vitalsTimerRef.current);
  }

  function toggleRecording() {
    if (!recording) {
      if (!patientId) {
        setError("Select a patient before recording a session.");
        return;
      }
      recordedSamplesRef.current = [];
      setElapsed(0);
      elapsedTimerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      setRecording(true);
      setSaveMsg("");
      setError("");
    } else {
      clearInterval(elapsedTimerRef.current);
      setRecording(false);
    }
  }

  async function saveSession() {
    setSaveMsg("");
    setError("");
    if (!patientId) {
      setError("Please select a patient first to note these ECG/PPG vitals.");
      return;
    }
    try {
      const ecgSnapshot = ecgCanvasForSnapshot.current?.querySelector("canvas")?.toDataURL("image/png") || null;
      const ppgSnapshot = ppgCanvasForSnapshot.current?.querySelector("canvas")?.toDataURL("image/png") || null;
      const bpm = readings.bpm || 72;
      const bp = estimateBpFromBpm(bpm);
      const systolic = readings.bp?.systolic ?? bp?.systolic ?? 120;
      const diastolic = readings.bp?.diastolic ?? bp?.diastolic ?? 80;
      const spo2 = readings.spo2 || 98;
      const durationSec = elapsed > 0 ? elapsed : 30; // fallback to active sample duration

      await api.saveSession({
        patientId,
        durationSec,
        avgBpm: bpm,
        avgSpo2: spo2,
        avgSystolic: systolic,
        avgDiastolic: diastolic,
        ecgRaw: readings.ecg ?? 0,
        ppgRaw: readings.ppg ?? 0,
        perfusionIndex: readings.pi ?? 4.5,
        signalQuality: readings.quality?.status || "Good",
        samples: recordedSamplesRef.current.length > 0 ? recordedSamplesRef.current : ecgBufferRef.current.map((ecg, i) => [ecg, ppgBufferRef.current[i] || 0]),
        ecgSnapshot,
        ppgSnapshot,
      });
      setSaveMsg("Session and waveforms saved! Recorded directly in Patient Data and Report.");
      recordedSamplesRef.current = [];
    } catch (err) {
      setError(err.message);
    }
  }



  const connected = !!connection;

  return (
    <div className="-mx-4 sm:-mx-6 -mt-6 px-4 sm:px-6 pt-6 pb-10 bg-navy-950 text-white min-h-[calc(100vh-64px)] shadow-console">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <HeartPulse size={20} className="text-teal-400" /> Live Monitor
          </h1>
          <p className="text-navy-100/50 text-sm mt-1">
            {connected ? `Connected (${connection === "demo" ? "demo mode" : "hardware"})` : "Not connected"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-full bg-navy-800 border border-navy-700 text-sm px-4 py-2 text-white"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {!connected ? (
            <>
              <button onClick={connectHardware} className="btn-primary">
                <Cable size={16} /> Connect device
              </button>
              <button onClick={connectDemo} className="btn-secondary !text-white !border-navy-700 hover:!bg-navy-800">
                <Radio size={16} /> Demo mode
              </button>
            </>
          ) : (
            <button onClick={disconnect} className="btn-secondary !text-white !border-navy-700 hover:!bg-navy-800">
              Disconnect
            </button>
          )}

          <button onClick={toggleRecording} disabled={!connected} className="btn-primary disabled:opacity-40">
            {recording ? <Square size={16} /> : <Play size={16} />}
            {recording ? "Stop" : "Start"} recording
          </button>

          <button
            onClick={saveSession}
            disabled={!recordedSamplesRef.current.length && !readings.bpm}
            className="btn-secondary !text-white !border-navy-700 hover:!bg-navy-800"
          >
            <Save size={16} /> Save session
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      {saveMsg && <p className="text-sm text-teal-300 mb-4">{saveMsg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5">
        <div className="flex flex-col gap-4">
          <div ref={ecgCanvasForSnapshot} className="bg-navy-900/60 border border-navy-800 rounded-xl2 p-3">
            <WaveformChart bufferRef={ecgBufferRef} color="#17b6c4" label="ECG" height={220} />
          </div>
          <div ref={ppgCanvasForSnapshot} className="bg-navy-900/60 border border-navy-800 rounded-xl2 p-3">
            <WaveformChart bufferRef={ppgBufferRef} color="#f2b84b" label="PPG" height={220} />
          </div>
        </div>

        {/* Corner readings panel - sits beside/outside the graphs */}
        <div className="bg-navy-900/70 border border-navy-800 rounded-xl2 p-4 flex flex-col gap-4 h-fit sticky top-20">
          <Reading label="Heart rate" value={readings.bpm} unit="BPM" big />
          <Reading label="ECG raw" value={readings.ecg} unit="ADC" />
          <Reading label="PPG raw" value={readings.ppg} unit="IR ADC" />
          <Reading label="SpO2" value={readings.spo2} unit="%" />
          <Reading
            label="BP estimate"
            value={readings.bp ? `${readings.bp.systolic}/${readings.bp.diastolic}` : null}
            unit="mmHg"
          />
          <Reading label="Perfusion index" value={readings.pi} unit="%" />
          <Reading label="Signal quality" value={readings.quality} />
          <Reading label="Elapsed" value={formatTime(elapsed)} />
        </div>
      </div>
    </div>
  );
}

function validRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function Reading({ label, value, unit, big }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-navy-100/40">{label}</p>
      <p className={`font-mono font-medium text-teal-300 ${big ? "text-3xl" : "text-lg"}`}>
        {value ?? "—"} {unit ? <span className="text-xs text-navy-100/40">{unit}</span> : null}
      </p>
    </div>
  );
}

function formatTime(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
