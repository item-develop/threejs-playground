/* function isOverlapping(x: number, y: number, posArray: Uint8Array | Uint8ClampedArray, currentIndex: number, radius: number): boolean {
  for (let i = 0; i < currentIndex; i += 4) {
    const dx = x - posArray[i];
    const dy = y - posArray[i + 1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 2 * radius) {
      return true;
    }
  }
  return false;
} */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Particles } from './Particles';
import { getVh } from '../Common/utils';
import RibonMesh from '../ribon/RibonMesh';

export class Stage {
  //private WIDTH = 10;
  //private PARTICLES = this.WIDTH * this.WIDTH;
  fbo_1!: THREE.WebGLRenderTarget;
  viewport
    : {
      x: number
      y: number
    } = {
      x: 0,
      y: 0
    }
  private container!: HTMLDivElement;
  private camera!: THREE.PerspectiveCamera;
  //private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;
  private velocityVariable: any;

  constructor() {
    if (!this.isWebGLAvailable()) {
      const warning = this.getWebGLErrorMessage();
      document.body.appendChild(warning);
      return;
    }

    this.init();
    window.requestAnimationFrame(this.animate);
  }

  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }
  particles!: Particles

  private getWebGLErrorMessage(): HTMLDivElement {
    const element = document.createElement('div');
    element.id = 'webgl-error-message';
    element.style.fontFamily = 'monospace';
    element.style.fontSize = '13px';
    element.style.fontWeight = 'normal';
    element.style.textAlign = 'center';
    element.style.background = '#fff';
    element.style.color = '#000';
    element.style.padding = '1.5em';
    element.style.width = '400px';
    element.style.margin = '5em auto 0';
    element.innerHTML = 'WebGL is not available in your browser.';
    return element;
  }

  getViewport() {
    const x = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z * this.camera.aspect;
    const y = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z;
    return {
      x, y
    }
  }
  canvasSize = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  getCanvasSize = () => {
    const height = getVh(100)
    const width = window.innerWidth
    return {
      height
      , width
    }
  }
  fbo1Size = () => {
    return {
      height: this.canvasSize.height,
      width: this.canvasSize.width
    }
  }
  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.canvasSize = this.getCanvasSize()



    this.camera = new THREE.PerspectiveCamera(75, this.canvasSize.width / this.canvasSize.height, 0.1, 100);

    this.camera.position.y = 0;
    this.camera.position.z = 5;
    this.viewport = this.getViewport();


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
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.stats = new Stats();
    //this.container.appendChild(this.stats.dom);

    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.particles = new Particles(
      this.renderer,
      this.camera,
      () => {
        return this.getCanvasSize()
      }
    )


  }

  mesh!: THREE.Mesh
  RibonMesh!: RibonMesh


  private onWindowResize(): void {
    this.canvasSize = this.getCanvasSize()
    this.camera.aspect = this.canvasSize.width / this.canvasSize.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.particles.onWindowResize()

    this.viewport = this.getViewport();
    this.velocityVariable.material.uniforms['viewport'] = {
      value: new THREE.Vector2(this.viewport.x, this.viewport.y)
    }

  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  }
  private render(time: number): void {
    this.particles.render(time)
    this.renderer.render(this.particles.mesh!, this.camera);

  }
}

