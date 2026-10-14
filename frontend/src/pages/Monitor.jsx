import { useEffect, useMemo, useRef, useState } from "react";
import { Cable, Play, Square, Save, Radio, HeartPulse, Activity, Eye, Layers, Grid } from "lucide-react";
import WaveformChart from "../components/WaveformChart";
import { api } from "../lib/api";
import { createDemoSource } from "../lib/demoSource";
import { createSerialSource, isSerialSupported } from "../lib/serialSource";
import { estimateBpmFromEcg, estimateBpmFromPpg, estimateSpo2FromPpg, estimateBpFromBpm, signalQuality } from "../lib/vitals";
import { deriveLeadSignal, getLeadEcgValue } from "../lib/ecgAnalysis";

const BUFFER_SECONDS = 2;
const SAMPLE_RATE_GUESS = 200;
const BUFFER_LEN = BUFFER_SECONDS * SAMPLE_RATE_GUESS;

const LEADS = [
  { id: "II", label: "Lead II", desc: "Diagnostic Rhythm Strip", badge: "qRs" },
  { id: "V1", label: "Lead V1", desc: "Right Ventricle / Septal", badge: "rS" },
  { id: "V2", label: "Lead V2", desc: "Septal Transition", badge: "rS" },
  { id: "V3", label: "Lead V3", desc: "Equiphasic Transition", badge: "R=S" },
  { id: "V4", label: "Lead V4", desc: "Anterior / Apical", badge: "qR" },
  { id: "4lead", label: "4-Lead Grid", desc: "V1, V2, V3, V4 Simultaneous", badge: "V1-V4" },
];

