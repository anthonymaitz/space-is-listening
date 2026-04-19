# Scenes & Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 distinct Three.js scenes (5 daypart fallbacks + 4 shows) and a CC BY 4.0 attribution footer, extending SceneEngine with sphere/ring/icosahedron geometry types and configurable animations.

**Architecture:** SceneEngine gains three new layer type handlers and makes existing float/rotate animations configurable via layer config fields. Nine JSON scene configs live in `public/scenes/` and are fetched by name. Overlay gets a static footer strip. schedule.json scene fields update from `"mock"` to named scenes.

**Tech Stack:** Three.js, Vitest, jsdom, Vite

**Spec:** `docs/superpowers/specs/2026-04-18-scenes-attribution-design.md`

---

## File Map

| Action | File | Responsibility |
| --- | --- | --- |
| Modify | `src/engines/SceneEngine.js` | New geometry types + configurable animations |
| Modify | `src/ui/Overlay.js` | Add attribution footer HTML |
| Modify | `src/ui/Overlay.test.js` | Test attribution footer rendered |
| Modify | `src/ui/overlay.css` | Attribution footer styles |
| Modify | `src/main.js` | Update scene resolver to load from `/scenes/` |
| Create | `public/scenes/late-night.json` | Late-night daypart scene config |
| Create | `public/scenes/morning.json` | Morning daypart scene config |
| Create | `public/scenes/working.json` | Working daypart scene config |
| Create | `public/scenes/evening.json` | Evening daypart scene config |
| Create | `public/scenes/night.json` | Night daypart scene config |
| Create | `public/scenes/morning-drift.json` | Morning Drift show scene config |
| Create | `public/scenes/midday-pulse.json` | Midday Pulse show scene config |
| Create | `public/scenes/night-signal.json` | Night Signal show scene config |
| Create | `public/scenes/cosmos-hour.json` | Cosmos Hour show scene config |
| Create | `src/scenes/scenes.test.js` | Validates all 9 scene JSON files have required fields |
| Modify | `schedule.json` | Update all scene fields from `"mock"` to named scenes |

---

## Task 1: Attribution footer

**Files:**
- Modify: `src/ui/Overlay.test.js`
- Modify: `src/ui/Overlay.js`
- Modify: `src/ui/overlay.css`

- [ ] **Step 1: Write the failing test**

Add to the bottom of `src/ui/Overlay.test.js`, inside the existing `describe('Overlay', ...)` block:

```js
it('renders the attribution footer', () => {
  const el = container.querySelector('.attr-footer');
  expect(el).not.toBeNull();
  expect(el.textContent).toContain('Kevin MacLeod');
  expect(el.textContent).toContain('CC BY 4.0');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/ui/Overlay.test.js
```

Expected: FAIL — `querySelector('.attr-footer')` returns null.

- [ ] **Step 3: Add footer HTML to Overlay.js**

In `src/ui/Overlay.js`, replace the `_render` method's `overlay-bottom` div content to append the footer after `controls`:

