// src/engines/ScheduleEngine.js

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

export function getDaypart(schedule, now) {
  const hour = now.getUTCHours();
  for (const [key, daypart] of Object.entries(schedule.dayparts)) {
    if (daypart.hours.includes(hour)) return key;
  }
  return 'night';
}

export function getCurrentBlock(schedule, now) {
  const dayName = DAY_NAMES[now.getUTCDay()];
  const todayEntries = schedule.schedule[dayName] || [];
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();

  for (const entry of todayEntries) {
    const [startH, startM] = entry.startTime.split(':').map(Number);
    const [endH, endM]     = entry.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes   = endH * 60 + endM;

    if (minutesNow >= startMinutes && minutesNow < endMinutes) {
      const show = schedule.shows.find(s => s.id === entry.showId);
      const blockStart = new Date(now);
      blockStart.setUTCHours(startH, startM, 0, 0);
      return { type: 'show', data: show, blockStart };
    }
  }

  const daypartKey = getDaypart(schedule, now);
  const daypart = schedule.dayparts[daypartKey];
  const blockStart = new Date(now);
  blockStart.setUTCMinutes(0, 0, 0);
  return { type: 'daypart', data: { ...daypart, id: daypartKey }, blockStart };
}

export function resolveTrackPosition(tracks, blockStart, now) {
  const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);
  let elapsed = (now - blockStart) / 1000;
  elapsed = elapsed % totalDuration;

  let accumulated = 0;
  for (let i = 0; i < tracks.length; i++) {
    if (elapsed < accumulated + tracks[i].duration) {
      return {
        trackIndex: i,
        trackUrl: tracks[i].src,
        offset: elapsed - accumulated,
      };
    }
    accumulated += tracks[i].duration;
  }
  return { trackIndex: 0, trackUrl: tracks[0].src, offset: 0 };
}
