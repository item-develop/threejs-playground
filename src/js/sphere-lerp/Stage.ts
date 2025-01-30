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
import fboFrag from '../glsl/base1.frag?raw'
import fboVert from '../glsl/fbo.vert?raw'
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
  trail!: Trail;
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

  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;
  mouseEvent = () => {
    this.raycastPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ color: 0x000000, visible: true }));
    this.dummy = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        ///transparent: true,
        //map: new THREE.TextureLoader().load('/ball.png')
      }),

    )
    this.scene!.add(this.raycastPlane);
    this.scene!.add(this.dummy);

    this.trail = new Trail();

    window.addEventListener('mousemove', (e) => {
      this.pointer.x = (e.clientX / this.canvasSize.width) * 2 - 1;
      this.pointer.y = -(e.clientY / this.canvasSize.height) * 2 + 1;
      this, this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObjects([this.raycastPlane]);
      if (intersects.length > 0) {
        console.log('intersects:', intersects[0].point);
        this.dummy.position.copy(intersects[0].point);

        this.trail.updateTrail(intersects[0].point);

      }
    }
    )
  }
  setupPipeline = () => {
    this.sourceTarget = new THREE.WebGLRenderTarget(this.canvasSize.width, this.canvasSize.height)

    this.targetA = new THREE.WebGLRenderTarget(this.canvasSize.width, this.canvasSize.height)
    this.targetB = new THREE.WebGLRenderTarget(this.canvasSize.width, this.canvasSize.height)

    this.fboScene = new THREE.Scene()
    this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.fboMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(this.canvasSize.width, this.canvasSize.height) },
        time: { value: 0 },
        tPrev: {
          value: this.targetA.texture
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
    this.mouseEvent();
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

    if (this.trail) {
      this.renderer.setRenderTarget(this.sourceTarget);
      this.renderer.render(this.trail.getScene(), this.camera);
    }


    //this.renderer.setRenderTarget(this.sourceTarget)
    //this.renderer.render(this.scene!, this.camera);


    this.renderer.setRenderTarget(this.targetA)
    this.renderer.render(this.fboScene, this.fboCamera)

    this.fboMaterial.uniforms.tDiffuse.value = this.sourceTarget.texture
    this.fboMaterial.uniforms.tPrev.value = this.targetA.texture
    this.fboMaterial.uniforms.time.value = time / 1000

    // final
    this.renderer.setRenderTarget(null)
    this.finalQuad.material.map = this.targetA.texture
    this.renderer.render(this.finalScene, this.fboCamera)


    //swap
    const temp = this.targetA
    this.targetA = this.targetB
    this.targetB = temp


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
class Trail {
  private lastPosition: THREE.Vector3 | null = null;
  private tempScene: THREE.Scene;
  private tempMesh: THREE.Mesh;

  constructor() {
    // 一時的な描画用のシーンを作成
    this.tempScene = new THREE.Scene();
    this.tempMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
  }

  getScene
    = () => {
      return this.tempScene
    }
  updateTrail(newPosition: THREE.Vector3, segmentCount: number = 100) {
    if (!this.lastPosition) {
      this.lastPosition = newPosition.clone();
      return;
    }

    // 一時シーンをクリア
    this.tempScene.clear();

    // 補間点を生成して一時シーンに追加
    for (let i = 1; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const interpolatedPosition = new THREE.Vector3();
      interpolatedPosition.lerpVectors(this.lastPosition, newPosition, t);

      const trailPoint = this.tempMesh.clone();
      trailPoint.position.copy(interpolatedPosition);
      this.tempScene.add(trailPoint);
    }

    this.lastPosition = newPosition.clone();
    return this.tempScene;
  }
}
