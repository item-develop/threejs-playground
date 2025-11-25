import { MeshLine } from 'three.meshline' // 一時的にコメントアウト
import * as THREE from 'three';
import { EffectComposer, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getIsDark, getVh, lerp } from '../Common/utils';
import baseFrag from '../glsl/flame.frag?raw'
import baseVert from '../glsl/base.vert?raw'
import { MeshLineMaterial } from './CustomMeshLineMaterial';
import { depth } from 'three/tsl';
import { GUI } from 'lil-gui'
import gsap from 'gsap';

export function catmullRomInterpolate(
  controlPoints: THREE.Vector3[],
  numSegments: number
): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  const n = controlPoints.length;

  // セグメント数に基づいて補間点を生成
  for (let i = 0; i < numSegments; i++) {
    // 0.0 ~ (n-1) の範囲でパラメータtを計算
    const t = i / (numSegments - 1) * (n - 1);
    const p = Math.floor(t);  // 現在のセグメントインデックス
    const u = t - p;          // セグメント内の位置 (0.0 ~ 1.0)

    // 4つの制御点を取得（端点では同じ点を使う）
    const p0 = controlPoints[Math.max(0, p - 1)];
    const p1 = controlPoints[p];
    const p2 = controlPoints[Math.min(n - 1, p + 1)];
    const p3 = controlPoints[Math.min(n - 1, p + 2)];

    // Catmull-Rom公式の係数
    const u2 = u * u;
    const u3 = u2 * u;

    // X, Y, Z 各成分を補間
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * u +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3
    );

    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * u +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3
    );

    const z = 0.5 * (
      (2 * p1.z) +
      (-p0.z + p2.z) * u +
      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * u2 +
      (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * u3
    );

    result.push(new THREE.Vector3(x, y, z));
  }

  return result;
}



// 頂点シェーダー
const vertexShader = `
      precision highp float;
      
      uniform float uTime;
      uniform float uWidth;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uStart;
      uniform float uEnd;
      
      attribute vec3 aPrev;
      attribute vec3 aNext;
      attribute float aSide;
      attribute float aProgress;
      
      varying float vProgress;
      varying float vSide;
      varying float vShow;
      varying vec2 vUv;
      
      mat3 rotateY(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat3(
          c, 0.0, s,
          0.0, 1.0, 0.0,
          -s, 0.0, c
        );
      }
      
      mat3 rotateX(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat3(
          1.0, 0.0, 0.0,
          0.0, c, -s,
          0.0, s, c
        );
      }
      
      void main() {
        // 表示範囲の計算
        float show = 0.0;
        float fadeWidth = 0.05; // フェードの幅
        
        if (aProgress >= uStart && aProgress <= uEnd) {
          show = 1.0;
        }
        
        // マウスによる回転
        vec3 pos = position;
        vec3 prev = aPrev;
        vec3 next = aNext;
        
        pos = rotateY(uMouse.x) * pos;
        pos = rotateX(uMouse.y) * pos;
        prev = rotateY(uMouse.x) * prev;
        prev = rotateX(uMouse.y) * prev;
        next = rotateY(uMouse.x) * next;
        next = rotateX(uMouse.y) * next;
        
        // ビュー・プロジェクション変換
        vec4 currMV = modelViewMatrix * vec4(pos, 1.0);
        vec4 prevMV = modelViewMatrix * vec4(prev, 1.0);
        vec4 nextMV = modelViewMatrix * vec4(next, 1.0);
        
        vec4 clipCurr = projectionMatrix * currMV;
        vec4 clipPrev = projectionMatrix * prevMV;
        vec4 clipNext = projectionMatrix * nextMV;
        
        // NDC空間に変換
        vec2 ndcCurr = clipCurr.xy / clipCurr.w;
        vec2 ndcPrev = clipPrev.xy / clipPrev.w;
        vec2 ndcNext = clipNext.xy / clipNext.w;
        
        // 線の方向を計算
        vec2 dir = normalize(ndcNext - ndcPrev);
        if (length(ndcNext - ndcPrev) < 0.0001) {
          dir = vec2(1.0, 0.0);
        }
        
        // 垂直方向のオフセット（ビルボード）
        vec2 normal = vec2(-dir.y, dir.x);
        
        // ピクセル単位でのオフセット（表示状態に応じて幅を調整）
        vec2 ndcPerPixel = 2.0 / uResolution;
        vec2 offset = normal * aSide * uWidth * show * ndcPerPixel;
        
        vec4 finalPos = clipCurr;
        finalPos.xy += offset * clipCurr.w;
        
        gl_Position = finalPos;
        
        vProgress = aProgress;
        vSide = aSide;
        vShow = show;
        vUv = vec2(aProgress, aSide); // progress(0-1), side(-1 to 1)
      }
    `;

