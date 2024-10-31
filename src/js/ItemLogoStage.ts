/* import norenV from './glsl/base.vert?raw'
import norenF from './glsl/base.frag?raw' */
import * as THREE from 'three';
import { getVh } from './Common/utils';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import ItemLogo from './ItemLogo';
import ItemPic from './ItemPic';

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

export default class ItemLogoStage {
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  camera: THREE.OrthographicCamera | null = null;
  composer: EffectComposer | null = null;
  planeGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  timer: any = 0;
  instancedMesh: THREE.InstancedMesh | null = null;
  ItemLogo: ItemLogo | null = null
  ItemPic: ItemPic | null = null
  constructor() {
    // ... (previous constructor code remains the same)
    const vh = getVh(100)
    const canvas = document.querySelector('#three') as HTMLCanvasElement;
    //const canvas = document.querySelector('#three-canvas') as HTMLElement;
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
        Math.min(4096
          / window.innerWidth, 3)
    );

    this.renderer.setSize(window.innerWidth, vh);
    this.camera.position.z = 5;
    const aspect = window.innerWidth / vh;

    this.ItemLogo = new ItemLogo(
      SceneConfig.sceneWidth,
      SceneConfig.sceneHeight,
      aspect
    )

    /*     const uTexture = new THREE.TextureLoader().load('/photo.jpg', () => {
          this.ItemPic = new ItemPic(
            SceneConfig.sceneWidth,
            SceneConfig.sceneHeight,
            aspect,
            uTexture
          )
          if (this.ItemPic.instancedMesh) {
            if (!this.scene) return
            this.scene.add(this.ItemPic.instancedMesh);
          }
        }) */



    if (this.ItemLogo.instancedMesh) {
      this.scene.add(this.ItemLogo.instancedMesh);
    }

    window.addEventListener('originalResize', this.resize);

    requestAnimationFrame(this.render);
  }

  resize = () => {
    const vh = getVh(100)
    this.renderer?.setSize(window.innerWidth, vh);
    const aspect = window.innerWidth / vh;
    this.ItemLogo?.resize(aspect)
    this.scene!.children[0] = this.ItemLogo?.instancedMesh!

  }

  render = (time: number) => {
    if (!this.renderer || !this.scene || !this.camera) return;
    requestAnimationFrame(this.render);
    this.ItemLogo?.render(time)
    this.ItemPic?.render(time)
    this.renderer?.render(this.scene!, this.camera!);
  }
}