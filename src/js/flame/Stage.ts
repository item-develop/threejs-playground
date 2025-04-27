import * as THREE from 'three';
import { EffectComposer, OrbitControls, RenderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import baseFrag from '../glsl/flame.frag?raw'
import baseVert from '../glsl/base.vert?raw'
import Mouse from './Mouse';
Mouse.init()
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

    this.effectComposer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera)
    this.effectComposer.addPass(renderPass)



    // シェーダーパスを作成して追加


    // 水平方向と垂直方向のパスを順番に追加

  }
  effectComposer: EffectComposer | null = null;
  material: THREE.ShaderMaterial | null = null;
  material2: THREE.ShaderMaterial | null = null;
  addObject = () => {
    const geometory = new THREE.PlaneGeometry(2.2, 1.7);
    const texture = new THREE.TextureLoader().load('/flame.png');

    this.material = new THREE.ShaderMaterial({
      vertexShader: baseVert,
      fragmentShader: baseFrag,
      uniforms: {
        uTexture: {
          value: texture
        },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uRandom: {
          value: 1,
        },
        uMouse: {
          value: Mouse.coords
        },
        uMouseStrength: { value: 0.0 },
      }
    })
    this.material2 = new THREE.ShaderMaterial({
      vertexShader: baseVert,
      fragmentShader: baseFrag,
      uniforms: {
        uTexture: {
          value: texture
        },
        uTime: { value: 0.0 },
        uMouseStrength: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uRandom: {
          value: -1,
        }
      }
    })

    this.scene!.add(new THREE.Mesh(geometory, this.material));


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
    //this.camera.aspect = this.getCanvasSize().width / this.getCanvasSize().height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
  }

  lerpMouse = {
    x: 0,
    y: 0
  }
  prevMouse = {
    x: 0,
    y: 0
  }
  currentTime = 0
  lastSpeed = 0
  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.material!.uniforms.uTime.value = time / 1000;
    this.material2!.uniforms.uTime.value = time / 1000;


    const toCords = {
      x: ((Mouse.coords.x)),
      y: ((Mouse.coords.y)),
    }
    const lerpPrev = {
      x: this.lerpMouse.x,
      y: this.lerpMouse.y
    }

    this.lerpMouse.x = lerp(
      this.lerpMouse.x,
      toCords.x,
      0.015,
      (time - this.currentTime) / 10
    );
    this.lerpMouse.y = lerp(
      this.lerpMouse.y,
      toCords.y,
      0.015,
      (time - this.currentTime) / 10
    );

    const currentSpeed = (Math.abs(lerpPrev.x - this.lerpMouse.x) + Math.abs(lerpPrev.y - this.lerpMouse.y)) / ((time - this.currentTime) / 8.33);



    this.prevMouse.x = Mouse.coords.x;
    this.prevMouse.y = Mouse.coords.y;
    this.lastSpeed = lerp(
      this.lastSpeed,
      currentSpeed,
      0.05,
      (time - this.currentTime) / 10
    );
    this.material!.uniforms.uMouse.value = new THREE.Vector2(
      this.lerpMouse.x,
      this.lerpMouse.y
    );
    this.material!.uniforms.uMouseStrength.value = this.lastSpeed;
    this.render(time);
    this.currentTime = time
    this.stats.update();
  }
  private render(_time: number): void {
    this.effectComposer?.render()
    //this.renderer.render(this.scene!, this.camera)
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


export const lerp = (start: number, end: number, amt: number, delta: number) => {
  const calc = (1 - amt * delta) * start + amt * delta * end;
  return calc;
};
export const lerp2 = (start: number, end: number, amt: number) => {
  return (1 - amt) * start + amt * end;
};
