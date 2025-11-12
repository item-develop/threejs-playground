import { MeshLine } from 'three.meshline' // 一時的にコメントアウト
import * as THREE from 'three';
import { BloomPass, EffectComposer, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getIsDark, getVh, lerp, solveLorenz } from '../Common/utils';
import { MeshLineMaterial } from './CustomMeshLineMaterial';
import { GUI } from 'lil-gui'
import gsap from 'gsap';
import { clamp } from 'three/src/math/MathUtils.js';

function getRandomIndexOfOne(arr: number[]): number | null {
  // 値が1である要素のインデックスを全て取得
  const indicesOfOne = arr
    .map((value, index) => value === 1 ? index : -1)
    .filter(index => index !== -1);

  // 1が存在しない場合はnullを返す
  if (indicesOfOne.length === 0) {
    return null;
  }

  // ランダムにインデックスを選択
  const randomIndex = Math.floor(Math.random() * indicesOfOne.length);
  return indicesOfOne[randomIndex];
}




export class Stage {
  private container!: HTMLDivElement;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;
  scene: THREE.Scene | null = null;
  linesParam: { offsetInit: number; offsetScroll: number }[] = [];

  isDark = getIsDark();

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('resize', () => this.onWindowResize(), false);
    window.addEventListener('mousemove', (event) => this.mousemove(event), false);

    this.init();
    this.addObject();
    window.requestAnimationFrame(this.animate);


