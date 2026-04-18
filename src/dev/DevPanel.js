import { getCurrentBlock, resolveTrackPosition } from '../engines/ScheduleEngine.js';

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export class DevPanel {
  constructor(schedule) {
    this._schedule = schedule;
    this._collapsed = false;
    this._el = this._build();
    this._bindEvents();
    this._tick();
  }

  // ─── time helpers ──────────────────────────────────────────────────────────

  _getDevTime() {
    const t = new URLSearchParams(window.location.search).get('devtime');
    return t ? new Date(t) : null;
  }

  _getNow() {
    return this._getDevTime() ?? new Date();
  }

  _isOverride() {
    return !!this._getDevTime();
  }

  _jumpTo(utcDay, utcHour, utcMinute) {
    const base = this._getNow();
    const diff = utcDay - base.getUTCDay();
    const target = new Date(base);
    target.setUTCDate(target.getUTCDate() + diff);
    target.setUTCHours(utcHour, utcMinute, 0, 0);

    const url = new URL(window.location.href);
    url.searchParams.set('devtime', target.toISOString());
    window.location.href = url.toString();
  }

  _clearOverride() {
    const url = new URL(window.location.href);
    url.searchParams.delete('devtime');
    window.location.href = url.toString();
  }

  // ─── build ─────────────────────────────────────────────────────────────────

  _build() {
    const el = document.createElement('div');
    el.id = 'dev-panel';
    el.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 9999;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #c0d8ff;
      pointer-events: all;
    `;

    el.innerHTML = `
      <div class="dp-shell" style="
        background: rgba(5,5,20,0.92);
        border: 1px solid rgba(100,150,255,0.25);
        border-radius: 8px;
        overflow: hidden;
        min-width: 220px;
        backdrop-filter: blur(8px);
      ">
        <div class="dp-header" style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-bottom: 1px solid rgba(100,150,255,0.12);
          cursor: pointer;
          user-select: none;
        ">
          <span style="
            background: rgba(100,150,255,0.2);
            border: 1px solid rgba(100,150,255,0.35);
            border-radius: 3px;
            padding: 1px 5px;
            font-size: 9px;
            letter-spacing: 2px;
            color: #80b0ff;
          ">DEV</span>
          <span class="dp-clock" style="flex:1; letter-spacing:1px; color:#80b0ff;"></span>
          <span class="dp-override-dot" style="
            display: none;
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #ff8844;
            box-shadow: 0 0 4px #ff8844;
          " title="Time override active"></span>
          <span class="dp-toggle" style="color: rgba(128,176,255,0.5); font-size:9px;">▼</span>
        </div>

        <div class="dp-body" style="padding: 10px;">

          <div class="dp-block-info" style="
            padding: 8px;
            background: rgba(100,150,255,0.06);
            border-radius: 5px;
            margin-bottom: 10px;
            border: 1px solid rgba(100,150,255,0.1);
          ">
            <div class="dp-block-type" style="
              font-size: 9px;
              letter-spacing: 2px;
              color: rgba(128,176,255,0.5);
              text-transform: uppercase;
              margin-bottom: 3px;
            "></div>
            <div class="dp-block-name" style="color: #e0eeff; margin-bottom: 2px;"></div>
            <div class="dp-track-info" style="color: rgba(128,176,255,0.6); font-size: 10px;"></div>
          </div>

          <form class="dp-jump-form" style="
            display: flex;
            gap: 5px;
            margin-bottom: 7px;
            align-items: center;
          ">
            <select class="dp-day-select" style="
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(100,150,255,0.2);
              color: #c0d8ff;
              border-radius: 4px;
              padding: 3px 4px;
              font-family: inherit;
              font-size: 10px;
            ">
              ${DAY_LABELS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
            </select>
            <input class="dp-time-input" type="time" step="60" style="
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(100,150,255,0.2);
              color: #c0d8ff;
              border-radius: 4px;
              padding: 3px 5px;
              font-family: inherit;
              font-size: 10px;
              flex: 1;
            ">
            <button type="submit" style="
              background: rgba(100,150,255,0.15);
              border: 1px solid rgba(100,150,255,0.3);
              color: #80b0ff;
              border-radius: 4px;
              padding: 3px 8px;
              cursor: pointer;
              font-family: inherit;
              font-size: 10px;
            ">→</button>
          </form>

          <button class="dp-live-btn" style="
            width: 100%;
            background: transparent;
            border: 1px solid rgba(128,176,255,0.15);
            color: rgba(128,176,255,0.5);
            border-radius: 4px;
            padding: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 10px;
            letter-spacing: 1px;
            margin-bottom: 10px;
          ">↺ live time</button>

          <div class="dp-jumps" style="
            display: flex;
            flex-direction: column;
            gap: 4px;
          "></div>

        </div>
      </div>
    `;

    document.body.appendChild(el);
    return el;
  }

  // ─── events ────────────────────────────────────────────────────────────────

  _bindEvents() {
    this._el.querySelector('.dp-header').addEventListener('click', () => {
      this._collapsed = !this._collapsed;
      const body = this._el.querySelector('.dp-body');
      const toggle = this._el.querySelector('.dp-toggle');
      body.style.display = this._collapsed ? 'none' : 'block';
      toggle.textContent = this._collapsed ? '▶' : '▼';
    });

    this._el.querySelector('.dp-jump-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const day = parseInt(this._el.querySelector('.dp-day-select').value, 10);
      const [h, m] = this._el.querySelector('.dp-time-input').value.split(':').map(Number);
      if (!isNaN(h)) this._jumpTo(day, h, m ?? 0);
    });

    this._el.querySelector('.dp-live-btn').addEventListener('click', () => {
      this._clearOverride();
    });
  }

  // ─── display update ────────────────────────────────────────────────────────

  _tick() {
    this._update();
    setTimeout(() => this._tick(), 1000);
  }

  _update() {
    const now = this._getNow();
    const isOverride = this._isOverride();

    // Clock
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    const dayLabel = DAY_LABELS[now.getUTCDay()];
    const clockEl = this._el.querySelector('.dp-clock');
    clockEl.textContent = `${dayLabel} ${hh}:${mm}:${ss} UTC`;
    clockEl.style.color = isOverride ? '#ff8844' : '#80b0ff';

    this._el.querySelector('.dp-override-dot').style.display = isOverride ? 'block' : 'none';

    // Live button highlight when no override
    const liveBtn = this._el.querySelector('.dp-live-btn');
    liveBtn.style.color = isOverride ? 'rgba(255,136,68,0.7)' : 'rgba(128,176,255,0.5)';
    liveBtn.style.borderColor = isOverride ? 'rgba(255,136,68,0.3)' : 'rgba(128,176,255,0.15)';

    // Current block info
    try {
      const block = getCurrentBlock(this._schedule, now);
      const tracks = block.data.tracks ?? [];
      const pos = tracks.length ? resolveTrackPosition(tracks, block.blockStart, now) : null;

      this._el.querySelector('.dp-block-type').textContent = block.type;
      this._el.querySelector('.dp-block-name').textContent = block.data.name ?? block.data.id;

      if (pos && tracks[pos.trackIndex]) {
        const t = tracks[pos.trackIndex];
        const elapsed = Math.floor(pos.offset);
        this._el.querySelector('.dp-track-info').textContent =
          `track ${pos.trackIndex + 1}/${tracks.length} · ${t.title ?? t.src.split('/').pop()} · ${elapsed}s in`;
      } else {
        this._el.querySelector('.dp-track-info').textContent = '';
      }
    } catch {
      this._el.querySelector('.dp-block-name').textContent = 'error resolving block';
    }

    // Pre-fill day/time inputs with current devtime (or now)
    this._el.querySelector('.dp-day-select').value = now.getUTCDay();
    this._el.querySelector('.dp-time-input').value =
      `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}`;

    this._renderJumps(now);
  }

  _renderJumps(now) {
    const jumpsEl = this._el.querySelector('.dp-jumps');
    const dayIndex = now.getUTCDay();
    const dayName = DAY_NAMES[dayIndex];
    const todayEntries = this._schedule.schedule[dayName] ?? [];

    const btnStyle = `
      background: rgba(100,150,255,0.08);
      border: 1px solid rgba(100,150,255,0.15);
      color: #a0c4ff;
      border-radius: 4px;
      padding: 4px 7px;
      cursor: pointer;
      font-family: inherit;
      font-size: 10px;
      text-align: left;
      width: 100%;
    `;

    const sectionLabel = (text) => `
      <div style="
        font-size: 9px;
        letter-spacing: 2px;
        color: rgba(128,176,255,0.35);
        text-transform: uppercase;
        padding: 4px 0 2px;
      ">${text}</div>
    `;

    let html = sectionLabel(`TODAY — ${DAY_LABELS[dayIndex]}`);

    if (todayEntries.length) {
      for (const entry of todayEntries) {
        const show = this._schedule.shows.find(s => s.id === entry.showId);
        const name = show?.name ?? entry.showId;
        const [h, m] = entry.startTime.split(':').map(Number);
        html += `<button class="dp-jump-btn" style="${btnStyle}"
          data-day="${dayIndex}" data-h="${h}" data-m="${m}">
          ${entry.startTime} · ${name}
        </button>`;
      }
    } else {
      html += `<div style="color:rgba(128,176,255,0.3); padding: 2px 0; font-size:10px;">no shows scheduled</div>`;
    }

    html += sectionLabel('DAYPARTS');
    const daypartJumps = [
      { label: '00:00 Late Night', h: 0, m: 0 },
      { label: '06:00 Morning',    h: 6, m: 0 },
      { label: '11:00 Working',    h: 11, m: 0 },
      { label: '16:00 Evening',    h: 16, m: 0 },
      { label: '20:00 Night',      h: 20, m: 0 },
    ];
    for (const { label, h, m } of daypartJumps) {
      html += `<button class="dp-jump-btn" style="${btnStyle}"
        data-day="${dayIndex}" data-h="${h}" data-m="${m}">
        ${label}
      </button>`;
    }

    jumpsEl.innerHTML = html;

    jumpsEl.querySelectorAll('.dp-jump-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._jumpTo(
          parseInt(btn.dataset.day, 10),
          parseInt(btn.dataset.h, 10),
          parseInt(btn.dataset.m, 10),
        );
      });
    });
  }
}
