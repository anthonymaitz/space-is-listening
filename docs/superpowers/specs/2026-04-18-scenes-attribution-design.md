# Scenes & Attribution Design
**Date:** 2026-04-18
**Status:** Approved

## Overview

Add 9 distinct Three.js scenes (5 daypart fallbacks + 4 show scenes) and a CC BY 4.0 attribution footer to the overlay. Extend the SceneEngine with 3 new geometry types and 2 new animations to give each scene a genuinely distinct visual character. Overall aesthetic: dynamic and alive, like a real radio station — primarily Painterly Space style with Active Cosmos for high-energy slots.

## Future work (out of scope for this PoC)

- Full SceneEngine rewrite with a more flexible scene system (planned as a separate project)

---

## Section 1: SceneEngine extensions

File: `src/engines/SceneEngine.js`

### New geometry types (added to `_createLayer` switch)

| Type | Three.js primitive | Notes |
|---|---|---|
| `sphere` | `SphereGeometry(r, 32, 32)` | Supports `wireframe: true`. Used for soft floating orbs. |
| `ring` | `TorusGeometry(r, 0.02–0.05, 8, 80)` | Thin tube radius gives flat orbital ring look. |
| `icosahedron` | `IcosahedronGeometry(r, 1)` | Wireframe only. Used in Cosmos Hour. |

All three use `MeshStandardMaterial` and support `color` and `radius` fields in the layer config (`radius` defaults to `0.4` for backward compatibility with the existing `geometry` type). The existing `geometry` layer creator also gains `config.radius` support.

### Animation updates

| Animation | Change | Behavior |
| --- | --- | --- |
| `float` | Already exists — make speed/amplitude configurable | `mesh.position.y = _baseY + Math.sin(t * (config.floatSpeed ?? 0.5)) * (config.floatAmplitude ?? 0.05)` |
| `pulse` | New | `mesh.scale.setScalar(1 + Math.sin(t * (config.pulseSpeed ?? 1.2)) * 0.08)` — added to render loop |
| `rotate` | Make speed configurable | `delta * (config.rotateSpeed ?? 0.15)` for Z, `delta * (config.rotateSpeed ?? 0.15) * 0.47` for X |

All new geometry layer creators must return `_baseY: 0` so `float` works correctly.

### Background

Stays as a single hex color on `scene.background`. The "gradient" effect for Morning and Evening comes from a warm/cool point light positioned low in the scene (`position: [0, -3, 2]`).

---

## Section 2: Scene configs

Each scene is a JSON file in `public/scenes/{name}.json`. The 9 scenes:

### Daypart fallbacks

**`late-night.json`** — The void between transmissions
- Background: `#020208`
- Layers: 150 stars (size 0.006), 1 thin ring (slow rotate, violet, r 0.6), 30 particles (speed 0.05)
- Lighting: ambient `#0a0820` 0.5, point `#3020a0` 0.6 at `[1, 1, 3]`

**`morning.json`** — Sunrise from orbit
- Background: `#060414`
- Layers: 300 stars (size 0.007), 1 wireframe sphere (float, soft purple, r 0.5), 80 particles (speed 0.15)
- Lighting: ambient `#1a0e30` 0.6, point `#a060ff` 1.0 at `[0, -3, 2]`

**`working.json`** — Focused orbital energy
- Background: `#040d1a`
- Layers: 500 stars (size 0.007), 1 ring (fast rotate, blue, r 0.5), 1 ring (slow rotate, dim blue, r 0.9), 120 particles (speed 0.2)
- Lighting: ambient `#0a1e38` 0.7, point `#40b4ff` 1.4 at `[2, 2, 3]`

**`evening.json`** — Golden hour from space
- Background: `#08030e`
- Layers: 350 stars (size 0.007), 1 ring (float, amber, r 0.6), 100 particles (speed 0.12)
- Lighting: ambient `#1e0a18` 0.5, point `#ff8c28` 1.1 at `[0, -3, 2]`

**`night.json`** — Prime-time broadcast
- Background: `#050210`
- Layers: 400 stars (size 0.008), 1 ring (rotate, purple, r 0.5), 1 ring (slow rotate, dim indigo, r 1.0), 150 particles (speed 0.18)
- Lighting: ambient `#0d0622` 0.6, point `#7840dc` 1.3 at `[2, 2, 3]`

### Shows

**`morning-drift.json`** — Almost too quiet to be a show
- Background: `#04030e`
- Layers: 200 stars (size 0.006), 1 large wireframe sphere (float slow, lavender, r 0.8), 50 particles (speed 0.08)
- Lighting: ambient `#110820` 0.5, point `#c8a0ff` 0.8 at `[1, 1, 3]`

**`midday-pulse.json`** — Maximum station energy
- Background: `#020c1a`
- Layers: 600 stars (size 0.008), 3 rings (fast/medium/slow rotate, cyan/blue/dim-blue, r 0.4/0.7/1.1), 200 particles (speed 0.35)
- Lighting: ambient `#061830` 0.8, point `#28d4ff` 1.8 at `[2, 2, 3]`

**`night-signal.json`** — A signal from deep space
- Background: `#020a08`
- Layers: 100 stars (size 0.005), 1 small solid sphere (pulse, green, r 0.15), 20 particles (speed 0.05)
- Lighting: ambient `#020e08` 0.4, point `#28c890` 1.0 at `[0, 0, 3]`

**`cosmos-hour.json`** — The flagship weekend scene
- Background: `#060210`
- Layers: 500 stars (size 0.008), 1 wireframe icosahedron (float slow, gold, r 0.4), 1 ring (rotate medium, purple, r 0.7), 1 ring (slow rotate, dim indigo, r 1.2), 180 particles (speed 0.15)
- Lighting: ambient `#1a0a2e` 0.6, point `#d4901e` 1.4 at `[1, -1, 3]`

### schedule.json scene field updates

| Entry | Old value | New value |
|---|---|---|
| daypart: late-night | `"mock"` | `"late-night"` |
| daypart: morning | `"mock"` | `"morning"` |
| daypart: working | `"mock"` | `"working"` |
| daypart: evening | `"mock"` | `"evening"` |
| daypart: night | `"mock"` | `"night"` |
| show: morning-drift | `"mock"` | `"morning-drift"` |
| show: midday-pulse | `"mock"` | `"midday-pulse"` |
| show: night-signal | `"mock"` | `"night-signal"` |
| show: cosmos-hour | `"mock"` | `"cosmos-hour"` |

---

## Section 3: Attribution + wiring

### Attribution footer

File: `src/ui/Overlay.js`

Append inside the bottom bar element, after the controls row:

```html
<div class="attr-footer">Music by Kevin MacLeod · incompetech.com · CC BY 4.0</div>
```

File: `src/ui/overlay.css`

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

Static — no JS updates needed.

### Scene resolver in main.js

`resolveSceneConfig(name)` updated:
1. If `name === 'mock'` → return hardcoded mock config (unchanged)
2. Else → `fetch('/scenes/${name}.json')`, parse JSON, return config
3. On fetch/parse error → log warning, return mock config

Removes the R2 base URL dependency for scene loading (scenes are now always local public assets).

### .gitignore

Add `.superpowers/` to keep brainstorm session files out of version control.
