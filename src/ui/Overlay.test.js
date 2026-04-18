// src/ui/Overlay.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Overlay } from './Overlay.js';

describe('Overlay', () => {
  let container, overlay;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    overlay = new Overlay(container, 'Space is Listening');
  });

  afterEach(() => {
    container.remove();
  });

  it('renders the station name', () => {
    expect(container.querySelector('.station-name').textContent).toBe('Space is Listening');
  });

  it('updateShow sets the show name', () => {
    overlay.updateShow({ name: 'Morning Drift' });
    expect(container.querySelector('.show-name').textContent).toBe('Morning Drift');
  });

  it('updateTrack sets the track title', () => {
    overlay.updateTrack({ title: 'Weightless Signal', artist: 'Astra Collective' });
    expect(container.querySelector('.track-title').textContent).toBe('Weightless Signal');
    expect(container.querySelector('.track-artist').textContent).toBe('Astra Collective');
  });

  it('updateTrack handles missing artist gracefully', () => {
    overlay.updateTrack({ title: 'Unknown Track' });
    expect(container.querySelector('.track-title').textContent).toBe('Unknown Track');
    expect(container.querySelector('.track-artist').textContent).toBe('');
  });

  it('updateProgress sets fill width as percentage', () => {
    overlay.updateProgress(60, 180); // 33.33%
    const fill = container.querySelector('.progress-fill');
    expect(fill.style.width).toBe('33.33%');
  });

  it('updateProgress clamps to 100%', () => {
    overlay.updateProgress(200, 100);
    expect(container.querySelector('.progress-fill').style.width).toBe('100%');
  });

  it('setPlaying(true) shows pause icon', () => {
    overlay.setPlaying(true);
    expect(container.querySelector('.play-pause-btn').textContent).toBe('⏸');
  });

  it('setPlaying(false) shows play icon', () => {
    overlay.setPlaying(false);
    expect(container.querySelector('.play-pause-btn').textContent).toBe('▶');
  });

  it('updateUpNext sets the up-next text', () => {
    overlay.updateUpNext({ name: 'Midday Pulse' }, '14:00');
    expect(container.querySelector('.up-next').textContent).toContain('Midday Pulse');
    expect(container.querySelector('.up-next').textContent).toContain('14:00');
  });
});