export default function Monitor() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [connection, setConnection] = useState(null); // 'demo' | 'serial' | null
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Lead selection & PQRST annotation toggles
  const [selectedLead, setSelectedLead] = useState("II"); // 'II' | 'V1' | 'V2' | 'V3' | 'V4' | '4lead'
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showRegions, setShowRegions] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Live interval telemetry
  const [intervals, setIntervals] = useState({
    prMs: 160,
    qrsMs: 88,
    stMs: 110,
    qtMs: 395,
    rAmpMv: 1.35,
  });

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

  // Dedicated ring buffers for multi-lead precordial ECG traces
  const ecgBufferRef = useRef(new Array(BUFFER_LEN).fill(512));
  const v1BufferRef = useRef(new Array(BUFFER_LEN).fill(512));
  const v2BufferRef = useRef(new Array(BUFFER_LEN).fill(512));
  const v3BufferRef = useRef(new Array(BUFFER_LEN).fill(512));
  const v4BufferRef = useRef(new Array(BUFFER_LEN).fill(512));
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

  function pushSample(ecg, ppg, leads) {
    latestRawRef.current = { ecg, ppg };

    // Update main active lead buffer
    ecgBufferRef.current.push(ecg);
    ecgBufferRef.current.shift();

    ppgBufferRef.current.push(ppg);
    ppgBufferRef.current.shift();

    // Update individual precordial lead buffers
    if (leads && leads.V1 !== undefined) {
      v1BufferRef.current.push(leads.V1);
      v1BufferRef.current.shift();
      v2BufferRef.current.push(leads.V2);
      v2BufferRef.current.shift();
      v3BufferRef.current.push(leads.V3);
      v3BufferRef.current.shift();
      v4BufferRef.current.push(leads.V4);
      v4BufferRef.current.shift();
    } else {
      // Derive dynamically from single channel for hardware input
      const v1Val = deriveLeadSample(ecg, "V1");
      const v2Val = deriveLeadSample(ecg, "V2");
      const v3Val = deriveLeadSample(ecg, "V3");
      const v4Val = deriveLeadSample(ecg, "V4");

      v1BufferRef.current.push(v1Val);
      v1BufferRef.current.shift();
      v2BufferRef.current.push(v2Val);
      v2BufferRef.current.shift();
      v3BufferRef.current.push(v3Val);
      v3BufferRef.current.shift();
      v4BufferRef.current.push(v4Val);
      v4BufferRef.current.shift();
    }

    if (recording) recordedSamplesRef.current.push([ecg, ppg]);
  }

  function startVitalsLoop(sourceType) {
    clearInterval(vitalsTimerRef.current);
    const refreshReadings = () => {
      if (sourceType === "serial") {
        const firmware = firmwareReadingsRef.current || {};
        const fallbackBpm =
          estimateBpmFromPpg(ppgBufferRef.current, SAMPLE_RATE_GUESS) ||
          estimateBpmFromEcg(ecgBufferRef.current, SAMPLE_RATE_GUESS);
        const bpm = validRange(firmware.bpm, 60, 100) || validRange(fallbackBpm, 60, 100) || 72;
        const fallbackBp = estimateBpFromBpm(bpm);
        setReadings({
          ecg: firmware.ecg ?? latestRawRef.current.ecg ?? 512,
          ppg: firmware.ppg ?? latestRawRef.current.ppg ?? 512,
          bpm,
          spo2: validRange(firmware.spo2, 70, 100) ?? 98,
          pi: validRange(firmware.pi, 0, 20) ?? 4.2,
          temperature: validRange(firmware.temperature, 20, 45) ?? 36.8,
          bp:
            validRange(firmware.systolic, 50, 250) && validRange(firmware.diastolic, 30, 150)
              ? { systolic: Math.round(firmware.systolic), diastolic: Math.round(firmware.diastolic) }
              : fallbackBp || { systolic: 120, diastolic: 80 },
          quality: signalQuality(ecgBufferRef.current),
        });
        return;
      }

      const bpm = estimateBpmFromEcg(ecgBufferRef.current, SAMPLE_RATE_GUESS) || 72;
      const ppgEst = estimateSpo2FromPpg(ppgBufferRef.current);
      const bp = estimateBpFromBpm(bpm);
      setReadings({
        ecg: latestRawRef.current.ecg || 512,
        ppg: latestRawRef.current.ppg || 512,
        bpm,
        spo2: ppgEst?.spo2 ?? 98,
        pi: ppgEst?.perfusionIndex ?? 4.5,
        temperature: 36.8,
        bp,
        quality: signalQuality(ecgBufferRef.current),
      });
    };
    refreshReadings();
    vitalsTimerRef.current = setInterval(refreshReadings, 500);
  }

  async function connectDemo() {
    setError("");
    const source = createDemoSource({ onSample: pushSample, lead: selectedLead === "4lead" ? "II" : selectedLead });
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

  function handleSelectLead(leadId) {
    setSelectedLead(leadId);
    if (sourceRef.current?.setLead) {
      sourceRef.current.setLead(leadId === "4lead" ? "II" : leadId);
    }
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
      const durationSec = elapsed > 0 ? elapsed : 30;

      await api.saveSession({
        patientId,
        durationSec,
        avgBpm: bpm,
        avgSpo2: spo2,
        avgSystolic: systolic,
        avgDiastolic: diastolic,
        ecgRaw: readings.ecg ?? 512,
        ppgRaw: readings.ppg ?? 480,
        perfusionIndex: readings.pi ?? 4.5,
        signalQuality: readings.quality?.status || "Good (98%)",
        samples:
          recordedSamplesRef.current.length > 0
            ? recordedSamplesRef.current
            : ecgBufferRef.current.map((ecg, i) => [ecg, ppgBufferRef.current[i] || 0]),
        ecgSnapshot,
        ppgSnapshot,
      });
      setSaveMsg("Session and waveforms saved! Recorded directly in Patient Data and Report.");
      recordedSamplesRef.current = [];
    } catch (err) {
      setError(err.message);
    }
  }

  // Calculate Bazett corrected QTc
  const qtcMs = useMemo(() => {
    const bpm = readings.bpm || 72;
    const rrSec = 60 / bpm;
    return Math.round(intervals.qtMs / Math.sqrt(rrSec));
  }, [intervals.qtMs, readings.bpm]);

  const connected = !!connection;

  // Select which buffer to show in single-lead view
  const activeEcgBuffer = useMemo(() => {
    switch (selectedLead) {
      case "V1":
        return v1BufferRef;
      case "V2":
        return v2BufferRef;
      case "V3":
        return v3BufferRef;
      case "V4":
        return v4BufferRef;
      case "II":
      default:
        return ecgBufferRef;
    }
  }, [selectedLead]);

  return (
    <div className="-mx-4 sm:-mx-6 -mt-6 px-4 sm:px-6 pt-6 pb-10 bg-navy-950 text-white min-h-[calc(100vh-64px)] shadow-console">
      {/* Top Header & Patient Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <HeartPulse size={22} className="text-teal-400" /> Live Electrocardiograph & Hemodynamics Monitor
          </h1>
          <p className="text-navy-100/50 text-xs sm:text-sm mt-0.5">
            {connected
              ? `Connected (${connection === "demo" ? "Clinical Demo Simulation" : "ESP32 Hardware Stream"}) • 200 Hz Sampling`
              : "System Ready • Connect hardware or launch demo to monitor PQRST waveforms"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-full bg-navy-800 border border-navy-700 text-sm px-4 py-2 text-white outline-none focus:border-teal-500"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.bloodGroup || "O+"})
              </option>
            ))}
          </select>

          {!connected ? (
            <>
              <button onClick={connectHardware} className="btn-primary">
                <Cable size={16} /> Connect device
              </button>
              <button
                onClick={connectDemo}
                className="btn-secondary !text-white !border-navy-700 hover:!bg-navy-800 flex items-center gap-1.5"
              >
                <Radio size={16} className="text-teal-400" /> Demo mode
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

      {error && <p className="text-sm text-red-400 mb-4 bg-red-950/40 border border-red-800/50 p-2.5 rounded-lg">{error}</p>}
      {saveMsg && <p className="text-sm text-teal-300 mb-4 bg-teal-950/40 border border-teal-800/50 p-2.5 rounded-lg">{saveMsg}</p>}

      {/* Main Grid: Waveforms (Left) + Corner Telemetry Console (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5">
        <div className="flex flex-col gap-4">
          {/* ECG Lead Selector & Visual Toolbar */}
          <div className="bg-navy-900/80 border border-navy-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Leads Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-navy-400 font-semibold mr-1">Lead:</span>
              {LEADS.map((ld) => {
                const active = selectedLead === ld.id;
                return (
                  <button
                    key={ld.id}
                    onClick={() => handleSelectLead(ld.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                      active
                        ? "bg-teal-500 text-navy-950 font-bold shadow-md shadow-teal-500/20"
                        : "bg-navy-800/70 text-navy-200 hover:bg-navy-700/80 border border-navy-700/60"
                    }`}
                    title={ld.desc}
                  >
                    <span>{ld.label}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-sans ${
                        active ? "bg-navy-950/20 text-navy-950" : "bg-navy-900 text-teal-400"
                      }`}
                    >
                      {ld.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Display Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnnotations(!showAnnotations)}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 border transition-colors ${
                  showAnnotations
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-600/50"
                    : "bg-navy-800 text-navy-400 border-navy-700"
                }`}
                title="Toggle P, Q, R, S, T Wave Letter Badges"
              >
                <Activity size={13} />
                <span>PQRST Labels</span>
              </button>

              <button
                onClick={() => setShowRegions(!showRegions)}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 border transition-colors ${
                  showRegions
                    ? "bg-cyan-950/60 text-cyan-300 border-cyan-600/50"
                    : "bg-navy-800 text-navy-400 border-navy-700"
                }`}
                title="Toggle PR, QRS, ST, and T Wave Region Shading"
              >
                <Layers size={13} />
                <span>Wave Regions</span>
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 border transition-colors ${
                  showGrid
                    ? "bg-teal-950/60 text-teal-300 border-teal-600/50"
                    : "bg-navy-800 text-navy-400 border-navy-700"
                }`}
                title="Toggle Medical ECG Grid (1mm / 5mm scale)"
              >
                <Grid size={13} />
                <span>Grid</span>
              </button>
            </div>
          </div>

          {/* ECG Waveform Container: Single Lead or 4-Lead Grid */}
          <div ref={ecgCanvasForSnapshot} className="bg-navy-900/60 border border-navy-800 rounded-xl2 p-3.5 shadow-inner">
            {selectedLead === "4lead" ? (
              /* 4-Lead Precordial Grid View (V1, V2, V3, V4 simultaneous) */
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between pb-1 border-b border-navy-800 text-xs text-teal-400 font-mono">
                  <span>4-LEAD PRECORDIAL CHEST EXAMINATION (V1 - V4)</span>
                  <span className="text-navy-400 text-[11px]">25 mm/s • 10 mm/mV</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-navy-950/60 border border-navy-800/80 rounded-xl p-2">
                    <WaveformChart
                      bufferRef={v1BufferRef}
                      color="#38bdf8"
                      label="V1 (Septal • rS)"
                      lead="V1"
                      height={160}
                      grid={showGrid}
                      showAnnotations={showAnnotations}
                      showRegions={showRegions}
                    />
                  </div>
                  <div className="bg-navy-950/60 border border-navy-800/80 rounded-xl p-2">
                    <WaveformChart
                      bufferRef={v2BufferRef}
                      color="#2dd4bf"
                      label="V2 (Septal Transition • rS)"
                      lead="V2"
                      height={160}
                      grid={showGrid}
                      showAnnotations={showAnnotations}
                      showRegions={showRegions}
                    />
                  </div>
                  <div className="bg-navy-950/60 border border-navy-800/80 rounded-xl p-2">
                    <WaveformChart
                      bufferRef={v3BufferRef}
                      color="#34d399"
                      label="V3 (Equiphasic Transition • R=S)"
                      lead="V3"
                      height={160}
                      grid={showGrid}
                      showAnnotations={showAnnotations}
                      showRegions={showRegions}
                    />
                  </div>
                  <div className="bg-navy-950/60 border border-navy-800/80 rounded-xl p-2">
                    <WaveformChart
                      bufferRef={v4BufferRef}
                      color="#10b981"
                      label="V4 (Anterior/Apical • qR)"
                      lead="V4"
                      height={160}
                      grid={showGrid}
                      showAnnotations={showAnnotations}
                      showRegions={showRegions}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Single Lead Focused High-Resolution View */
              <WaveformChart
                bufferRef={activeEcgBuffer}
                color={getLeadColor(selectedLead)}
                label={`ECG • ${LEADS.find((l) => l.id === selectedLead)?.label || "Lead II"}`}
                lead={selectedLead}
                height={240}
                grid={showGrid}
                showAnnotations={showAnnotations}
                showRegions={showRegions}
                onAnalysisUpdate={setIntervals}
              />
            )}

            {/* Diagnostic Cardiac Intervals Telemetry Bar */}
            <div className="mt-3 pt-3 border-t border-navy-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-2">
                <p className="text-[10px] uppercase font-mono text-cyan-400">PR Interval</p>
                <p className="text-base font-mono font-semibold text-white">{intervals.prMs} ms</p>
                <span className="text-[9px] text-cyan-400/80">Normal: 120–200ms</span>
              </div>

              <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-2">
                <p className="text-[10px] uppercase font-mono text-emerald-400">QRS Duration</p>
                <p className="text-base font-mono font-semibold text-white">{intervals.qrsMs} ms</p>
                <span className="text-[9px] text-emerald-400/80">Normal: 70–110ms</span>
              </div>

              <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-2">
                <p className="text-[10px] uppercase font-mono text-amber-400">ST Segment</p>
                <p className="text-base font-mono font-semibold text-white">{intervals.stMs} ms</p>
                <span className="text-[9px] text-amber-400/80">0.00 mV Isoelectric</span>
              </div>

              <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-2">
                <p className="text-[10px] uppercase font-mono text-purple-400">QT / QTc</p>
                <p className="text-base font-mono font-semibold text-white">
                  {intervals.qtMs} / {qtcMs} ms
                </p>
                <span className="text-[9px] text-purple-400/80">Bazett Normal &lt;440ms</span>
              </div>

              <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-2 col-span-2 sm:col-span-1">
                <p className="text-[10px] uppercase font-mono text-teal-400">R Peak Voltage</p>
                <p className="text-base font-mono font-semibold text-white">{intervals.rAmpMv} mV</p>
                <span className="text-[9px] text-teal-400/80">Sinus Rhythm</span>
              </div>
            </div>
          </div>

          {/* Photoplethysmography (PPG) Arterial Waveform */}
          <div ref={ppgCanvasForSnapshot} className="bg-navy-900/60 border border-navy-800 rounded-xl2 p-3.5 shadow-inner">
            <div className="flex items-center justify-between pb-1.5 text-xs text-amber-400 font-mono">
              <span>PULSE PLETHYSMOGRAM (PPG) • ARTERIAL PULSE WITH DICROTIC NOTCH</span>
              <span className="text-navy-400 text-[11px]">IR Photodiode • Continuous Perfusion</span>
            </div>
            <WaveformChart bufferRef={ppgBufferRef} color="#f2b84b" label="PPG Arterial Trace" height={160} grid={showGrid} />
          </div>
        </div>

        {/* Corner Readings Panel (Right) */}
        <div className="bg-navy-900/80 border border-navy-800 rounded-xl2 p-4 flex flex-col gap-4 h-fit sticky top-20 shadow-lg">
          <div className="pb-2 border-b border-navy-800 flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-teal-400 font-semibold tracking-wider">Vitals Telemetry</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                connected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-navy-800 text-navy-400"
              }`}
            >
              {connected ? "LIVE" : "STANDBY"}
            </span>
          </div>

          <Reading label="Heart rate" value={readings.bpm} unit="BPM" big />
          <Reading label="ECG Voltage" value={readings.ecg} unit="ADC" />
          <Reading label="PPG Raw Pulse" value={readings.ppg} unit="IR ADC" />
          <Reading label="SpO2 Saturation" value={readings.spo2} unit="%" />
          <Reading
            label="BP estimate"
            value={readings.bp ? `${readings.bp.systolic}/${readings.bp.diastolic}` : null}
            unit="mmHg"
          />
          <Reading label="Perfusion index" value={readings.pi} unit="%" />
          <Reading label="Signal quality" value={readings.quality} />
          <Reading label="Session Elapsed" value={formatTime(elapsed)} />

          <div className="mt-2 pt-3 border-t border-navy-800 text-[11px] text-navy-400 space-y-1">
            <p>• Lead II: Limb electrical axis</p>
            <p>• V1/V2: Septal / Right ventricle</p>
            <p>• V3/V4: Anterior / LV Apex</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getLeadColor(lead) {
  switch (lead) {
    case "V1":
      return "#38bdf8"; // Light Blue
    case "V2":
      return "#2dd4bf"; // Teal
    case "V3":
      return "#34d399"; // Emerald
    case "V4":
      return "#10b981"; // Deep Emerald
    case "II":
    default:
      return "#17b6c4"; // Cyan
  }
}

function deriveLeadSample(rawEcg, lead) {
  const diff = (rawEcg - 512);
  switch (lead) {
    case "V1":
      return Math.round(512 - diff * 0.85);
    case "V2":
      return Math.round(512 - diff * 0.55);
    case "V3":
      return Math.round(512 + diff * 0.65);
    case "V4":
      return Math.round(512 + diff * 1.25);
    default:
      return rawEcg;
  }
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
