import { MeshLine } from 'three.meshline' // 一時的にコメントアウト
import * as THREE from 'three';
import { EffectComposer, OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh, lerp } from '../Common/utils';
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

// ダブリングマップ（テープの接合）によるカオス軌道生成
export function generateDoublingMapTrajectory(
  initialValue: number = 0.1,
  steps: number = 1000,
  dimensions: number = 3
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  let x = initialValue;

  // 履歴を保持して高次元埋め込みを行う
  const history: number[] = [];

  for (let i = 0; i < steps + dimensions; i++) {
    // ダブリングマップの適用
    x = x * 2;
    if (x >= 1.0) {
      x = x - 1.0;
    }

    history.push(x);

    // 十分な履歴が貯まったら3次元座標を生成
    if (history.length >= dimensions) {
      // 時間遅れ埋め込み（Takens embedding）
      const point = new THREE.Vector3(
        history[history.length - 3] * 2 - 1,  // x: [-1, 1]にスケール
        history[history.length - 2] * 2 - 1,  // y: [-1, 1]にスケール
        history[history.length - 1] * 2 - 1   // z: [-1, 1]にスケール
      );

      points.push(point);
    }
  }

  return points;
}




export class Stage {
  private container!: HTMLDivElement;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;
  scene: THREE.Scene | null = null;
  linesParam: { offsetInit: number; offsetScroll: number }[] = [];

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('resize', () => this.onWindowResize(), false);
    window.addEventListener('mousemove', (event) => this.mousemove(event), false);

    this.init();
    this.addObject();
    window.requestAnimationFrame(this.animate);
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
  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera = new THREE.PerspectiveCamera(75, this.getCanvasSize().width / this.getCanvasSize().height, .1, 100);


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
    //    this.scene!.background = new THREE.Color(0xffffff);
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

  // ローレンツ方程式を解く関数
  private solveLorenz(a: number = 10, b: number = 28, c: number = 8 / 3, i = 0): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    // 初期条件
    //let x = 0.1 + i * 0.01 * Math.random();
    const getRandom = () => {
      return (Math.random() - 0.5) * 10
    }
    /* let x = getRandom() - 0
    let y = getRandom() - 30;
    let z = 20; */
    /* let x = getRandom() + 30;
    let y = getRandom() + 15;
    let z = getRandom() + 30; */
    let x = getRandom() - 3;
    let y = getRandom() + 5;
    let z = getRandom() + 30;


    // 時間刻み幅と計算ステップ数
    const dt = 0.02;
    const steps = 1000;

    // ルンゲ・クッタ法（4次）で数値積分
    for (let i = 0; i < steps; i++) {

      // k1
      const k1x = a * (y - x);
      const k1y = x * (b - z) - y;
      const k1z = x * y - c * z;

      // k2
      const x2 = x + k1x * dt / 2;
      const y2 = y + k1y * dt / 2;
      const z2 = z + k1z * dt / 2;
      const k2x = a * (y2 - x2);
      const k2y = x2 * (b - z2) - y2;
      const k2z = x2 * y2 - c * z2;

      // k3
      const x3 = x + k2x * dt / 2;
      const y3 = y + k2y * dt / 2;
      const z3 = z + k2z * dt / 2;
      const k3x = a * (y3 - x3);
      const k3y = x3 * (b - z3) - y3;
      const k3z = x3 * y3 - c * z3;

      // k4
      const x4 = x + k3x * dt;
      const y4 = y + k3y * dt;
      const z4 = z + k3z * dt;
      const k4x = a * (y4 - x4);
      const k4y = x4 * (b - z4) - y4;
      const k4z = x4 * y4 - c * z4;

      // 更新
      x += (k1x + 2 * k2x + 2 * k3x + k4x) * dt / 6;
      y += (k1y + 2 * k2y + 2 * k3y + k4y) * dt / 6;
      z += (k1z + 2 * k2z + 2 * k3z + k4z) * dt / 6;

      // スケーリングして3D空間に配置（見やすいサイズに調整）

      const scale = 0.067;
      const pos = new THREE.Vector3(y * scale - 0.5, x * - scale + -0.1, -z * scale + 1.9)
      // 
      // X軸のベクトル
      const axis = new THREE.Vector3(1, 0, 0);
      const angle = Math.PI / 2; // 45度
      pos.applyAxisAngle(axis, angle);
      const axis2 = new THREE.Vector3(0, 1, 0);
      const angle2 = Math.PI / 1.16; // 45度
      pos.applyAxisAngle(axis2, angle2);
      //pos.x += pos.x > 0 ? pos.x * 0.5 : 0;
      //pos.z += pos.x > 0 ? pos.x * 0.2 : 0;
      points.push(pos);
    }

    //console.log('points[0].length:', points[0].length());
    return points;
  }

  trailMaterials: MeshLineMaterial[] = [];
  createMeshLine = (i: number) => {
    const lorenzPoints = this.solveLorenz(7, 28, 8 / 3, i * 1);

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
      transparent: true,
      depthWrite: false,
      uTotalLength: length,
      //blending: THREE.SubtractiveBlending,
    } as any);

    const _line = new THREE.Mesh(line.geometry, meshline);
    this.trailMaterials.push(meshline);
    this.meshes.push(_line);
    return _line;
  }

  effectComposer: EffectComposer | null = null;
  addLine = () => {
    const dashes = this.linesParam.map(material => material.offsetInit);
    /* if (!dashes.some(offset => offset === 1)) {
      return;
    } */

    const meshLine = this.createMeshLine(0);
    this.scene!.add(meshLine);
    this.strech(this.trailMaterials.length - 1, true);

    this.removeLine();
  }

  removingIndexs: number[] = []

  removeLine = () => {
    console.log('this.scene?.children.length:', this.scene?.children.length);
    console.log('this.linesParam.map(param => param.offsetInit):', this.linesParam.map(param => param.offsetInit));
    const randomIndex = getRandomIndexOfOne(this.linesParam.map(param => param.offsetInit));
    console.log('randomIndex:', randomIndex);
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
        const currentRemoveIndex = this.meshes.map(mesh=>mesh.id).indexOf(removeMesh.id);
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

    setInterval(() => {
      this.addLine()
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


    this.renderer.render(this.scene!, this.camera);
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