    if (this.isDark) {
      document.body.classList.add('dark');
    }
  }


  mouse = new THREE.Vector2(0, 0);
  mouseLerp = new THREE.Vector2(0, 0);
  prevMouse = new THREE.Vector2(0, 0);

  mousemove = (event: MouseEvent) => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }



  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;
  gui: GUI | null = null;
  computeCamera!: THREE.OrthographicCamera;
  getMRT() {
    const e = new THREE.WebGLRenderTarget(this.getCanvasSize().width,
      this.getCanvasSize().height, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      count: 2,
    });
    console.log('e:', e);
    return e.textures[0].generateMipmaps = !1,
      e.textures[0].minFilter = 1006,
      e.textures[0].magFilter = 1006,
      e.textures[1].generateMipmaps = !1,
      e.textures[1].minFilter = 1006,
      e.textures[1].magFilter = 1006,
      e
  }
  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera = new THREE.PerspectiveCamera(75, this.getCanvasSize().width / this.getCanvasSize().height, 0.01, 100);

    this.computeCamera = new THREE.OrthographicCamera(
      -1, 1, 1, -1, 0.1, 10
    );

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

    this.scene = new THREE.Scene();
    //this.scene!.background = new THREE.Color(0xffffff);
    this.gui = new GUI()


    // camera GUI
    /*     this.gui!.add(this.camera.position, 'z')
          .name('Camera Position Z')
          .listen()
        this.gui!.add(this.camera.position, 'x')
          .name('Camera Position X')
          .listen()
        this.gui!.add(this.camera.position, 'y')
          .name('Camera Position Y')
          .listen()
    
        this.gui!.add(this.camera.up, 'x')
          .name('Camera Up X')
          .listen()
        this.gui!.add(this.camera.up, 'y')
          .name('Camera Up Y')
          .listen()
        this.gui!.add(this.camera.up, 'z')
          .name('Camera Up Z')
          .listen()
     */

    this.camera.rotateX(-Math.PI / 10);
    this.camera.updateMatrix();
    this.camera.position.set(-2, 0, 1.4);
    this.camera.up.set(
      3.2, 0.2, 0
    )
    this.camera.updateMatrix();


    //this.scene.add(axisHelper);


    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);

    // EffectComposerのセットアップ - 被写界深度効果
    this.effectComposer = new EffectComposer(this.renderer);

    // 通常のレンダリングパス
    const renderPass = new RenderPass(this.scene, this.camera);
    this.effectComposer.addPass(renderPass);

    // カスタム被写界深度シェーダー
    const DepthOfFieldShader = {
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        resolution: { value: new THREE.Vector2(this.getCanvasSize().width, this.getCanvasSize().height) },
        cameraNear: { value: this.camera.near },
        cameraFar: { value: this.camera.far },
        focusDistance: { value: 1.2 }, // カメラからの焦点距離
        focusRange: { value: 0.9 },    // 焦点が合う範囲
        blurStrength: { value: 1 }   // ブラー強度
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform vec2 resolution;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float focusDistance;
        uniform float focusRange;
        uniform float blurStrength;

        varying vec2 vUv;

        // 深度値を線形化（手動実装）
        float linearizeDepth(float depth) {
          // パースペクティブカメラの深度バッファを線形深度に変換
          float z = depth * 2.0 - 1.0; // [0,1] -> [-1,1]
          return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
        }

        void main() {
          vec2 texelSize = 1.0 / resolution;

          // 深度取得して線形化
          float depth = texture2D(tDepth, vUv).x;
          float linearDepth = linearizeDepth(depth);

          // 焦点からの距離を計算
          float distanceFromFocus = abs(linearDepth - focusDistance);

          // ボケ量を計算（焦点範囲外でボケる）
          float blur = smoothstep(focusRange * 0.5, focusRange + 1.5, distanceFromFocus);

          // 奥に行くほど強くボケるようにバイアスをかける
          float depthBias = smoothstep(focusDistance, focusDistance + 3.0, linearDepth);
          blur = mix(blur, 1.0, depthBias * 0.8);

          // ブラー適用
          vec4 sum = vec4(0.0);
          float totalWeight = 0.0;
          float blurSize = blur * blurStrength;

          // ガウシアンブラー風のサンプリング
          for(float x = -4.0; x <= 4.0; x += 1.0) {
            for(float y = -4.0; y <= 4.0; y += 1.0) {
              vec2 offset = vec2(x, y) * texelSize * blurSize;
              float weight = exp(-(x*x + y*y) / 16.0);
              sum += texture2D(tDiffuse, vUv + offset) * weight;
              totalWeight += weight;
            }
          }

          gl_FragColor = sum / totalWeight;
        }
      `
    };

    // 深度テクスチャ用のレンダーターゲット
    this.depthRenderTarget = new THREE.WebGLRenderTarget(
      this.getCanvasSize().width,
      this.getCanvasSize().height,
      {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat
      }
    );
    this.depthRenderTarget.depthTexture = new THREE.DepthTexture(
      this.getCanvasSize().width,
      this.getCanvasSize().height
    );

    // DOFパス
    const bloomPass = new BloomPass(1.1, 2, 0.1);
    this.effectComposer.addPass(bloomPass);

    const dofPass = new ShaderPass(DepthOfFieldShader);
    dofPass.uniforms.tDepth.value = this.depthRenderTarget.depthTexture;
    this.dofPass = dofPass;
    this.effectComposer.addPass(dofPass);

    // GUI for DOF parameters
    const dofFolder = this.gui!.addFolder('Depth of Field');
    dofFolder.add(dofPass.uniforms.focusDistance, 'value', 0.1, 10.0, 0.1).name('Focus Distance');
    dofFolder.add(dofPass.uniforms.focusRange, 'value', 0.1, 3.0, 0.1).name('Focus Range');
    dofFolder.add(dofPass.uniforms.blurStrength, 'value', 0.0, 15.0, 0.5).name('Blur Strength');
    dofFolder.open();


  }

  strech = (
    index: number,
    isAdd = false
  ) => {

    gsap.to(this.linesParam[index], {
      offsetInit: 1,
      //duration: 1,
      duration: isAdd ? 15 : 10,
      //delay: Math.random() * 0,
      ease: 'linear',
      onComplete: () => {
        /*  gsap.to(material, {
           dashOffset: 0,
           duration: 2,
           delay: Math.random() * 10,
           onComplete: () => {
             material.dashOffset = 0
             strech(material, index)
           }
         }) */
      }
    })


  }
  getViewport() {
    const distance = this.camera.position.z;
    const vFov = this.camera.fov * Math.PI / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.camera.aspect;
    return { width, height };
  }


  trailMaterials: MeshLineMaterial[] = [];
  createMeshLine = (i: number) => {
    const lorenzPoints = solveLorenz(7, 28, 8 / 3, i * 1);

    // CatmullRomCurve3でスムーズな曲線を作成
    const curve = new THREE.CatmullRomCurve3(lorenzPoints);
    const length = curve.getLength();
    const cP = curve.getSpacedPoints(length * 70); // 点の密度を調整
    const geometry = new THREE.BufferGeometry().setFromPoints(cP);

    const line = new MeshLine();
    line.setGeometry(geometry);

    this.linesParam.push({
      offsetInit: 2,
      offsetScroll: 0,
    })

    const viewport = this.getViewport();
    const meshline = new MeshLineMaterial({
      color: new THREE.Color('#0ff'), // 鮮やかなピンクに変更
      opacity: 1,
      lineWidth: 0.007,
      resolution: new THREE.Vector2(viewport.width, viewport.height),
      useDash: 1,
      dashArray: 2,
      dashOffset: 2,
      dashRatio: 0.5,
      //alphaTest: 0.5,
      //transparent: false,
      /* depthWrite: true,
      depthTest: false, */

      transparent: true,
      depthWrite: true,
      depthTest: false,
      uTotalLength: length,
      alphaTest: 0.9,

      side: THREE.DoubleSide
    } as any);

    const _line = new THREE.Mesh(line.geometry, meshline);
    this.trailMaterials.push(meshline);
    _line.frustumCulled = false; // カリング無効化
    this.meshes.push(_line);
    return _line;
  }

  effectComposer: EffectComposer | null = null;
  dofPass: ShaderPass | null = null;
  depthRenderTarget!: THREE.WebGLRenderTarget;
  addLine = () => {

    const meshLine = this.createMeshLine(0);
    this.scene!.add(meshLine);
    this.strech(this.trailMaterials.length - 1, true);

    this.removeLine();
  }

  removingIndexs: number[] = []

  removeLine = () => {
    const randomIndex = getRandomIndexOfOne(this.linesParam.map(param => param.offsetInit));
    if (randomIndex === null) {
      return;
    }
    this.removingIndexs.push(randomIndex);
    const materialToRemove = this.trailMaterials[randomIndex];

    const removeMesh = this.meshes[randomIndex];

    gsap.to(this.linesParam[randomIndex], {
      offsetInit: 0,
      //duration: 1,
      duration: 15,
      //delay: Math.random() * 0,
      ease: 'linear',
      onComplete: () => {
        const currentRemoveIndex = this.meshes.map(mesh => mesh.id).indexOf(removeMesh.id);
        this.scene!.remove(removeMesh);
        this.linesParam.splice(currentRemoveIndex, 1);
        this.linesParamPrev.splice(currentRemoveIndex, 1);
        this.trailMaterials.splice(currentRemoveIndex, 1);
        this.meshes.splice(currentRemoveIndex, 1);
        removeMesh.geometry.dispose();
        materialToRemove.dispose();
        this.removingIndexs = this.removingIndexs.filter(index => index !== currentRemoveIndex);
      }
    })




  }
  meshes: THREE.Mesh[] = [];
  addObject = () => {

    for (var i = 0; i < 30; i++) {
      //if (i === 4) {
      const meshLine = this.createMeshLine(i);
      this.scene!.add(meshLine);

    }


    const box = new THREE.BoxGeometry(5, 1, 1);
    const materialBox = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(box, materialBox);
    cube.position.set(0, 0, 0);

    //this.scene?.add(cube);

    setInterval(() => {
      //      this.addLine()
    }, 2000);

    this.trailMaterials.forEach((material, index) => {
      setTimeout(() => {
        this.strech(index)
      }, 1000);

    })


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

    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    this.effectComposer?.setSize(this.getCanvasSize().width, this.getCanvasSize().height);

    // 深度レンダーターゲットもリサイズ
    if (this.depthRenderTarget) {
      this.depthRenderTarget.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    }

    // DOFシェーダーの解像度も更新
    if (this.dofPass) {
      this.dofPass.uniforms.resolution.value.set(this.getCanvasSize().width, this.getCanvasSize().height);
    }
  }
  baseCameraPos = new THREE.Vector3(
    -2, 0, 1.4
  );

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);

    if (this.controls) {
      this.controls.update();
    }




    this.stats.update();

    this.camera.updateMatrix();

  }
  linesParamPrev: number[] = []

  private render(_time: number): void {
    // カメラをゆっくり回転させてアトラクターを様々な角度から見せる
    this.trailMaterials.forEach((material, i) => {
      material.uTime = _time * 0.001
    })
    if (this.controls) {
      //this.controls.update();
    }



    this.mouseLerp.x = lerp(this.mouseLerp.x, this.mouse.x, 0.05);
    this.mouseLerp.y = lerp(this.mouseLerp.y, this.mouse.y, 0.05);

    const mouseDistance = Math.sqrt(this.mouseLerp.x * this.mouseLerp.x + this.mouseLerp.y * this.mouseLerp.y);

    const speed = 1
    const sct = Math.min(window.scrollY, window.innerHeight * 2);
    const scrollRate = sct / (window.innerHeight * 2)
    const mouseAdd = new THREE.Vector3(
      + 0.2 + Math.sin(speed * _time * 0.0005) * 0.1 + this.mouseLerp.y * 0.1,
      - 0 + Math.cos(speed * _time * 0.001) * 0.15 + this.mouseLerp.x * 0.1,
      + Math.cos(speed * _time * 0.0003) * 0.1 + 0.1 + mouseDistance * 0.1,
    )
    this.camera.position.set(
      this.baseCameraPos.x + mouseAdd.x,
      this.baseCameraPos.y + mouseAdd.y,
      this.baseCameraPos.z + mouseAdd.z,
    );

    this.camera.position.lerpVectors(
      this.camera.position,
      new THREE.Vector3(
        this.baseCameraPos.x + 1 + mouseAdd.x,
        mouseAdd.y,
        1 + mouseAdd.z
      ), // 原点
      scrollRate
    );


    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.camera.matrixAutoUpdate = true;


    this.scene?.children.forEach((child, i) => {
      const material = (child as THREE.Mesh).material as MeshLineMaterial
      material.uTime = _time * 0.001
      const offset = (-scrollRate) * this.linesParam[i].offsetInit
        + this.linesParam[i].offsetInit

      material.dashOffset = clamp(lerp(
        material.dashOffset,
        offset,
        1
      ), 0, 2)
      material.scrollRate = scrollRate
      this.linesParamPrev[i] = material.dashOffset

    })

    // 深度テクスチャを生成
    this.scene?.children.forEach((child) => {
      const material = (child as THREE.Mesh).material as MeshLineMaterial
      material.depthTest = true;
    });
    this.renderer.setRenderTarget(this.depthRenderTarget);
    this.renderer.render(this.scene!, this.camera);
    this.renderer.setRenderTarget(null);

    this.scene?.children.forEach((child) => {
      const material = (child as THREE.Mesh).material as MeshLineMaterial
      material.depthTest = false;
    });
    // 被写界深度効果を含めてレンダリング
    this.effectComposer!.render();
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