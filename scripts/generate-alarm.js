// One-off generator for assets/sounds/alarm.wav — a synthesized sports-timer
// style buzzer (like a basketball/volleyball shot-clock buzzer), avoiding the
// need to bundle a third-party audio file.
// Run with: node scripts/generate-alarm.js
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;
const BUZZ_FREQ_HZ = 220;
const BUZZ_ON_SEC = 1.2;
const BUZZ_OFF_SEC = 0.3;

// A harsh, sustained square wave is what gives shot-clock buzzers their
// distinctive tone (lots of odd harmonics), unlike a soft sine beep.
function buzzSamples(freq, seconds) {
  const count = Math.floor(SAMPLE_RATE * seconds);
  const samples = new Float32Array(count);
  const fadeSamples = Math.floor(SAMPLE_RATE * 0.005);
  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE;
    const phase = (t * freq) % 1;
    let amp = 1;
    if (i < fadeSamples) amp = i / fadeSamples;
    else if (i > count - fadeSamples) amp = (count - i) / fadeSamples;
    const square = phase < 0.5 ? 1 : -1;
    samples[i] = amp * square;
  }
  return samples;
}

function silenceSamples(seconds) {
  return new Float32Array(Math.floor(SAMPLE_RATE * seconds));
}

const parts = [buzzSamples(BUZZ_FREQ_HZ, BUZZ_ON_SEC), silenceSamples(BUZZ_OFF_SEC)];

const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
const pcm = new Int16Array(totalLength);
let offset = 0;
for (const part of parts) {
  for (let i = 0; i < part.length; i++) {
    pcm[offset++] = Math.max(-1, Math.min(1, part[i])) * 32767;
  }
}

const dataSize = pcm.length * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16); // fmt chunk size
buffer.writeUInt16LE(1, 20); // PCM format
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate (mono, 16-bit)
buffer.writeUInt16LE(2, 32); // block align
buffer.writeUInt16LE(16, 34); // bits per sample
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < pcm.length; i++) {
  buffer.writeInt16LE(pcm[i], 44 + i * 2);
}

const outPath = path.join(__dirname, "..", "assets", "sounds", "alarm.wav");
fs.writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath} (${(dataSize / 1024).toFixed(1)} KB)`);
