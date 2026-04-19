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
