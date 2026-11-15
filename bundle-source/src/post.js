import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Core } from './core.js';

// Wraps scene+camera with optional bloom; falls back to direct render on low preset.
export class Stage {
  constructor(scene, camera, { bloom = 0.6, radius = 0.6, threshold = 0.85 } = {}) {
    this.scene = scene; this.camera = camera; this.bloomCfg = { bloom, radius, threshold }; this.composer = null; this.size = [2, 2];
  }
  build(r) {
    const s = this.size;
    const rt = new THREE.WebGLRenderTarget(s[0], s[1], { type: THREE.HalfFloatType, samples: Core.qName === 'high' ? 4 : 0 });
    this.composer = new EffectComposer(r, rt);
    this.composer.setPixelRatio(1); this.composer.setSize(s[0], s[1]);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bp = new UnrealBloomPass(new THREE.Vector2(s[0], s[1]), this.bloomCfg.bloom, this.bloomCfg.radius, this.bloomCfg.threshold);
    if (Core.q.bloom) this.composer.addPass(this.bp);
    this.composer.addPass(new OutputPass());
  }
  resize(w, h) {
    this.size = [w, h]; this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.composer) { this.composer.dispose && this.composer.dispose(); this.composer = null; }
  }
  render(r) {
    if (this.composer && this.hadBloom !== Core.q.bloom) { this.composer.dispose && this.composer.dispose(); this.composer = null; }
    if (!this.composer) { this.build(r); this.hadBloom = Core.q.bloom; }
    this.composer.render();
  }
}
