import { Core } from './core.js';
import { createMenuScene } from './menuScene.js';
import { createBuilderScene } from './builderScene.js';
import { createFlightScene } from './flightScene.js';
import { createIntroScene } from './introScene.js';

import { Audio3D } from './audio3d.js';
const AAA = { Core, audio: Audio3D, version: '1.0.0', ready: false };
window.AAA = AAA;
try {
  Core.init();
  Core.register('menu', createMenuScene());
  Core.register('builder', createBuilderScene());
  Core.register('flight', createFlightScene());
  Core.register('intro', createIntroScene());
  AAA.ready = true;
  window.dispatchEvent(new Event('aaa-ready'));
} catch (e) {
  console.warn('[AAA] 3D layer disabled:', e.message);
  window.dispatchEvent(new Event('aaa-fail'));
}
