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
import { snoise } from './const';
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
      uniform float uInitRate;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uStart;
      uniform float scrollRate;
      uniform float uEnd;
      uniform float uDistort;
      
      attribute vec3 aPrev;
      attribute vec3 aNext;
      attribute float aSide;
      attribute float aProgress;
      
      varying float vProgress;
      varying float vSide;
      varying float vShow;
      varying vec2 vUv;
      varying vec3 vPosition;
      
        ${snoise}


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

       vec3 convertPositions(vec3 pos) {

    vec3 holePos = vec3(-0.3 ,0.2,0.) * uInitRate;

  float diff1 = abs(uEnd-1.) * 3.;
  float diff2 = abs(uStart) * 2.;
  float diff = diff1 + diff2;
  //diff += scrollRate;
  
  float posDist = length(pos - holePos);
  float noise=snoise(vec2(uTime*(0.2   )+aProgress*(10.2)  ,uTime*0.2+aProgress*(10.2)  ));

  vec3 fromCenterNormal = normalize(pos);

  pos.xyz +=  ((1.-uInitRate) *10.*(1.-aProgress) + 2.*(1.-uEnd)  + 2.*(uStart)  )* fromCenterNormal*   uDistort* (2.*diff2+1.) * 1.*sin((diff*.1     )  *noise);
  pos.xyz *= uInitRate;
   // pos.xy += 2. * fromCenterNormal.xy *  smoothstep(1., 0., posDist );
  //pos.x +=uDistort* (2.*diff2+1.) * 1.*cos((diff*.1     )  *noise);
  return pos;
}

      
      void main() {
        // 表示範囲の計算
        float show = 0.0;
        
        
        if (aProgress >= uStart && aProgress < uEnd  && aProgress >0.005 ) {
          show = 1.0;
        }
        
        // マウスによる回転
        vec3 pos = position;
        pos = convertPositions(pos);
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
        vPosition = pos;
        vUv = vec2(aProgress, aSide); // progress(0-1), side(-1 to 1)
      }
    `;

// フラグメントシェーダー
const fragmentShaderSimple = `
      precision highp float;
      
      uniform vec3 uColor;
      uniform float uStart;
      uniform float uEnd;
      
      varying float vProgress;
      varying float vSide;
      varying float vShow;
      varying vec3 vPosition;

      
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


        vec3 color = uColor;

        
        color = vec3(1.0, 0.5, 0.0); // オレンジ色に設定
        color.r = vProgress;
        color.g = vPosition.x + 0.5;

        gl_FragColor = vec4(color, alpha);
      }
    `;
const fragmentShader = `
      precision highp float;
      
      uniform vec3 uColor;
      uniform float uStart;
      uniform float uEnd;
      uniform float uTime;
      uniform float uInitRate;
      
      varying float vProgress;
      varying float vSide;
      varying float vShow;
      varying vec3 vPosition;

        ${snoise}

        
  vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;
    
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c * 0.5;
    
    vec3 rgb;
    if (h < 1.0 / 6.0) {
        rgb = vec3(c, x, 0.0);
    } else if (h < 2.0 / 6.0) {
        rgb = vec3(x, c, 0.0);
    } else if (h < 3.0 / 6.0) {
        rgb = vec3(0.0, c, x);
    } else if (h < 4.0 / 6.0) {
        rgb = vec3(0.0, x, c);
    } else if (h < 5.0 / 6.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }
    
    return rgb + vec3(m);
}
    
        float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

      
        vec3 genColorRgb(float random) {

        vec2 vUV = vec2(vProgress, vSide);
    vec3 holePos = vec3(-0.3 ,0.2,0.) * uInitRate;
    float dist = distance(vPosition, holePos);
    vec3 holePos2 = vec3(1. ,0.,0.);
    float dist2 = distance(vPosition, holePos2);
    float distTarget = vPosition.x < 0. ? dist : dist2;

    float PI = 3.14159;
    float AnglefromHole = atan(  vPosition.x - holePos.x, vPosition.y - holePos.y) ;
    
    float noise = snoise(vec2(vProgress*20.,3.));
    float uTotalLength = 10.0;

    // 黄色の乗り方が変わった
    float posDist = distance(vPosition, holePos);
    float noiseTime = snoise(vec2(1., uTotalLength * -posDist*1. + uTime*0.3 + vProgress*1. ));
    
    float noise2 = snoise(vec2(vProgress*0.1,-3.));
    float noise3 = snoise(vec2(vProgress*100.,10.));
    float noise4 = rand(vec2( vUV.x*10. , vUV.y*10.+uTime*0.5 ));

    noise4 = (noise4 - 0.5) * 1.;


    float holeShadow =smoothstep(1. , 0.0, dist)  * .3  ;



    
    float diffX = abs(vPosition.x - holePos2.x);

    float holeShadow2 =  smoothstep(1. , 0.0, dist2 )  * 1. * smoothstep(-PI, PI, abs(AnglefromHole) );
    
    float holeShadow3 =  smoothstep(0.8 , 0.0,  diffX)  * 0.2 * abs(max(0., -vPosition.y));



    float lightVal2 =
    (vPosition.y) * 0.2 * (noise3*0.5 +0.5)
    - (vPosition.x) * 0.04
    
    + 0.35
    
    - max(0.,holeShadow)   
    - max(0.,holeShadow2)  
    - max(0.,holeShadow3);

    float colorVal = mix(
    0.24 - vPosition.y*0.12 + vPosition.x*0.05,
    0.58 - vPosition.y * (vPosition.y<0.?-0.1: -0.2) ,
    (noiseTime*0.5 + 0.5) );


    vec3 yellow = vec3(0.17+noise4*0.,1. ,0.8);


    vec3 hsl =  vec3(
    colorVal+noise4*0.,
    1. - colorVal*0.2, 
    clamp(lightVal2 + smoothstep(0.3, 0.7,colorVal)*0.5, 0.09, 0.99) );


    return hsl2rgb(

    mix(hsl, yellow, smoothstep(0.3, 0.1, colorVal) )
    
    
    );

}


      varying vec2 vUv; // 追加: セグメント内のUV座標
      
      void main() {
        // 表示範囲外は破棄
        if (vShow < 0.01) {
          discard;
        }
        
    vec3 holePos = vec3(-0.3 ,0.2,0.) * uInitRate;
    float dist = distance(vPosition, holePos);


        if (vUv.y<2.2 - dist*3. ) {
          discard;
        }

        float alpha = 1.0;
        // 進捗に応じたグラデーション
        // 
        
        
        alpha *= step(uStart, vProgress);
        //alpha *= step((vProgress)*100., 1.);

        // alpha*=smoothstep(0.,0.01,vProgress);

        vec3 color = uColor;

          color.rgb = genColorRgb(
    snoise(vec3(vProgress, vPosition.x, vPosition.y))
    );
        // color = vec3(1.0, 0.5, 0.0); // オレンジ色に設定
        // color.r = vProgress;
        // color.g = vPosition.x + 0.5;

        //color= vec3(1.0, .0, .0);
        gl_FragColor = vec4(color, alpha);
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

  baseCameraPos = new THREE.Vector3(
    -1.8, 0, 1.8
  );

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
          / window.innerWidth, 4)
    );

    this.scene = new THREE.Scene();


    this.gui = new GUI()


    this.camera.rotateX(-Math.PI / 10);
    this.camera.updateMatrix();
    this.camera.position.set(-2, 0, 1.4);
    this.camera.up.set(
      3.2, 0.2, 0
    )
    this.camera.updateMatrix();


    const axisHelper = new THREE.AxesHelper(5);
    //    this.scene.add(axisHelper);


    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);
  }




  // ローレンツ方程式を解く関数
  private solveLorenz(a: number = 10, b: number = 28, c: number = 8 / 3, i = 0): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    // 初期条件
    //let x = 0.1 + i * 0.01 * Math.random();
    const getRandom = () => {
      return (Math.random() - 0.5) * 20
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
    const dt = 0.005;
    const steps = 3000;

    const distances = []
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
      const dis = pos.length()
      /* if (dis > 1.7 && pos.x < 0) {
        distances.push(0);
        points.push(
          new THREE.Vector3(0, 0, 0)
        );
      } else {
      } */
      distances.push(dis);
      points.push(pos);

    }

    const hamkdashi = points.filter(el => {
      const dis = el.length()
      return (dis > 1.6 && el.x < 0)
      //|| dis > 2.1 && el.x > 0
    })

    const largeDistance = Math.max(...distances);


    //console.log('points[0].length:', points[0].length());
    if (hamkdashi.length > 0) {

      return this.solveLorenz(a, b, c, i + 1);
    }
    return points;
  }

  strech = (
    index: number,
    isAdd = false
  ) => {

    gsap.to(this.linesParam[index], {
      offsetInit: 1,
      //duration: 1,
      duration: isAdd ? 15 : 5,
      //delay: Math.random() * 1,
      ease: isAdd ? 'power2.out' : 'power4.inOut',
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

  createMeshLine = (i: number) => {
    const lorenzPoints = this.solveLorenz(7, 28, 8 / 3, i * 1);

    this.linesParam.push({
      offsetInit: 2,
      offsetScroll: 0,
    })

    //const spiralGeometry = createLineGeometry(catmullRomInterpolate(lorenzPoints, 5000));
    const spiralGeometry = createLineGeometry(lorenzPoints);
    const spiralMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWidth: { value: 0.3 + Math.random() * 0.6 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uColor: { value: new THREE.Color(0x00ffff) },
        uStart: { value: 0.0 },
        scrollRate: { value: 0.0 },
        uEnd: { value: 1.0 },
        uInitRate: { value: 0 },
        uDistort: { value: i === 0 ? 1 : 0.1 },
      },
      vertexShader,
      fragmentShader,
      //side: THREE.DoubleSide,
      /* transparent: true,
      depthWrite: true,
      depthTest: true, */
      transparent: true,
      depthWrite: true,
      depthTest: true,
      //blending: THREE.AdditiveBlending,
    });

    const spiralLine = new THREE.Mesh(spiralGeometry, spiralMaterial);


    this.trailMaterials.push(spiralMaterial);
    //    spiralLine.frustumCulled = false; // カリング無効化
    this.meshes.push(spiralLine);
    return spiralLine;


  }
  meshes: THREE.Mesh[] = [];
  addLine = () => {
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

  addObject = () => {

    for (var i = 0; i < 100; i++) {
      //if (i === 4) {
      const meshLine = this.createMeshLine(i);
      this.scene!.add(meshLine);
    }



    setTimeout(() => {



      setInterval(() => {
        this.addLine()
      }, 500);

      this.trailMaterials.forEach((material, index) => {
        this.strech(index)
      })


      gsap.to(this.initRate, {
        value: 1,
        duration: 5,
        ease: 'power3.out',
      })



    }, 1000);

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
    this.mouseLerp.x = lerp(this.mouseLerp.x, this.mouse.x, 0.05);
    this.mouseLerp.y = lerp(this.mouseLerp.y, this.mouse.y, 0.05);

    const mouseDistance = Math.sqrt(this.mouseLerp.x * this.mouseLerp.x + this.mouseLerp.y * this.mouseLerp.y);

    const speed = 1
    const sct = Math.min(window.scrollY, window.innerHeight * 2);
    const scrollRate = sct / (window.innerHeight * 1)
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
        this.baseCameraPos.x + 0.5 + mouseAdd.x,
        mouseAdd.y,
        1 + mouseAdd.z
      ), // 原点
      scrollRate
    );


    if (this.controls) {
      //this.controls.update();
    }



    //console.log('this.camera:', this.camera);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.camera.matrixAutoUpdate = true;


    this.scene?.children.forEach((child, i) => {
      const material = (child as THREE.Mesh).material as any
      material.uniforms.uTime.value = _time * 0.001

      const _offset = this.linesParam[i]?.offsetInit || 2
      const offset = this.initRate.value * (-scrollRate) * _offset
        + _offset
      //      console.log('offset:', offset);

      /* material.dashOffset = clamp(lerp(
        material.dashOffset,
        offset,
        1
      ), 0, 2) */
      const dashOffset = offset
      material.uniforms.uStart.value = scrollRate
      material.uniforms.uEnd.value = clamp(2 - dashOffset, 0, 1)
      //console.log('material.uniforms.uEnd.value:', material.uniforms.uEnd.value);

      material.uniforms.scrollRate.value = scrollRate;
      material.uniforms.uInitRate.value = this.initRate.value;


      //console.log('material.uniforms.uInitRate.value:', material.uniforms.uInitRate.value);
    })




    /* 
        this.trailMaterial.dashOffset = 1;
        if (this.trailMaterial.dashOffset > 1) {
        } */
    //this.trailMaterial.dashOffset += 1; // ダッシュのオフセットを更新して動きをつける

    this.renderer.render(this.scene!, this.camera);
  }

  initRate = {
    value: 0
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