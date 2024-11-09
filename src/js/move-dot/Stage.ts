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
  cameraParticles!: THREE.PerspectiveCamera
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
    this.camera.position.z = 2;


    this.fbo_1 = new THREE.WebGLRenderTarget(this.fbo1Size().width, this.fbo1Size().height,)
    this.cameraParticles = new THREE.PerspectiveCamera(75, this.fbo1Size().width / this.fbo1Size().height, 0.1, 100);
    this.cameraParticles.position.y = 0;
    this.cameraParticles.position.z = 2;


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
    this.container.appendChild(this.stats.dom);

    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.particles = new Particles(
      this.renderer,
      this.cameraParticles,
      () => {
        return this.fbo1Size()
      }
    )

    console.log('this.viewport.x:', this.viewport.x);
    const planeGeometry = new THREE.PlaneGeometry(this.viewport.x, this.viewport.y, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.fbo_1.texture },
      },

      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `,
      fragmentShader: `
      uniform sampler2D uTexture;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        gl_FragColor = color;
        //gl_FragColor = vec4(1.0,0.,0.,1.);
      }
      `,

    })

    this.mesh = new THREE.Mesh(planeGeometry, material);

    const frontTexture = new THREE.TextureLoader().load('/sample.png')
    const backTexture = new THREE.TextureLoader().load('/sample.png');
    [
      frontTexture, backTexture
    ].forEach((texture,) => {
      texture.wrapS = 1000
      texture.wrapT = 1000
      texture.repeat.set(1, 1,)
      texture.offset.setX(.5)
      texture.flipY = false
    })
    backTexture.repeat.set(-1, 1)

    this.fbo_1.texture.wrapS = 1000
    this.fbo_1.texture.wrapT = 1000
    this.fbo_1.texture.repeat.set(1, 1,)
    this.fbo_1.texture.offset.setX(.5)
    this.fbo_1.texture.flipY = false

    this.RibonMesh = new RibonMesh(
      /* this.fbo_1.texture,
      this.fbo_1.texture, */
      this.fbo_1.texture,
      this.fbo_1.texture
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
  count = 0
  private render(time: number): void {

    this.count++
    if (this.count === 40) {
      console.log('this.fbo_1.texture:', this.fbo_1.texture);

      const imgae = this.fbo_1.texture.image as HTMLImageElement
      console.log('imgae:', imgae);
      // download

    }
    this.renderer.setRenderTarget(this.fbo_1);
    this.renderer.render(this.particles.particles, this.cameraParticles);
    this.renderer.setRenderTarget(null);
    this.RibonMesh.render(time)
    this.renderer.render(this.RibonMesh.scene!, this.camera);
    this.renderer.render(this.mesh!, this.camera);
  }
}

