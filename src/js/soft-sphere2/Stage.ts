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
import { getVh } from '../Common/utils';
import RibonMesh from '../ribon/RibonMesh';
import baseFrag from '../glsl/soft-sphere.frag?raw'
import baseVert from '../glsl/soft-sphere.vert?raw'

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

  sourceTarget!: THREE.WebGLRenderTarget<THREE.Texture>;
  targetA!: THREE.WebGLRenderTarget<THREE.Texture>;
  targetB!: THREE.WebGLRenderTarget<THREE.Texture>;
  fboScene!: THREE.Scene;
  fboCamera!: THREE.OrthographicCamera;
  fboMaterial!: THREE.ShaderMaterial;
  fboQuad!: THREE.Mesh<THREE.PlaneGeometry, any, THREE.Object3DEventMap>;
  finalScene!: THREE.Scene;
  finalQuad!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>;

  constructor() {
    if (!this.isWebGLAvailable()) {
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


  scene: THREE.Scene | null = null;
  material: THREE.ShaderMaterial | null = null;
  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.canvasSize = this.getCanvasSize()

    this.camera = new THREE.PerspectiveCamera(75, this.canvasSize.width / this.canvasSize.height, 0.01, 100);
    this.camera.position.y = 0;
    this.camera.position.z = 5;
    this.viewport = this.getViewport();

    this.renderer = new THREE.WebGLRenderer(
      {
        alpha: true,
      }
    );
    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        Math.min(4096
          / window.innerWidth, 3)
    );
    this.scene = new THREE.Scene(

    );
    //this.scene.background = new THREE.Color(0xEBA00F);
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
    window.addEventListener('resize', () => this.onWindowResize(), false);
    const geometory = new THREE.SphereGeometry(2, 128, 128);

    /* this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2() }
      },
      vertexShader: baseVert,
      fragmentShader: baseFrag,

    }) */
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2() }
      },
      vertexShader: baseVert,
      fragmentShader: baseFrag,

    })


    this.mesh = new THREE.Mesh(geometory, this.material);
    this.scene.add(this.mesh);

    // ライティングのセットアップ


    this.fbo = new THREE.WebGLRenderTarget(this.canvasSize.width, this.canvasSize.height)

    setTimeout(() => {
      // img download

    }, 2000);


  }

  fbo: THREE.WebGLRenderTarget | null = null;
  mesh!: THREE.Mesh
  RibonMesh!: RibonMesh
  private onWindowResize(): void {
    this.canvasSize = this.getCanvasSize()
    this.camera.aspect = this.canvasSize.width / this.canvasSize.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.viewport = this.getViewport();
  }

  count = 0
  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  }
  private render(time: number): void {
    this.material!.uniforms.time.value = time / 1000;
    this.count++
    if (this.count === 340) {
      const canvas = this.renderer.domElement
      console.log('canvas:', canvas);
      const a = document.createElement('a')
      a.href = canvas?.toDataURL()
      console.log('a.href:', a.href);
      a.download = 'image.png'
      a.click()
    }
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.scene!, this.camera)
  }
}

/* 
1周目
this.sourceTarget に 大元を描画


this.targetA に fboScene を描画
fboSceneは this.targetA.texture

元のバッファーにfinalScene
mapに this.targetA.textureをセットして描画




*/
