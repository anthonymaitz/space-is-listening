import { getCurrentBlock, resolveTrackPosition } from './engines/ScheduleEngine.js';
import { AudioEngine } from './engines/AudioEngine.js';
import { SceneEngine } from './engines/SceneEngine.js';
import { Overlay } from './ui/Overlay.js';
import { mockSceneConfig } from './scenes/MockScene.js';
import './ui/overlay.css';

const R2_BASE_URL = import.meta.env.VITE_R2_BASE_URL ?? '';

async function resolveSceneConfig(scenePath) {
  if (!scenePath || scenePath === 'mock') return mockSceneConfig;
  try {
    const res = await fetch(`${R2_BASE_URL}/${scenePath}`);
    if (!res.ok) throw new Error(res.status);
    return res.json();
  } catch {
    console.warn(`[main] Scene ${scenePath} not found, using mock`);
    return mockSceneConfig;
  }
}

function getUpNext(schedule, now) {
  const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayName = DAY_NAMES[now.getUTCDay()];
  const entries = schedule.schedule[dayName] || [];
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();

  for (const entry of entries) {
    const [h, m] = entry.startTime.split(':').map(Number);
    const entryMinutes = h * 60 + m;
    if (entryMinutes > minutesNow) {
      const show = schedule.shows.find(s => s.id === entry.showId);
      return { show, time: entry.startTime };
    }
  }
  return null;
}

async function init() {
  const schedule = await fetch('/schedule.json').then(r => r.json());
  const now = new Date();

  const block = getCurrentBlock(schedule, now);
  const tracks = block.data.tracks;
  if (!tracks?.length) throw new Error(`[main] Block "${block.data.id}" has no tracks`);
  const seekResult = resolveTrackPosition(tracks, block.blockStart, now);

  const canvas = document.getElementById('scene-canvas');
  const sceneEngine = new SceneEngine(canvas);
  const sceneConfig = await resolveSceneConfig(block.data.scene);
  await sceneEngine.loadScene(sceneConfig);
  sceneEngine.start();

  document.addEventListener('mousemove', (e) => {
    const normX =  (e.clientX / window.innerWidth)  * 2 - 1;
    const normY = -((e.clientY / window.innerHeight) * 2 - 1);
    sceneEngine.setParallax(normX, normY);
  });

  const overlay = new Overlay(document.getElementById('overlay'), schedule.station.name);
  overlay.updateShow(block.data);
  overlay.updateTrack(tracks[seekResult.trackIndex]);

  const upNext = getUpNext(schedule, now);
  if (upNext) overlay.updateUpNext(upNext.show, upNext.time);

  const audioEngine = new AudioEngine(R2_BASE_URL, {
    stationIdInterval: schedule.station.stationIdInterval ?? 5,
  });
  await audioEngine.init(block, seekResult, schedule.station.stationIds);

  // Web Audio requires a user gesture before play
  let started = false;
  document.addEventListener('click', () => {
    if (!started) {
      started = true;
      audioEngine.play();
      overlay.setPlaying(true);
    }
  }, { once: true });

  overlay.playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!started) {
      started = true;
      audioEngine.play();
      overlay.setPlaying(true);
    } else {
      const isPlaying = overlay.playPauseBtn.textContent === '⏸';
      isPlaying ? audioEngine.pause() : audioEngine.play();
      overlay.setPlaying(!isPlaying);
    }
  });

  overlay.volumeSlider.addEventListener('input', () => {
    audioEngine.setVolume(parseFloat(overlay.volumeSlider.value));
  });

  setInterval(() => {
    const trackPos = resolveTrackPosition(tracks, block.blockStart, new Date());
    overlay.updateTrack(tracks[trackPos.trackIndex]);
    overlay.updateProgress(trackPos.offset, tracks[trackPos.trackIndex].duration);
  }, 1000);
}

init().catch(console.error);
