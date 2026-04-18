// src/engines/AudioEngine.js

export class AudioEngine {
  constructor(baseUrl, { stationIdInterval = 5 } = {}) {
    this.baseUrl = baseUrl;
    this._ctx = null;
    this._gainNode = null;
    this._currentAudio = null;
    this._playing = false;
    this._trackQueue = [];
    this._currentTrackIndex = 0;
    this._stationIds = [];
    this._stationIdInterval = stationIdInterval;
    this._tracksPlayedSinceId = 0;
  }

  async init(block, seekResult, stationIds) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this._ctx = new Ctx();
    this._gainNode = this._ctx.createGain();
    this._gainNode.connect(this._ctx.destination);

    this._stationIds = stationIds || [];
    this._trackQueue = block.data.tracks;
    this._currentTrackIndex = seekResult.trackIndex;

    await this._loadTrack(seekResult.trackUrl, seekResult.offset);
  }

  async _loadTrack(url, offset = 0) {
    const audio = new Audio(`${this.baseUrl}/${url}`);
    audio.crossOrigin = 'anonymous';
    const source = this._ctx.createMediaElementSource(audio);
    source.connect(this._gainNode);
    audio.currentTime = offset;
    audio.addEventListener('ended', () => this._onTrackEnd());
    this._currentAudio = audio;
  }

  _onTrackEnd() {
    this._tracksPlayedSinceId++;
    this._currentTrackIndex = (this._currentTrackIndex + 1) % this._trackQueue.length;

    if (this._tracksPlayedSinceId >= this._stationIdInterval && this._stationIds.length > 0) {
      this._tracksPlayedSinceId = 0;
      const id = this._stationIds[Math.floor(Math.random() * this._stationIds.length)];
      this._playStationId(id.src);
    } else {
      this._loadAndPlayNext();
    }
  }

  _playStationId(src) {
    const audio = new Audio(`${this.baseUrl}/${src}`);
    audio.crossOrigin = 'anonymous';
    audio.addEventListener('ended', () => this._loadAndPlayNext());
    audio.play();
  }

  _loadAndPlayNext() {
    const next = this._trackQueue[this._currentTrackIndex];
    this._loadTrack(next.src, 0).then(() => {
      if (this._playing) this._currentAudio.play();
    });
  }

  play() {
    this._playing = true;
    if (this._currentAudio) {
      this._ctx.resume();
      this._currentAudio.play();
    }
  }

  pause() {
    this._playing = false;
    if (this._currentAudio) this._currentAudio.pause();
  }

  setVolume(value) {
    if (this._gainNode) this._gainNode.gain.value = value;
  }
}
