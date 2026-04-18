#!/usr/bin/env node
// Generates short WAV test tones for local development.
// Each show/daypart has a distinct pitch so transitions are audible.
// Run: node scripts/generate-dev-audio.mjs

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '..', 'public', 'audio');

const SR = 8000;   // sample rate — low quality is fine for dev tones
const DUR = 20;    // seconds per track — fast enough to test loops/transitions

function wav(hz, seconds = DUR, sampleRate = SR) {
  const n = seconds * sampleRate;
  const buf = Buffer.alloc(44 + n * 2);
  const fadeLen = Math.floor(sampleRate * 0.4);

  // RIFF/WAV header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);          // PCM
  buf.writeUInt16LE(1, 22);          // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);

  const amp = 0.28 * 32767;
  for (let i = 0; i < n; i++) {
    const fade = Math.min(i / fadeLen, 1, (n - i) / fadeLen);
    const sample = Math.round(amp * fade * Math.sin(2 * Math.PI * hz * i / sampleRate));
    buf.writeInt16LE(sample, 44 + i * 2);
  }
  return buf;
}

function write(rel, hz, dur = DUR) {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, wav(hz, dur));
  const kb = Math.round((dur * SR * 2 + 44) / 1024);
  console.log(`  ${rel.padEnd(42)} ${hz}Hz  ${dur}s  ~${kb}KB`);
}

console.log('\nGenerating dev audio → public/audio/\n');

// Station IDs (short — just enough to hear the transition)
write('station-ids/id-01.wav', 440, 5);
write('station-ids/id-02.wav', 523, 5);

// Daypart beds — each has a clear personality
write('dayparts/late-night/01.wav', 110, DUR);  // low & slow
write('dayparts/late-night/02.wav', 147, DUR);
write('dayparts/morning/01.wav',    528, DUR);  // bright & open
write('dayparts/morning/02.wav',    594, DUR);
write('dayparts/working/01.wav',    396, DUR);  // focused, neutral
write('dayparts/working/02.wav',    440, DUR);
write('dayparts/evening/01.wav',    330, DUR);  // warm, descending
write('dayparts/evening/02.wav',    294, DUR);
write('dayparts/night/01.wav',      220, DUR);  // deep, dark
write('dayparts/night/02.wav',      196, DUR);

// Shows — each gets its own pitch range
write('shows/morning-drift/01.wav', 480, DUR);
write('shows/morning-drift/02.wav', 432, DUR);
write('shows/morning-drift/03.wav', 528, DUR);

write('shows/midday-pulse/01.wav',  660, DUR);
write('shows/midday-pulse/02.wav',  740, DUR);

write('shows/night-signal/01.wav',  165, DUR);
write('shows/night-signal/02.wav',  185, DUR);

write('shows/cosmos-hour/01.wav',   369, DUR);
write('shows/cosmos-hour/02.wav',   415, DUR);
write('shows/cosmos-hour/03.wav',   494, DUR);

const files = 20;
const totalKB = Math.round((files * DUR * SR * 2 + 2 * 5 * SR * 2) / 1024);
console.log(`\n✓ ${files} files written (~${totalKB}KB total)\n`);
