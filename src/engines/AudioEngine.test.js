// src/engines/AudioEngine.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioEngine } from './AudioEngine.js';

// ---- browser API mocks ----
const mockGainNode = { gain: { value: 1 }, connect: vi.fn() };
const mockSource   = { connect: vi.fn() };
const mockCtx = {
  createGain: vi.fn(() => mockGainNode),
  createMediaElementSource: vi.fn(() => mockSource),
  destination: {},
  resume: vi.fn(),
};
vi.stubGlobal('AudioContext', vi.fn(function () { return mockCtx; }));
vi.stubGlobal('webkitAudioContext', vi.fn(function () { return mockCtx; }));

class MockAudio {
  constructor(src) {
    this.src = src;
    this.crossOrigin = '';
    this.currentTime = 0;
    this._listeners = {};
  }
  addEventListener(event, fn) { this._listeners[event] = fn; }
  play() { return Promise.resolve(); }
  pause() {}
  trigger(event) { this._listeners[event]?.(); }
}
vi.stubGlobal('Audio', MockAudio);
// ---------------------------

const makeBlock = (tracks) => ({ data: { tracks } });

describe('AudioEngine', () => {
  let engine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new AudioEngine('https://r2.example.com');
  });

  it('sets volume on the gain node', async () => {
    await engine.init(
      makeBlock([{ src: 'a.mp3', duration: 180 }]),
      { trackIndex: 0, trackUrl: 'a.mp3', offset: 0 },
      []
    );
    engine.setVolume(0.4);
    expect(mockGainNode.gain.value).toBe(0.4);
  });

  it('advances trackIndex when current track ends', async () => {
    await engine.init(
      makeBlock([{ src: 'a.mp3', duration: 180 }, { src: 'b.mp3', duration: 240 }]),
      { trackIndex: 0, trackUrl: 'a.mp3', offset: 0 },
      []
    );
    engine._currentAudio.trigger('ended');
    expect(engine._currentTrackIndex).toBe(1);
  });

  it('wraps trackIndex back to 0 after last track', async () => {
    const eng = new AudioEngine('https://r2.example.com', { stationIdInterval: 999 });
    await eng.init(
      makeBlock([{ src: 'a.mp3', duration: 180 }]),
      { trackIndex: 0, trackUrl: 'a.mp3', offset: 0 },
      []
    );
    eng._currentAudio.trigger('ended');
    expect(eng._currentTrackIndex).toBe(0);
  });

  it('resets tracksPlayedSinceId counter when station ID fires', async () => {
    const stationIds = [{ src: 'id.mp3', duration: 8 }];
    const eng = new AudioEngine('https://r2.example.com', { stationIdInterval: 5 });
    await eng.init(
      makeBlock([{ src: 'a.mp3', duration: 180 }]),
      { trackIndex: 0, trackUrl: 'a.mp3', offset: 0 },
      stationIds
    );
    eng._tracksPlayedSinceId = 5;
    eng._currentAudio.trigger('ended');
    expect(eng._tracksPlayedSinceId).toBe(0);
  });
});
