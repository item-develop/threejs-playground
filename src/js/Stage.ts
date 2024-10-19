/* import norenV from './glsl/base.vert?raw'
import norenF from './glsl/base.frag?raw' */
import "@splidejs/splide/css";
import "@splidejs/splide/css/skyblue";
import "@splidejs/splide/css/sea-green";
import "@splidejs/splide/css/core";
import * as THREE from 'three';
import { getVh } from './Common/utils';
import { EffectComposer, RenderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';


const SceneConfig = {
  width: 100,
  height: 100,
  halfWidth: 50,
  halfHeight: 50,
  sceneWidth: 3,
  sceneHeight: 3,
  dpr: 1,
  aspectRatio: 1,
};


export default class Stage {
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  camera: THREE.OrthographicCamera | null = null;
  material: THREE.ShaderMaterial | null;
  composer: EffectComposer | null = null;
  timer: number = 0;
  fvAnimEnd: boolean = false;

  constructor() {
    // ... (previous constructor code remains the same)

    const vh = getVh(100)
    const canvas = document.querySelector('#three-canvas') as HTMLElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.OrthographicCamera(
      -SceneConfig.sceneWidth * 0.5,
      SceneConfig.sceneWidth * 0.5,
      SceneConfig.sceneHeight * 0.5,
      -SceneConfig.sceneHeight * 0.5,
      0.1,
      10
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
    });

    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        /* Math.min(window.devicePixelRatio, 2) */
        Math.min(4096
          / window.innerWidth, 3)
    );

    this.renderer.setSize(window.innerWidth, vh);
    this.camera.position.z = 5;

    const geometry = new THREE.PlaneGeometry(2, 2, 100, 100);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        jaggedness: { value: 4.05 }, // Controls the intensity of the jagged effect
        frequency: { value: 20.0 },  // Controls the frequency of the jagged pattern
      },
      vertexShader: `
    uniform float time;
        uniform float jaggedness;
        uniform float frequency;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);  
    }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;

        void main() {
          vec3 color = 0.5 + 0.5 * cos(time + vUv.xyx + vec3(0, 2, 4));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true,
    });

    this.material = material;
    const plane = new THREE.Mesh(geometry, material);
    this.scene.add(plane);

    // Set up post-processing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5, 3.4, 0.9
    );
    this.composer.addPass(bloomPass);

    requestAnimationFrame(this.animate);
  }

  animate = (time: number) => {
    requestAnimationFrame(this.animate);
    if (this.material) {
      this.material.uniforms.time.value = time * 0.001;
    }
    this.composer?.render();
  }
}