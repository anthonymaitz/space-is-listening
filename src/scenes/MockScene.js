// src/scenes/MockScene.js

export const mockSceneConfig = {
  id: 'mock',
  background: '#0a0a2e',
  layers: [
    {
      id: 'starfield',
      type: 'procedural-stars',
      z: -2,
      count: 500,
      color: '#ffffff',
      size: 0.008,
      speed: 0,
    },
    {
      id: 'planet',
      type: 'geometry',
      geometry: 'torus',
      color: '#3344aa',
      z: -1,
      animate: 'rotate',
    },
    {
      id: 'particles',
      type: 'particles',
      z: 1,
      count: 200,
      color: '#c0d8ff',
      size: 0.015,
      speed: 0.3,
    },
  ],
  lighting: {
    ambient: { color: '#1a1a4a', intensity: 0.6 },
    point:   { color: '#ff88cc', intensity: 1.2, position: [2, 2, 3] },
  },
};
