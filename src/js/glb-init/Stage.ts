import * as THREE from 'three';
import { DRACOLoader, EffectComposer, GLTFLoader, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import baseFrag from '../glsl/buildings.frag?raw'
import baseVert from '../glsl/base.vert?raw'


const CANVAS_WIDTH = 3

export class Stage {
  private container!: HTMLDivElement;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;
  scene: THREE.Scene | null = null;

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('resize', () => this.onWindowResize(), false);

    document.addEventListener('mousemove', this.handleMouseMove, false);
    this.init();
    this.addObject();
    window.requestAnimationFrame(this.animate);
  }



  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;

  // マウスを動かしたときのイベント
  mouse = {
    x: 0,
    y: 0
  }
  handleMouseMove = (event: MouseEvent) => {
    const x = event.clientX;
    const y = event.clientY;
    // canvas要素の幅・高さ
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.mouse.x = (x / w) * 2 - 1;
    this.mouse.y = -(y / h) * 2 + 1;
  }

  raycaster = new THREE.Raycaster();
  private init(): void {

    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.getCanvasSize()
    this.camera = new THREE.PerspectiveCamera(
      75, this.getCanvasSize().width / this.getCanvasSize().height, 0.1, 10000
    )

    this.camera.position.y = 10;
    this.camera.position.z = 10;

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
  effectComposer: EffectComposer | null = null;
  sphereModal: THREE.Group<THREE.Object3DEventMap> | null = null;
  addObject = () => {

    // Load GLTF or GLB
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);


    const url = '/glb/tokyo_tower.glb';



    const texture = new THREE.TextureLoader().load('/flame.png');

    const material = new THREE.ShaderMaterial({
      vertexShader: baseVert,
      fragmentShader: baseFrag,
      uniforms: {
        uTexture: {
          value: texture
        },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      }
    })

    loader.load(
      url,
      (gltf) => {
        this.sphereModal = gltf.scene;
        console.log('this.sphereModal:', this.sphereModal);
        this.sphereModal.name = "model_with_cloth";
        this.sphereModal.scale.set(1.0, 1.0, 1.0);
        this.sphereModal.position.set(0, 0, 0);
        console.log('gltf:', gltf);
        this.sphereModal.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            const mesh = child as THREE.Mesh;
            //console.log('mesh:', mesh);
            mesh.material = material;
          }
        });
        this.scene!.add(this.sphereModal);

        //        model["test"] = 100;
        console.log("model");
      },
      function (error) {
        console.log('An error happened');
        //console.log(error);
      }
    );

    //this.renderer.gammaOutput = true;
    //this.renderer.gammaFactor = 2.2;



    const geometory = new THREE.PlaneGeometry(1, 1);


    //this.scene!.add(new THREE.Mesh(geometory, material));

    // 平行光源
    const light = new THREE.DirectionalLight(0xFFFFFF);
    light.intensity = 1; // 光の強さを倍に
    light.position.set(1, 1, 1);
    // シーンに追加
    this.scene!.add(light);

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

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  }
  private render(_time: number): void {
    if (this.sphereModal) {
      this.sphereModal.rotation.y += 0.01;
    }
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

