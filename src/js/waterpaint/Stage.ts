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
import fboFrag from '../glsl/fbo.frag?raw'
import fboVert from '../glsl/fbo.vert?raw'
export class Stage {
  whiteTarget: any
  whiteScene: any
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
  //private velocityVariable: any;
  sourceTarget!: THREE.WebGLRenderTarget<THREE.Texture>;
  targetA!: THREE.WebGLRenderTarget<THREE.Texture>;
  targetB!: THREE.WebGLRenderTarget<THREE.Texture>;
  fboScene!: THREE.Scene;
  fboCamera!: THREE.OrthographicCamera;
  fboMaterial!: THREE.ShaderMaterial;
  fboQuad!: THREE.Mesh<THREE.PlaneGeometry, any, THREE.Object3DEventMap>;
  finalScene!: THREE.Scene;
  finalQuad!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>;
  whitebg!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>;
  box!: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>;

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

  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;
  mouseEvent = (_e: MouseEvent) => {
    this.raycastPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ color: 0x000000, visible: true }));
    this.dummy = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        ///transparent: true,
        //map: new THREE.TextureLoader().load('/ball.png')
      }),

    )
    this.scene!.add(this.raycastPlane);
    this.scene!.add(this.dummy);
    window.addEventListener('mousemove', (e) => {
      this.pointer.x = (e.clientX / this.canvasSize.width) * 2 - 1;
      this.pointer.y = -(e.clientY / this.canvasSize.height) * 2 + 1;
      this, this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObjects([this.raycastPlane]);
      if (intersects.length > 0) {
        console.log('intersects:', intersects[0].point);
        this.dummy.position.copy(intersects[0].point);
      }
    }
    )
  }
  setupPipeline = () => {
    this.sourceTarget = new THREE.WebGLRenderTarget(this.canvasSize.width, this.canvasSize.height)

    this.targetA = new THREE.WebGLRenderTarget(this.canvasSize.width, this.canvasSize.height)
    this.targetB = new THREE.WebGLRenderTarget(this.canvasSize.width, this.canvasSize.height)

    //this.renderer.setRenderTarget(this.sourceTarget)

    this.renderer.setRenderTarget(this.whiteTarget)
    this.renderer.render(this.whiteScene, this.camera)


    this.fboScene = new THREE.Scene()
    this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.fboMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(this.canvasSize.width, this.canvasSize.height) },
        time: { value: 0 },
        tPrev: {
          value: this.whiteTarget.texture
        }
      },
      vertexShader: fboVert,
      fragmentShader: fboFrag
    })

    this.fboQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.fboMaterial)
    this.fboScene.add(this.fboQuad)


    this.finalScene = new THREE.Scene()
    this.finalQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: null }))
    this.finalScene.add(this.finalQuad)


  }
  raycaster!: THREE.Raycaster;
  pointer!: THREE.Vector2;
  scene: THREE.Scene | null = null;
  private init(): void {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();


    this.whiteTarget = new THREE.WebGLRenderTarget(this.canvasSize.width, this.canvasSize.height)
    this.whiteScene = new THREE.Scene()

    this.whitebg = new THREE.Mesh(new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ color: 0xffffff }))
    this.whiteScene.add(this.whitebg)
    this.whitebg.position.z = -1
    this.box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 }))
    this.whiteScene.add(this.box)

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
    this.scene = new THREE.Scene();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
    window.addEventListener('resize', () => this.onWindowResize(), false);
    const geometory = new THREE.PlaneGeometry(1, 1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.mesh = new THREE.Mesh(geometory, material);
    //this.scene.add(this.mesh);
    this.mouseEvent(new MouseEvent('mousemove'));
    this.setupPipeline()



  }

  mesh!: THREE.Mesh
  RibonMesh!: RibonMesh


  private onWindowResize(): void {
    this.canvasSize = this.getCanvasSize()
    this.camera.aspect = this.canvasSize.width / this.canvasSize.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.viewport = this.getViewport();
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  }
  private render(time: number): void {

    this.renderer.setRenderTarget(this.sourceTarget)
    this.renderer.render(this.scene!, this.camera);

    this.renderer.setRenderTarget(this.targetA)
    this.renderer.render(this.fboScene, this.fboCamera)
    this.fboMaterial.uniforms.tDiffuse.value = this.sourceTarget.texture
    this.fboMaterial.uniforms.tPrev.value = this.targetA.texture
    this.fboMaterial.uniforms.time.value = time / 1000

    // final
    this.finalQuad.material.map = this.targetA.texture
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.finalScene, this.fboCamera)





    //swap
    const temp = this.targetA
    this.targetA = this.targetB
    this.targetB = temp


  }
}

