/* import norenV from './glsl/base.vert?raw'
import norenF from './glsl/base.frag?raw' */
import * as THREE from 'three';
import { EffectComposer, OrbitControls } from 'three/examples/jsm/Addons.js';
import { getVh } from '../Common/utils';
import RibonMesh from './RibonMesh';


export default class Stage {
  renderer: THREE.WebGLRenderer | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  composer: EffectComposer | null = null;
  planeGeometry = new THREE.SphereGeometry(1, 1, 1, 1);
  timer: any = 0;
  material!: THREE.MeshBasicMaterial | null;
  controls!: OrbitControls | null;
  RibonMesh: RibonMesh
  constructor() {
    // ... (previous constructor code remains the same)
    const vh = getVh(100)
    const canvas = document.querySelector('#three') as HTMLCanvasElement;
    //const canvas = document.querySelector('#three-canvas') as HTMLElement;

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / vh, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        Math.min(4096
          / window.innerWidth, 3)
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.renderer.setSize(window.innerWidth, vh);
    this.camera.position.z = 5;
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
    this.RibonMesh = new RibonMesh(
      frontTexture,
      backTexture
    )
    window.addEventListener('originalResize', this.resize);
    requestAnimationFrame(this.render);
  }

  materials: THREE.MeshStandardMaterial[] = []


  resize = () => {
    const vh = getVh(100)
    this.renderer?.setSize(window.innerWidth, vh);
    this.RibonMesh.resize()
  }


  render = (time: number) => {
    if (!this.renderer || !this.camera) return;
    requestAnimationFrame(this.render);
    this.controls?.update();
    this.RibonMesh.render(time)
    this.renderer?.render(this.RibonMesh.scene!, this.camera!);
  }
}