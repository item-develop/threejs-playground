import * as THREE from 'three';
import { EffectComposer, GLTFLoader, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { clamp, getVh, lerp } from '../Common/utils';
import Mouse from './Mouse';
import gsap from 'gsap';


export const genRate = (value: number, start: number, end: number, noClamp = false) => {
  const _rate = (value - start) / (end - start);
  return !noClamp ? clamp(_rate) : _rate;
};

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

  modelParam = {
    width: 0.5,
    x: 0,
    z: 0,
  }
  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.init();
    this.addObject();
    window.requestAnimationFrame(this.animate);

    setInterval(() => {

      /* gsap.to(this.modelParam, {
        duration: 2,
        ease: 'power2.inOut',
        width: 0.2 + Math.random() * 0.8,
        x: -0.2 + Math.random() * 0.4,
        z: -0.2 + Math.random() * 0.4,
      }) */
    }, 3000);
  }



  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;

  cameraPos = new THREE.Vector3(0, 12, 0);
  private init(): void {

    const canvas = document.querySelector('#three')
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
        alpha: true,
        antialias: true,
        canvas: canvas as HTMLCanvasElement
      }
    );
    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        Math.min(4096
          / window.innerWidth, 3)
    );


    this.scene = new THREE.Scene();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    //this.container.appendChild(this.renderer.domElement);
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

    const envLight2 = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene!.add(envLight2);

    const floorGeometry = new THREE.PlaneGeometry(2000, 2000);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x771DF2, metalness: 0, roughness: 1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = - Math.PI / 2;
    floor.position.y = -5;
    //this.scene!.add(floor);

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
    ///this.scene!.add(noiseMesh);

    const z = this.getViewportSize()
    const planeFloorGeo = new THREE.PlaneGeometry(
      z.width * 0.999999, z.height * 1, 10, 10
    );
    const planeFloorMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });

    const planeFloorMesh = new THREE.Mesh(planeFloorGeo, planeFloorMat);
    planeFloorMesh.rotation.x = - Math.PI / 2;
    planeFloorMesh.position.y = 0;
    /* this.scene!.add(
      planeFloorMesh
    ) */


    const noiseMaterial = createNoiseMaterial(noise);
    // GLTFモデル読み込み
    const loader = new GLTFLoader();
    loader.load(
      '/bellface_logo.glb',  // エクスポートしたファイル
      (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {

            (child as THREE.Mesh).material = noiseMaterial;
            this.logoMesh = child as THREE.Mesh;
          }
        });
        this.model = model;


        const _box = new THREE.Box3().setFromObject(this.model);
        const _modelSize = _box.getSize(new THREE.Vector3());
        this.originalModelSize = _modelSize.clone();
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

  originalModelSize = new THREE.Vector3(
    1, 1, 1

  )
  logoMesh!: THREE.Mesh;
  model!: THREE.Group

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

  getModelSize = (viewportRate: number) => {
    if (!this.model) return 1;
    const modelSize = this.originalModelSize
    const viewport = this.getViewportSize();
    // スケール = ビューポートサイズ / モデルサイズ * 調整率
    return (viewport.width / modelSize.x) * viewportRate * 1; // 0.9は余白
  }


  getModelPositionToCenter = (
    x: number = 0,
    z: number = 0,
  ) => {
    this.logoMesh.rotation.x = 0
    this.logoMesh.rotation.y = 0
    this.logoMesh.rotation.z = 0
    const box = new THREE.Box3().setFromObject(this.model);
    const modelSize = box.getSize(new THREE.Vector3());
    const vs = this.getViewportSize();
    return {
      x: modelSize.x * 0.014 + vs.width / 2 * x,
      y: -modelSize.y / 2,
      z: vs.height / 2 * z
    }
  }


  getViewportSize = () => {
    const fov = this.camera.fov * (Math.PI / 180);

    const height = 2 * Math.tan(fov / 2) * Math.abs(this.camera.position.y);
    const width = height * this.camera.aspect;


    return { width, height };


  }

  lerpMouse = {
    x: 0,
    y: 0
  }

  prevCenterRate = 0;
  private animate = (time: number): void => {
    //this.controls?.update();
    requestAnimationFrame(this.animate);
    this.render(time);
    this.lerpMouse.x += (Mouse.coords.x - this.lerpMouse.x) * 0.05;
    this.lerpMouse.y += (Mouse.coords.y - this.lerpMouse.y) * 0.05;

    Mouse.update();


    const aboutPic = document.querySelector('.bell-about__pic')
    const aboutGrad = document.querySelector('.bell-about__grad')
    const aboutInner = document.querySelector('.bell-about__inner')

    const picTop = window.innerHeight / 2 - aboutPic!.clientHeight / 2
    gsap.to(aboutPic, {
      top: picTop
    })


    const aboutInnerTop = aboutInner!.getBoundingClientRect().top
    const aboutInnerBottom = aboutInner!.getBoundingClientRect().bottom
    const diffTop = aboutInnerTop - picTop
    const diffBottom = aboutInnerBottom - (window.innerHeight / 2 + aboutPic!.clientHeight / 2)
    const stickyMax = diffBottom - diffTop
    const stickyMove = clamp(diffTop * -1, 0, stickyMax)
    const untilRate = genRate(diffTop, 500, 0)
    const overRate = genRate(diffBottom * -1, 0, 500)

    gsap.to(aboutGrad, {
      "--rotate": `${(stickyMove / stickyMax) * 180}deg`
    })

    const _centerRate = 1 - Math.abs(1 - (untilRate + overRate));
    const centerRate = lerp(this.prevCenterRate, _centerRate, 0.08);

    this.prevCenterRate = centerRate;
    const aboutPicCenter = aboutPic!.getBoundingClientRect().left + (aboutPic!.clientWidth / 2) - window.innerWidth / 2
    const leftRate = aboutPicCenter / (window.innerWidth / 2)
    this.modelParam.width = lerp(0.76, (aboutPic!.clientWidth / window.innerWidth) * 0.2, centerRate)

    this.modelParam.x = lerp(0, leftRate, centerRate)
    this.modelParam.z = lerp(-0.1, 0, centerRate)


    const cameraByMouse = new THREE.Vector3(
      this.cameraPos.x + lerp(4, 1.5, centerRate),
      this.cameraPos.y + lerp(0, 0, centerRate),
      this.cameraPos.z + lerp(8, 0, centerRate)
    );
    this.camera.position.set(
      cameraByMouse.x,
      cameraByMouse.y,
      cameraByMouse.z
    );


    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));




    if (this.model) {
      const scale = this.getModelSize(
        this.modelParam.width
      )
      this.model.scale.set(
        scale, scale, scale
      )

      const pos = this.getModelPositionToCenter(
        this.modelParam.x,
        this.modelParam.z
      )

      this.model.position.set(
        pos.x,
        pos.y,
        pos.z
      )
    }


    if (this.logoMesh) {
      //this.logoMesh.rotation.y = time * 0.0002
      //this.logoMesh.rotation.x = time * 0.0001

      const timeRotate = new THREE.Vector3(
        Math.sin(time * 0.003) * 0.2,
        Math.sin(time * 0.001) * 0.1,
        Math.cos(time * 0.002) * 0.3,
      )

      this.logoMesh.rotation.x = lerp(timeRotate.x - this.lerpMouse.y * 0.5, 0, centerRate)
      this.logoMesh.rotation.y = lerp(timeRotate.y - 0.3 + this.lerpMouse.y * 0.5, 0, centerRate)
      this.logoMesh.rotation.z = lerp(timeRotate.z - 0.2 + -this.lerpMouse.x * 0.5, 0, centerRate)
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