```js
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
      <div class="attr-footer">Music by Kevin MacLeod &middot; incompetech.com &middot; CC BY 4.0</div>
    </div>
  `;
}
```

- [ ] **Step 4: Add CSS rule to overlay.css**

Append to the end of `src/ui/overlay.css`:

```css
.attr-footer {
  font-size: 9px;
  color: #444;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, .06);
  padding-top: 6px;
  margin-top: 4px;
  font-family: sans-serif;
  letter-spacing: 0.5px;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/ui/Overlay.test.js
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/Overlay.js src/ui/Overlay.test.js src/ui/overlay.css
git commit -m "feat: attribution footer strip in overlay"
```

---

## Task 2: SceneEngine — configurable animations

**Files:**
- Modify: `src/engines/SceneEngine.js` (render loop only, lines 138–176)

The existing `float` and `rotate` animations use hardcoded constants. `pulse` doesn't exist yet. This task makes all three read from layer config.

- [ ] **Step 1: Update the animation block in the render loop**

In `src/engines/SceneEngine.js`, replace the animation block inside `start()`'s tick function (the section that handles parallax and animations) with:

```js
// Parallax
if (config.parallaxFactor) {
  layer.object.position.x = this._parallaxOffset.x * config.parallaxFactor;
  layer.object.position.y = this._parallaxOffset.y * config.parallaxFactor;
}

// Animations
if (config.animate === 'float') {
  const speed = config.floatSpeed ?? 0.5;
  const amplitude = config.floatAmplitude ?? 0.05;
  layer.object.position.y = (layer._baseY ?? 0) + Math.sin(elapsed * speed) * amplitude;
}
if (config.animate === 'rotate') {
  const speed = config.rotateSpeed ?? 0.15;
  layer.object.rotation.z += delta * speed;
  layer.object.rotation.x += delta * speed * 0.47;
}
if (config.animate === 'pulse') {
  const speed = config.pulseSpeed ?? 1.2;
  layer.object.scale.setScalar(1 + Math.sin(elapsed * speed) * 0.08);
}

// Particle drift
if (config.type === 'particles' && config.speed > 0 && layer._positions) {
  const pos = layer._positions;
  for (let i = 0; i < pos.length / 3; i++) {
    pos[i * 3 + 1] += delta * config.speed * 0.08;
    if (pos[i * 3 + 1] > 2) pos[i * 3 + 1] = -2;
  }
  layer.object.geometry.attributes.position.needsUpdate = true;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engines/SceneEngine.js
git commit -m "feat: configurable float/rotate/pulse animations in SceneEngine"
```

---

## Task 3: SceneEngine — new geometry types

**Files:**
- Modify: `src/engines/SceneEngine.js`

- [ ] **Step 1: Update `_createLayer` switch to include new types**

In `src/engines/SceneEngine.js`, replace the `async _createLayer(config)` method:

```js
async _createLayer(config) {
  switch (config.type) {
    case 'image':            return this._createImageLayer(config);
    case 'particles':        return this._createParticleLayer(config);
    case 'procedural-stars': return this._createParticleLayer({ ...config, count: config.count || 500, speed: 0 });
    case 'geometry':         return this._createGeometryLayer(config);
    case 'sphere':           return this._createSphereLayer(config);
    case 'ring':             return this._createRingLayer(config);
    case 'icosahedron':      return this._createIcosahedronLayer(config);
    default:
      console.warn(`[SceneEngine] Unknown layer type: ${config.type}`);
      return null;
  }
}
```

- [ ] **Step 2: Make existing `_createGeometryLayer` read `config.radius`**

Replace the existing `_createGeometryLayer` method:

```js
_createGeometryLayer(config) {
  const r = config.radius ?? 0.4;
  const geo = new THREE.TorusGeometry(r, 0.12, 16, 80);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.color || '#4444aa'),
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = config.z ?? 0;
  return { object: mesh, config, _baseY: 0 };
}
```

- [ ] **Step 3: Add the three new geometry creator methods**

Add these three methods directly after `_createGeometryLayer` in `src/engines/SceneEngine.js`:

```js
_createSphereLayer(config) {
  const r = config.radius ?? 0.4;
  const geo = new THREE.SphereGeometry(r, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.color || '#8866cc'),
    wireframe: config.wireframe ?? false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = config.z ?? 0;
  return { object: mesh, config, _baseY: 0 };
}

_createRingLayer(config) {
  const r = config.radius ?? 0.5;
  const tube = config.tube ?? 0.03;
  const geo = new THREE.TorusGeometry(r, tube, 8, 80);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.color || '#4466aa'),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = config.z ?? 0;
  return { object: mesh, config, _baseY: 0 };
}

_createIcosahedronLayer(config) {
  const r = config.radius ?? 0.4;
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.color || '#cc9922'),
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = config.z ?? 0;
  return { object: mesh, config, _baseY: 0 };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/engines/SceneEngine.js
