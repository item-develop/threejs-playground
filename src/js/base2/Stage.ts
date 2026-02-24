import * as THREE from 'three';
import { EffectComposer, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';

import baseVert from '../glsl/base.vert?raw'


const CANVAS_WIDTH = 3

export class Stage {
  private container!: HTMLDivElement;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;
  scene: THREE.Scene | null = null;

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.init();
    this.addObject();
    window.requestAnimationFrame(this.animate);
  }



  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;

  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.getCanvasSize()
    this.camera = new THREE.OrthographicCamera(
      -CANVAS_WIDTH / 2, CANVAS_WIDTH / 2,
      (CANVAS_WIDTH / this.getCanvasSize().aspect) / 2,
      -(CANVAS_WIDTH / this.getCanvasSize().aspect) / 2,
      0.1, 100);
    this.camera.position.y = 0;
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer(
      {
        alpha: true
      }
    );
    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        Math.min(4096
          / window.innerWidth, 3)
    );
    this.scene = new THREE.Scene();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
  }

  addObject = () => {
    const geometory = new THREE.PlaneGeometry(
      CANVAS_WIDTH,
      CANVAS_WIDTH / this.getCanvasSize().aspect, 32, 32
    );
    const texture = new THREE.TextureLoader().load('/flame.png');

    const material = new THREE.ShaderMaterial({
      vertexShader: baseVert,
      fragmentShader: `
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      varying vec2 vUv;

      void main(){
        vec2 uv = vUv;
        vec4 texture = texture2D(uTexture, uv);
        gl_FragColor = vec4(
        texture
        );
      }

      `,
      uniforms: {
        uTexture: {
          value: texture
        },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      }
    })

    this.scene!.add(new THREE.Mesh(geometory, material));

  }




  getCanvasSize = () => {
    const height = getVh(100)
    const width = window.innerWidth
    return {
      height
      , width,
      aspect: width / height
    }
  }

  private onWindowResize(): void {
    this.camera.left = -CANVAS_WIDTH / 2;
    this.camera.right = CANVAS_WIDTH / 2;
    this.camera.top = (CANVAS_WIDTH / this.getCanvasSize().aspect) / 2;
    this.camera.bottom = -(CANVAS_WIDTH / this.getCanvasSize().aspect) / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  }
  private render(_time: number): void {
    this.renderer.render(this.scene!, this.camera)
  }
  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }
}

