// src/engines/ScheduleEngine.test.js
import { describe, it, expect } from 'vitest';
import { getDaypart, getCurrentBlock, resolveTrackPosition } from './ScheduleEngine.js';

const schedule = {
  dayparts: {
    'late-night': { hours: [0,1,2,3,4,5],    tracks: [{ src: 'a.mp3', duration: 120 }], scene: 'scenes/late-night.json' },
    'morning':    { hours: [6,7,8,9,10],       tracks: [{ src: 'b.mp3', duration: 120 }], scene: 'scenes/morning.json' },
    'working':    { hours: [11,12,13,14,15],   tracks: [{ src: 'c.mp3', duration: 120 }], scene: 'scenes/working.json' },
    'evening':    { hours: [16,17,18,19],      tracks: [{ src: 'd.mp3', duration: 120 }], scene: 'scenes/evening.json' },
    'night':      { hours: [20,21,22,23],      tracks: [{ src: 'e.mp3', duration: 120 }], scene: 'scenes/night.json' },
  },
  shows: [
    {
      id: 'morning-drift',
      name: 'Morning Drift',
      scene: 'scenes/morning-drift.json',
      trackOrder: 'sequential',
      stationIdBefore: true,
      tracks: [
        { src: 'show/01.mp3', duration: 180 },
        { src: 'show/02.mp3', duration: 240 },
      ],
    },
  ],
  schedule: {
    monday: [{ showId: 'morning-drift', startTime: '06:00', endTime: '08:00' }],
    tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [],
  },
};

describe('getDaypart', () => {
  it('returns late-night for 3am UTC', () => {
    expect(getDaypart(schedule, new Date('2024-01-15T03:00:00Z'))).toBe('late-night');
  });
  it('returns morning for 8am UTC', () => {
    expect(getDaypart(schedule, new Date('2024-01-15T08:00:00Z'))).toBe('morning');
  });
  it('returns night for 21:00 UTC', () => {
    expect(getDaypart(schedule, new Date('2024-01-15T21:00:00Z'))).toBe('night');
  });
});

describe('getCurrentBlock', () => {
  it('returns daypart block when no show is scheduled', () => {
    // Monday 4:30am — no show scheduled
    const block = getCurrentBlock(schedule, new Date('2024-01-15T04:30:00Z'));
    expect(block.type).toBe('daypart');
    expect(block.data.id).toBe('late-night');
  });

  it('returns show block during scheduled show time', () => {
    // Monday 7am — inside morning-drift 06:00-08:00
    const block = getCurrentBlock(schedule, new Date('2024-01-15T07:00:00Z'));
    expect(block.type).toBe('show');
    expect(block.data.id).toBe('morning-drift');
  });

  it('sets blockStart to show startTime for show blocks', () => {
    const block = getCurrentBlock(schedule, new Date('2024-01-15T07:30:00Z'));
    expect(block.blockStart.getUTCHours()).toBe(6);
    expect(block.blockStart.getUTCMinutes()).toBe(0);
  });

  it('does not match show on a different day', () => {
    // Tuesday 7am — no show on tuesday
    const block = getCurrentBlock(schedule, new Date('2024-01-16T07:00:00Z'));
    expect(block.type).toBe('daypart');
  });

  it('returns daypart block when time is past show endTime', () => {
    // Monday 9am — morning-drift ended at 08:00
    const block = getCurrentBlock(schedule, new Date('2024-01-15T09:00:00Z'));
    expect(block.type).toBe('daypart');
    expect(block.data.id).toBe('morning');
  });
});

describe('resolveTrackPosition', () => {
  const tracks = [
    { src: 'track1.mp3', duration: 180 },
    { src: 'track2.mp3', duration: 240 },
  ];

  it('returns first track at offset 0 at block start', () => {
    const blockStart = new Date('2024-01-15T06:00:00Z');
    const now        = new Date('2024-01-15T06:00:00Z');
    const pos = resolveTrackPosition(tracks, blockStart, now);
    expect(pos.trackIndex).toBe(0);
    expect(pos.trackUrl).toBe('track1.mp3');
    expect(pos.offset).toBe(0);
  });

  it('returns first track with correct offset mid-track', () => {
    const blockStart = new Date('2024-01-15T06:00:00Z');
    const now        = new Date('2024-01-15T06:01:30Z'); // 90s in
    const pos = resolveTrackPosition(tracks, blockStart, now);
    expect(pos.trackIndex).toBe(0);
    expect(pos.offset).toBeCloseTo(90);
  });

  it('returns second track after first track ends', () => {
    const blockStart = new Date('2024-01-15T06:00:00Z');
    const now        = new Date('2024-01-15T06:03:30Z'); // 210s in — 180s track1, 30s into track2
    const pos = resolveTrackPosition(tracks, blockStart, now);
    expect(pos.trackIndex).toBe(1);
    expect(pos.trackUrl).toBe('track2.mp3');
    expect(pos.offset).toBeCloseTo(30);
  });

  it('loops back to first track after full cycle', () => {
    const blockStart = new Date('2024-01-15T06:00:00Z');
    const now        = new Date('2024-01-15T06:07:00Z'); // 420s = 180+240, one full loop
    const pos = resolveTrackPosition(tracks, blockStart, now);
    expect(pos.trackIndex).toBe(0);
    expect(pos.offset).toBeCloseTo(0);
  });
});
