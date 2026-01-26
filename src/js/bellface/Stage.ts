import * as THREE from 'three';
import { EffectComposer, GLTFLoader, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import baseFrag from '../glsl/flame.frag?raw'
import baseVert from '../glsl/base.vert?raw'
import Mouse from './Mouse';

const createNoiseMaterial = (noiseTexture: THREE.Texture) => {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.8,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNoiseTexture = { value: noiseTexture };
    shader.uniforms.uNoiseScale = { value: 500.05 };
    shader.uniforms.uNoiseOpacity = { value: 0.2 };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
        #include <common>
        varying vec3 vLocalPosition;
        varying vec3 vLocalNormal;
      `
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
        #include <worldpos_vertex>
        vLocalPosition = position;  // ローカル座標をそのまま使う
        vLocalNormal = normal;      // ローカル法線
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
        #include <common>
        uniform sampler2D uNoiseTexture;
        uniform float uNoiseScale;
        uniform float uNoiseOpacity;
        varying vec3 vLocalPosition;
        varying vec3 vLocalNormal;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
    vec3 absNormal = abs(vLocalNormal);
    vec2 noiseUV;
    
    // 最も強い法線方向に応じてUVを選択
    if (absNormal.z >= absNormal.x && absNormal.z >= absNormal.y) {
      // Z方向を向いている面（上面・底面）→ XY平面でマッピング
      noiseUV = vLocalPosition.xy * uNoiseScale;
    } else if (absNormal.y >= absNormal.x) {
      // Y方向を向いている面 → XZ平面
      noiseUV = vLocalPosition.xz * uNoiseScale;
    } else {
      // X方向を向いている面 → YZ平面
      noiseUV = vLocalPosition.yz * uNoiseScale;
    }
    
    float noise = texture2D(uNoiseTexture, noiseUV).r;
    
    gl_FragColor.rgb *= (1.0 - uNoiseOpacity + noise * uNoiseOpacity);
    
    #include <dithering_fragment>
  `
    );
  };

  return material;
};
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

    this.init();
    this.addObject();
    window.requestAnimationFrame(this.animate);
  }



  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;

  cameraPos = new THREE.Vector3(3, 11, 6);
  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    // cameraPosNormalize
    this.cameraPos.normalize().multiplyScalar(12);

    this.getCanvasSize()
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.getCanvasSize().width / this.getCanvasSize().height,
      0.1,
      1000
    );
    this.camera.position.copy(this.cameraPos);

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
    //this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();


  }
  addObject = () => {
    //const axisHelper = new THREE.AxesHelper(5);
    //this.scene!.add(axisHelper);

    const textureLoader = new THREE.TextureLoader();
    const noise = textureLoader.load('/noise.png');

    noise.wrapS = THREE.RepeatWrapping;
    noise.wrapT = THREE.RepeatWrapping;
    noise.repeat.set(300, 300);
    noise.magFilter = THREE.NearestFilter;


    const light = new THREE.PointLight(0xffffff, 300, 200);
    light.position.set(-2, 10, -2);
    this.scene!.add(light);

    const direLight = new THREE.DirectionalLight(0xffffff, 1);
    direLight.position.set(-10, 0, 4);
    this.scene!.add(direLight);

    const envLight = new THREE.AmbientLight(0x7500F5, 6.2);
    this.scene!.add(envLight);

    const envLight2 = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene!.add(envLight2);

    const floorGeometry = new THREE.PlaneGeometry(2000, 2000);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x771DF2, metalness: 0, roughness: 1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = - Math.PI / 2;
    floor.position.y = -5;
    this.scene!.add(floor);

    const noiseGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
    const noiseFloorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0, roughness: 1,
      map: noise,
      transparent: true,
      opacity: 0.2,
    });
    const noiseMesh = new THREE.Mesh(noiseGeometry, noiseFloorMaterial);
    noiseMesh.rotation.x = - Math.PI / 2;
    noiseMesh.position.y = floor.position.y + 0.1;
    this.scene!.add(noiseMesh);


    const noiseMaterial = createNoiseMaterial(noise);
    // GLTFモデル読み込み
    const loader = new GLTFLoader();
    loader.load(
      '/bellface_logo.glb',  // エクスポートしたファイル
      (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const boxGeo = new THREE.BoxGeometry(
              1, 1, 1
            );
            (child as THREE.Mesh).material = noiseMaterial;
            //(child as THREE.Mesh).geometry = boxGeo;
            this.logoMesh = child as THREE.Mesh;
          }
        });

        model.scale.set(0.1, 0.1, 0.1);
        model.position.set(0, 0.5, 0);
        this.scene!.add(model);
      },
      (progress) => {
        console.log('Loading...', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading model:', error);
      }
    );


  }

  logoMesh!: THREE.Mesh;

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
    this.camera.aspect = this.getCanvasSize().width / this.getCanvasSize().height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
  }

  lerpMouse = {
    x: 0,
    y: 0
  }
  private animate = (time: number): void => {
    //this.controls?.update();
    requestAnimationFrame(this.animate);
    this.render(time);
    console.log('Mouse:', Mouse.coords);

    this.lerpMouse.x += (Mouse.coords.x - this.lerpMouse.x) * 0.1;
    this.lerpMouse.y += (Mouse.coords.y - this.lerpMouse.y) * 0.1;
    const cameraByMouse = new THREE.Vector3(
      this.cameraPos.x + this.lerpMouse.x * 1,
      this.cameraPos.y,
      this.cameraPos.z - this.lerpMouse.y * 1
    );
    //this.camera.position.lerp(cameraByMouse, 0.05);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));




    Mouse.update();
    // rotation logo
    console.log('Mouse.diff:', Mouse.diff);
    if (this.logoMesh) {
      // this.logoMesh.rotation.y = time * 0.0002
      // this.logoMesh.rotation.x = time * 0.0001

      this.logoMesh.rotation.x = -this.lerpMouse.y * 0.5;
      //this.logoMesh.rotation.y = this.lerpMouse.y * 0.5;
      this.logoMesh.rotation.z = -this.lerpMouse.x * 0.5;
    }

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

