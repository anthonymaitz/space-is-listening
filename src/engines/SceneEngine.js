// src/engines/SceneEngine.js
import * as THREE from 'three';

export class SceneEngine {
  constructor(canvas) {
    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);

    this._scene = new THREE.Scene();

    // Orthographic camera covers aspect-correct frustum
    const aspect = window.innerWidth / window.innerHeight;
    this._camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 100);
    this._camera.position.z = 5;

    this._layers = [];
    this._parallaxOffset = { x: 0, y: 0 };
    this._animFrameId = null;
    this._clock = new THREE.Clock();

    window.addEventListener('resize', () => this._onResize());
  }

  async loadScene(config) {
    this._clearLayers();
    this._scene.background = new THREE.Color(config.background || '#000000');
    this._setupLighting(config.lighting);

    for (const layerConfig of config.layers) {
      const layer = await this._createLayer(layerConfig);
      if (layer) {
        this._scene.add(layer.object);
        this._layers.push(layer);
      }
    }
  }

  _clearLayers() {
    for (const layer of this._layers) {
      this._scene.remove(layer.object);
      layer.object.geometry?.dispose();
      if (layer.object.material) {
        layer.object.material.map?.dispose();
        layer.object.material.dispose();
      }
    }
    this._layers = [];
  }

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

  async _createImageLayer(config) {
    const texture = await new THREE.TextureLoader().loadAsync(config.src);
    const aspect = texture.image.width / texture.image.height;
    const geo = new THREE.PlaneGeometry(aspect * 2, 2);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: config.cutout ?? false,
      depthWrite: !(config.cutout ?? false),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = config.z ?? 0;
    return { object: mesh, config, _baseY: 0 };
  }

  _createParticleLayer(config) {
    const count = config.count || 100;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (config.z ?? 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(config.color || '#ffffff'),
      size: config.size || 0.02,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    return { object: points, config, _positions: positions, _baseY: 0 };
  }

  _createGeometryLayer(config) {
    const r = config.radius ?? 0.4;
    const geo = new THREE.TorusGeometry(r, 0.12, 16, 80);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.color || '#4444aa'),
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = config.z ?? 0;
    return { object: mesh, config, _baseY: 0 };
  }

  _createSphereLayer(config) {
    const r = config.radius ?? 0.4;
    const geo = new THREE.SphereGeometry(r, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
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
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.color || '#4466aa'),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = config.z ?? 0;
    return { object: mesh, config, _baseY: 0 };
  }

  _createIcosahedronLayer(config) {
    const r = config.radius ?? 0.4;
    const geo = new THREE.IcosahedronGeometry(r, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.color || '#cc9922'),
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = config.z ?? 0;
    return { object: mesh, config, _baseY: 0 };
  }

  _setupLighting(lightingConfig) {
    this._scene.children.filter(c => c.isLight).forEach(l => this._scene.remove(l));
    if (!lightingConfig) return;

    if (lightingConfig.ambient) {
      this._scene.add(new THREE.AmbientLight(
        new THREE.Color(lightingConfig.ambient.color),
        lightingConfig.ambient.intensity
      ));
    }
    if (lightingConfig.point) {
      const pt = new THREE.PointLight(
        new THREE.Color(lightingConfig.point.color),
        lightingConfig.point.intensity
      );
      const [x, y, z] = lightingConfig.point.position;
      pt.position.set(x, y, z);
      this._scene.add(pt);
    }
  }

  setParallax(normX, normY) {
    this._parallaxOffset = { x: normX, y: normY };
  }

  async transitionTo(newConfig, durationMs = 3000) {
    // v1: immediate swap. Opacity tween can be added in a future task.
    await this.loadScene(newConfig);
  }

  start() {
    const tick = () => {
      this._animFrameId = requestAnimationFrame(tick);
      const delta = this._clock.getDelta();
      const elapsed = this._clock.elapsedTime;

      for (const layer of this._layers) {
        const { config } = layer;

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
      }

      this._renderer.render(this._scene, this._camera);
    };
    tick();
  }

  stop() {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
  }

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._camera.left   = -aspect;
    this._camera.right  =  aspect;
    this._camera.top    =  1;
    this._camera.bottom = -1;
    this._camera.updateProjectionMatrix();
  }
}
