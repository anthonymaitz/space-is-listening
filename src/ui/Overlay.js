// src/ui/Overlay.js

export class Overlay {
  constructor(container, stationName) {
    this._container = container;
    this._render(stationName);
  }

  _render(stationName) {
    this._container.innerHTML = `
      <div class="overlay-top">
        <span class="station-name">${stationName}</span>
        <span class="live-badge"><span class="live-dot"></span>LIVE</span>
      </div>
      <div class="overlay-bottom">
        <div class="now-playing">
          <div class="show-name"></div>
          <div class="track-title"></div>
          <div class="track-artist"></div>
        </div>
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <div class="controls">
          <button class="play-pause-btn" style="pointer-events:all;">&#9654;</button>
          <label class="volume-control" style="pointer-events:all;">
            <span class="volume-icon">&#128266;</span>
            <input class="volume-slider" type="range" min="0" max="1" step="0.01" value="0.8">
          </label>
          <div class="up-next"></div>
        </div>
      </div>
    `;
  }

  updateShow(show) {
    this._container.querySelector('.show-name').textContent = show.name;
  }

  updateTrack(track) {
    this._container.querySelector('.track-title').textContent = track.title || '';
    this._container.querySelector('.track-artist').textContent = track.artist || '';
  }

  updateProgress(elapsed, total) {
    const pct = Math.min((elapsed / total) * 100, 100).toFixed(2);
    this._container.querySelector('.progress-fill').style.width = `${pct}%`;
  }

  setPlaying(isPlaying) {
    this._container.querySelector('.play-pause-btn').textContent = isPlaying ? '\u23F8' : '\u25B6';
  }

  updateUpNext(show, time) {
    this._container.querySelector('.up-next').textContent = show
      ? `Up next: ${show.name} \u00B7 ${time}`
      : '';
  }

  get volumeSlider() {
    return this._container.querySelector('.volume-slider');
  }

  get playPauseBtn() {
    return this._container.querySelector('.play-pause-btn');
  }
}