// フラグメントシェーダー
const fragmentShader = `
      precision highp float;
      
      uniform vec3 uColor;
      uniform float uStart;
      uniform float uEnd;
      
      varying float vProgress;
      varying float vSide;
      varying float vShow;
      
      varying vec2 vUv; // 追加: セグメント内のUV座標
      
      void main() {
        // 表示範囲外は破棄
        if (vShow < 0.01) {
          discard;
        }
        
        // 先端を丸くする処理
        float fadeWidth = 0.03;
        float alpha = 1.0;
        

        
        // 進捗に応じたグラデーション
        alpha *= step(uStart, vProgress);
        alpha *= smoothstep(uEnd, uEnd - fadeWidth, vProgress);
        gl_FragColor = vec4(uColor, alpha);
      }
    `;


// ラインジオメトリを作成する関数
// ラインジオメトリを作成する関数
function createLineGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
  const positions = [];
  const prevPositions = [];
  const nextPositions = [];
  const sides = [];
  const progress = [];
  const indices = [];

  const numPoints = points.length;

  for (let i = 0; i < numPoints; i++) {
    const curr = points[i];
    const prev = i > 0 ? points[i - 1] : points[i];
    const next = i < numPoints - 1 ? points[i + 1] : points[i];

    const prog = i / (numPoints - 1);

    // 各点から2つの頂点を作成（両側）
    for (let side = 0; side < 2; side++) {
      positions.push(curr.x, curr.y, curr.z);
      prevPositions.push(prev.x, prev.y, prev.z);
      nextPositions.push(next.x, next.y, next.z);
      sides.push(side === 0 ? 1 : -1);
      progress.push(prog);
    }

    // インデックス（四角形を2つの三角形に）
    if (i < numPoints - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 2, base + 1, base + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aPrev', new THREE.Float32BufferAttribute(prevPositions, 3));
  geometry.setAttribute('aNext', new THREE.Float32BufferAttribute(nextPositions, 3));
  geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));
  geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progress, 1));
  geometry.setIndex(indices);

  return geometry;
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
  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera = new THREE.PerspectiveCamera(75, this.getCanvasSize().width / this.getCanvasSize().height, 0.1, 100);


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
    this.camera.position.set(0, 0, 5);
    this.camera.updateMatrix();

    const axisHelper = new THREE.AxesHelper(5);
    //this.scene.add(axisHelper);


    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);
  }

  strech = (
    index: number
  ) => {
    gsap.to(this.linesParam[index], {
      offsetInit: 1,
      //duration: 1,
      duration: 5,
      //delay: Math.random() * 0,
      ease: 'power3.inOut',
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


  trailMaterials: THREE.Material[] = [];

  effectComposer: EffectComposer | null = null;

  addObject = () => {



    // 1. シンプルなスパイラル
    const spiralPoints = [];
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const angle = t * Math.PI * 3;
      const radius = t * 1.5;
      spiralPoints.push(new THREE.Vector3(
        Math.cos(angle) * radius - 1.5,
        Math.sin(angle) * radius,
        0
      ));
    }

    const spiralGeometry = createLineGeometry(catmullRomInterpolate(spiralPoints, 10));
    this.spiralMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWidth: { value: 8 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uColor: { value: new THREE.Color(0x00ffff) },
        uStart: { value: 0.0 },
        uEnd: { value: 1.0 }
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide
    });

    const spiralLine = new THREE.Mesh(spiralGeometry, this.spiralMaterial);
    this.scene!.add(spiralLine);


  }



  spiralMaterial!: THREE.ShaderMaterial;
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

    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
  }


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

    if (this.controls) {
      //this.controls.update();
    }



    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.camera.matrixAutoUpdate = true;




    this.spiralMaterial.uniforms.uEnd.value = _time * 0.0003 % 1.0;
    console.log('this.spiralMaterial.uniforms.uEnd.value:', this.spiralMaterial.uniforms.uEnd.value);
    /* 
        this.trailMaterial.dashOffset = 1;
        if (this.trailMaterial.dashOffset > 1) {
        } */
    //this.trailMaterial.dashOffset += 1; // ダッシュのオフセットを更新して動きをつける

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