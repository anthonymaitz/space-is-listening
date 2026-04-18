// src/main.js (temporary — replaced in Task 7)
import { SceneEngine } from './engines/SceneEngine.js';
import { mockSceneConfig } from './scenes/MockScene.js';

const canvas = document.getElementById('scene-canvas');
const scene = new SceneEngine(canvas);
await scene.loadScene(mockSceneConfig);
scene.start();

document.addEventListener('mousemove', (e) => {
  const normX =  (e.clientX / window.innerWidth)  * 2 - 1;
  const normY = -((e.clientY / window.innerHeight) * 2 - 1);
  scene.setParallax(normX, normY);
});
