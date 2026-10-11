/*
  CardioPulse Ai — ESP32 firmware
  Streams "ecg,ppg\n" over serial at 115200 baud, ~200 Hz.
  The web portal's "Connect device" button (Web Serial) reads this directly.

  Wiring:
    AD8232 OUTPUT  -> GPIO34 (ADC1_CH6)
    AD8232 LO+     -> GPIO32 (optional lead-off detect)
    AD8232 LO-     -> GPIO33 (optional lead-off detect)
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
const unsigned long SAMPLE_INTERVAL_US = 5000; // ~200 Hz

unsigned long lastSampleAt = 0;

void setup() {
  Serial.begin(115200);
  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);

  Wire.begin(21, 22);
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found - check wiring");
    while (1) delay(10);
  }
  particleSensor.setup(); // default settings: red + IR LEDs, ~100Hz internal sample rate
}

void loop() {
  unsigned long now = micros();
  if (now - lastSampleAt < SAMPLE_INTERVAL_US) return;
  lastSampleAt = now;

  int ecgValue;
  if (digitalRead(LO_PLUS) == HIGH || digitalRead(LO_MINUS) == HIGH) {
    ecgValue = 512; // lead off - flat line at midpoint instead of noise
  } else {
    ecgValue = analogRead(ECG_PIN); // 0-4095 on ESP32; portal auto-scales
  }

  long irValue = particleSensor.getIR();
  int ppgValue = (int)constrain(map(irValue, 0, 200000, 0, 1023), 0, 1023);

  Serial.print(ecgValue);
  Serial.print(",");
  Serial.println(ppgValue);
}