git commit -m "feat: sphere, ring, icosahedron geometry types in SceneEngine"
```

---

## Task 4: Update scene resolver in main.js

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Update `resolveSceneConfig`**

In `src/main.js`, replace the existing `resolveSceneConfig` function (lines 18–28):

```js
async function resolveSceneConfig(name) {
  if (!name || name === 'mock') return mockSceneConfig;
  try {
    const res = await fetch(`/scenes/${name}.json`);
    if (!res.ok) throw new Error(res.status);
    return res.json();
  } catch {
    console.warn(`[main] Scene "${name}" not found, using mock`);
    return mockSceneConfig;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main.js
git commit -m "feat: load scenes from /scenes/{name}.json"
```

---

## Task 5: Create 9 scene JSON files

**Files:**
- Create: `public/scenes/late-night.json`
- Create: `public/scenes/morning.json`
- Create: `public/scenes/working.json`
- Create: `public/scenes/evening.json`
- Create: `public/scenes/night.json`
- Create: `public/scenes/morning-drift.json`
- Create: `public/scenes/midday-pulse.json`
- Create: `public/scenes/night-signal.json`
- Create: `public/scenes/cosmos-hour.json`
- Create: `src/scenes/scenes.test.js`

- [ ] **Step 1: Write the scene validation test first**

Create `src/scenes/scenes.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCENE_NAMES = [
  'late-night', 'morning', 'working', 'evening', 'night',
  'morning-drift', 'midday-pulse', 'night-signal', 'cosmos-hour',
];

describe('scene configs', () => {
  for (const name of SCENE_NAMES) {
    it(`${name}.json has required fields`, () => {
      const raw = readFileSync(resolve('public/scenes', `${name}.json`), 'utf8');
      const config = JSON.parse(raw);
      expect(typeof config.background).toBe('string');
      expect(Array.isArray(config.layers)).toBe(true);
      expect(config.layers.length).toBeGreaterThan(0);
      expect(config.lighting?.ambient?.color).toBeTruthy();
      expect(config.lighting?.point?.color).toBeTruthy();
      for (const layer of config.layers) {
        expect(typeof layer.type).toBe('string');
      }
    });
  }
});
```

- [ ] **Step 2: Run to verify it fails (files don't exist yet)**

```bash
npx vitest run src/scenes/scenes.test.js
```

Expected: FAIL — files not found.

- [ ] **Step 3: Create the public/scenes directory and write all 9 files**

```bash
mkdir -p "public/scenes"
```

Create `public/scenes/late-night.json`:

```json
{
  "background": "#020208",
  "layers": [
    { "type": "procedural-stars", "count": 150, "size": 0.006 },
    { "type": "ring", "radius": 0.6, "tube": 0.02, "color": "#3a1a80", "animate": "rotate", "rotateSpeed": 0.05 },
    { "type": "particles", "count": 30, "speed": 0.05, "size": 0.015, "color": "#2a1a60" }
  ],
  "lighting": {
    "ambient": { "color": "#0a0820", "intensity": 0.5 },
    "point": { "color": "#3020a0", "intensity": 0.6, "position": [1, 1, 3] }
  }
}
```

Create `public/scenes/morning.json`:

```json
{
  "background": "#060414",
  "layers": [
    { "type": "procedural-stars", "count": 300, "size": 0.007 },
    { "type": "sphere", "radius": 0.5, "wireframe": true, "color": "#9060d0", "animate": "float", "floatSpeed": 0.4, "floatAmplitude": 0.1 },
    { "type": "particles", "count": 80, "speed": 0.15, "size": 0.018, "color": "#6040a0" }
  ],
  "lighting": {
    "ambient": { "color": "#1a0e30", "intensity": 0.6 },
    "point": { "color": "#a060ff", "intensity": 1.0, "position": [0, -3, 2] }
  }
}
```

Create `public/scenes/working.json`:

```json
{
  "background": "#040d1a",
  "layers": [
    { "type": "procedural-stars", "count": 500, "size": 0.007 },
    { "type": "ring", "radius": 0.5, "tube": 0.025, "color": "#2080cc", "animate": "rotate", "rotateSpeed": 0.25 },
    { "type": "ring", "radius": 0.9, "tube": 0.018, "color": "#1050a0", "animate": "rotate", "rotateSpeed": 0.08 },
    { "type": "particles", "count": 120, "speed": 0.2, "size": 0.02, "color": "#3090dd" }
  ],
  "lighting": {
    "ambient": { "color": "#0a1e38", "intensity": 0.7 },
    "point": { "color": "#40b4ff", "intensity": 1.4, "position": [2, 2, 3] }
  }
}
```

Create `public/scenes/evening.json`:

```json
{
  "background": "#08030e",
  "layers": [
    { "type": "procedural-stars", "count": 350, "size": 0.007 },
    { "type": "ring", "radius": 0.6, "tube": 0.025, "color": "#cc6020", "animate": "float", "floatSpeed": 0.3, "floatAmplitude": 0.12 },
    { "type": "particles", "count": 100, "speed": 0.12, "size": 0.018, "color": "#aa5018" }
  ],
  "lighting": {
    "ambient": { "color": "#1e0a18", "intensity": 0.5 },
    "point": { "color": "#ff8c28", "intensity": 1.1, "position": [0, -3, 2] }
  }
}
```

Create `public/scenes/night.json`:

```json
{
  "background": "#050210",
  "layers": [
    { "type": "procedural-stars", "count": 400, "size": 0.008 },
    { "type": "ring", "radius": 0.5, "tube": 0.025, "color": "#7030cc", "animate": "rotate", "rotateSpeed": 0.18 },
    { "type": "ring", "radius": 1.0, "tube": 0.015, "color": "#3a1870", "animate": "rotate", "rotateSpeed": 0.06 },
    { "type": "particles", "count": 150, "speed": 0.18, "size": 0.02, "color": "#5025a0" }
  ],
  "lighting": {
    "ambient": { "color": "#0d0622", "intensity": 0.6 },
    "point": { "color": "#7840dc", "intensity": 1.3, "position": [2, 2, 3] }
  }
}
```

Create `public/scenes/morning-drift.json`:

```json
{
  "background": "#04030e",
  "layers": [
    { "type": "procedural-stars", "count": 200, "size": 0.006 },
    { "type": "sphere", "radius": 0.8, "wireframe": true, "color": "#b090e0", "animate": "float", "floatSpeed": 0.25, "floatAmplitude": 0.08 },
    { "type": "particles", "count": 50, "speed": 0.08, "size": 0.015, "color": "#8060c0" }
  ],
  "lighting": {
    "ambient": { "color": "#110820", "intensity": 0.5 },
    "point": { "color": "#c8a0ff", "intensity": 0.8, "position": [1, 1, 3] }
  }
}
```

Create `public/scenes/midday-pulse.json`:

```json
{
  "background": "#020c1a",
  "layers": [
    { "type": "procedural-stars", "count": 600, "size": 0.008 },
    { "type": "ring", "radius": 0.4, "tube": 0.03, "color": "#00ccff", "animate": "rotate", "rotateSpeed": 0.45 },
    { "type": "ring", "radius": 0.7, "tube": 0.022, "color": "#0090cc", "animate": "rotate", "rotateSpeed": 0.22 },
    { "type": "ring", "radius": 1.1, "tube": 0.015, "color": "#005888", "animate": "rotate", "rotateSpeed": 0.09 },
    { "type": "particles", "count": 200, "speed": 0.35, "size": 0.022, "color": "#20d4ff" }
  ],
  "lighting": {
    "ambient": { "color": "#061830", "intensity": 0.8 },
    "point": { "color": "#28d4ff", "intensity": 1.8, "position": [2, 2, 3] }
  }
}
```

Create `public/scenes/night-signal.json`:

```json
{
  "background": "#020a08",
  "layers": [
    { "type": "procedural-stars", "count": 100, "size": 0.005 },
    { "type": "sphere", "radius": 0.15, "wireframe": false, "color": "#20c080", "animate": "pulse", "pulseSpeed": 1.2 },
    { "type": "particles", "count": 20, "speed": 0.05, "size": 0.012, "color": "#18805a" }
  ],
  "lighting": {
    "ambient": { "color": "#020e08", "intensity": 0.4 },
    "point": { "color": "#28c890", "intensity": 1.0, "position": [0, 0, 3] }
  }
}
```

Create `public/scenes/cosmos-hour.json`:

```json
{
  "background": "#060210",
  "layers": [
    { "type": "procedural-stars", "count": 500, "size": 0.008 },
    { "type": "icosahedron", "radius": 0.4, "color": "#c08820", "animate": "float", "floatSpeed": 0.2, "floatAmplitude": 0.1 },
    { "type": "ring", "radius": 0.7, "tube": 0.025, "color": "#8040c0", "animate": "rotate", "rotateSpeed": 0.14 },
    { "type": "ring", "radius": 1.2, "tube": 0.015, "color": "#401870", "animate": "rotate", "rotateSpeed": 0.05 },
    { "type": "particles", "count": 180, "speed": 0.15, "size": 0.02, "color": "#d09030" }
  ],
  "lighting": {
    "ambient": { "color": "#1a0a2e", "intensity": 0.6 },
    "point": { "color": "#d4901e", "intensity": 1.4, "position": [1, -1, 3] }
  }
}
```

- [ ] **Step 4: Run validation test to verify all 9 files pass**

```bash
npx vitest run src/scenes/scenes.test.js
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add public/scenes/ src/scenes/scenes.test.js
git commit -m "feat: 9 scene configs + validation tests"
```

---

## Task 6: Update schedule.json scene references

**Files:**
- Modify: `schedule.json`

- [ ] **Step 1: Replace all `"mock"` scene values**

In `schedule.json`, update every `"scene": "mock"` field. The `dayparts` section gets:

```json
"late-night": { "scene": "late-night", ... }
"morning":    { "scene": "morning", ... }
"working":    { "scene": "working", ... }
"evening":    { "scene": "evening", ... }
"night":      { "scene": "night", ... }
```

The `shows` array gets:

```json
{ "id": "morning-drift", "scene": "morning-drift", ... }
{ "id": "midday-pulse",  "scene": "midday-pulse",  ... }
{ "id": "night-signal",  "scene": "night-signal",  ... }
{ "id": "cosmos-hour",   "scene": "cosmos-hour",   ... }
```

- [ ] **Step 2: Run full test suite to confirm nothing broke**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add schedule.json
git commit -m "feat: wire named scenes in schedule.json"
```

---

## Task 7: End-to-end verification

**No files modified — browser verification only.**

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Server starts at `http://localhost:9200`.

- [ ] **Step 2: Open the app and click to start audio**

Open `http://localhost:9200`. Click anywhere to trigger Web Audio. Confirm:
- Scene renders (not a blank canvas)
- Track title and artist appear in overlay
- Attribution footer "Music by Kevin MacLeod · incompetech.com · CC BY 4.0" is visible at the bottom
- Audio plays

- [ ] **Step 3: Use DevPanel to verify each scene**

The DevPanel is in the bottom-right corner. Use "Jump Shortcuts" to visit each slot and verify the correct scene loads:

| Jump target | Expected scene | Key visual |
| --- | --- | --- |
| Late Night (00:00) | Dark near-void, single slow violet ring | Almost no stars, very slow movement |
| Morning (06:00) | Purple, wireframe floating sphere | Soft glow from below |
| Working (11:00) | Blue-white, two concentric rings rotating | Crisp, two-speed rotation |
| Evening (16:00) | Amber glow, floating orange ring | Warm orange-amber tone |
| Night (20:00) | Deep indigo, two purple rings | Rich purple point light |
| Morning Drift show | Large soft wireframe sphere, very slow | Almost meditative |
| Midday Pulse show | Three fast concentric cyan rings | Highest energy, brightest |
| Night Signal show | Near-black, single pulsing green orb | Small orb expanding/contracting |
| Cosmos Hour show | Gold icosahedron + two orbital rings | Flagship visual complexity |

- [ ] **Step 4: Verify audio plays correctly across scenes using DevPanel time override**

Jump to a time where a show is scheduled (e.g. Monday 06:00 for Morning Drift). Confirm the show's scene loads, the correct track plays, and the overlay shows the show name.

- [ ] **Step 5: Confirm all tests still pass**

```bash
npx vitest run
```

Expected: All tests PASS.
