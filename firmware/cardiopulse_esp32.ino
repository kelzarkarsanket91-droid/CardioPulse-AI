/*
  CardioPulse Ai — ESP32 firmware
  High-Fidelity Electrocardiography (ECG PQRST) & Photoplethysmography (PPG) Streamer
  Streams "ecg,ppg\n" over serial at 115200 baud, ~200 Hz.
  The web portal's "Connect device" button (Web Serial) reads this directly.

  Wiring:
    AD8232 OUTPUT  -> GPIO34 (ADC1_CH6)
    AD8232 LO+     -> GPIO32 (lead-off detect +)
    AD8232 LO-     -> GPIO33 (lead-off detect -)
    MAX30102 SDA   -> GPIO21
    MAX30102 SCL   -> GPIO22
    Both sensors   -> 3.3V, GND

  Library needed: "MAX30105" by SparkFun (Library Manager -> search "SparkFun MAX3010x").
*/

#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

const int ECG_PIN = 34;
const int LO_PLUS = 32;
const int LO_MINUS = 33;
const unsigned long SAMPLE_INTERVAL_US = 5000; // ~200 Hz (every 5000 microseconds)

unsigned long lastSampleAt = 0;

// Digital filtering buffers and state for clean PQRST and PPG
float filteredEcg = 2048.0;
float filteredPpg = 512.0;

void setup() {
  Serial.begin(115200);
  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);
  pinMode(ECG_PIN, INPUT);

  Wire.begin(21, 22);
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found - check wiring");
    while (1) delay(10);
  }
  // Setup MAX30102 with optimal LED power for clear dicrotic pulse detection
  particleSensor.setup(0x1F, 4, 2, 200, 411, 4096);
}

void loop() {
  unsigned long now = micros();
  if (now - lastSampleAt < SAMPLE_INTERVAL_US) return;
  lastSampleAt = now;

  int ecgOutput;
  // Lead-off detection check
  if (digitalRead(LO_PLUS) == HIGH || digitalRead(LO_MINUS) == HIGH) {
    // Leads detached: output stable isoelectric midpoint
    filteredEcg = filteredEcg * 0.9 + 2048.0 * 0.1;
    ecgOutput = (int)filteredEcg;
  } else {
    // 4x ADC oversampling to reduce quantization step noise
    int rawSum = 0;
    for (int i = 0; i < 4; i++) {
      rawSum += analogRead(ECG_PIN);
    }
    float rawAvg = (float)rawSum / 4.0;

    // Fast response IIR filter: alpha=0.35 preserves sharp R-peaks while smoothing high-frequency buzz
    filteredEcg = (filteredEcg * 0.65) + (rawAvg * 0.35);
    ecgOutput = (int)constrain(filteredEcg, 0, 4095);
  }

  // PPG IR Reading & Conditioning
  long irValue = particleSensor.getIR();
  float mappedPpg = constrain(map(irValue, 10000, 180000, 0, 1023), 0, 1023);
  filteredPpg = (filteredPpg * 0.75) + (mappedPpg * 0.25);
  int ppgOutput = (int)constrain(filteredPpg, 0, 1023);

  // Send formatted stream: "ecg,ppg"
  Serial.print(ecgOutput);
  Serial.print(",");
  Serial.println(ppgOutput);
}
