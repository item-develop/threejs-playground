import { MeshLine } from 'three.meshline' // 一時的にコメントアウト
import * as THREE from 'three';
import { EffectComposer, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import baseFrag from '../glsl/flame.frag?raw'
import baseVert from '../glsl/base.vert?raw'
import { MeshLineMaterial } from './CustomMeshLineMaterial';
import { depth } from 'three/tsl';
import { GUI } from 'lil-gui'
import { lerp } from 'three/src/math/MathUtils.js';
import gsap from 'gsap';


const roundNum = (num: number, decimalPlaces: number = 4): number => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(num * factor) / factor;
}
// 添付画像のような密な8の字スパイラルを生成
let valLog: number[] = []
export function generateDenseSpiral8(
  iterations: number = 10000,  // 多めの反復で密度を確保
  initialValue: number = 0.1
): THREE.Vector3[] {
  let points: THREE.Vector3[] = [];

  let currentVal = initialValue
  for (var i = 0; i < iterations; i++) {
    const perCircle = 10
    if (i % perCircle === 0) {
      currentVal = currentVal * 2 > 1 ? currentVal * 2 - 1 : currentVal * 2

      if (valLog.includes(roundNum(currentVal, 4))) {
        i = iterations;
        if (points.length < 2) {
          const _lastPoint = points[points.length - 1] ?? new THREE.Vector3(0, 0, 0);


          points.push(
            new THREE.Vector3(
              _lastPoint.x + 0.0001 + Math.random() * 0.01,
              _lastPoint.y + 0.0001 + Math.random() * 0.01,
              _lastPoint.z + 0.0001 + Math.random() * 0.01,
            )

          );
          points.push(
            new THREE.Vector3(
              _lastPoint.x + 0.0001 + Math.random() * 0.01,
              _lastPoint.y + 0.0001 + Math.random() * 0.01,
              _lastPoint.z + 0.0001 + Math.random() * 0.01,
            )

          );
          console.log('points:', points);
        }

        break;
      }


      valLog.push(roundNum(currentVal, 4))
    }




    const rate = (i % perCircle) / perCircle

    const minRadius = 0.15


    const nextVal = currentVal * 2 > 1 ? currentVal * 2 - 1 : currentVal * 2


    const isLeft = currentVal < 0.5

    const isNextRight = nextVal > 0.5
    const isNextLeft = nextVal < 0.5

    const radius = isLeft ? lerp(minRadius + currentVal, minRadius + nextVal, rate) :
      lerp(minRadius + (1 - currentVal), minRadius + (1 - nextVal), rate)



    const circleCenter = 0.5 + minRadius

    const angle = rate * (Math.PI * 2) * (isLeft ? 1 : -1) + (!isLeft ? Math.PI : 0)
    const x = Math.cos(
      angle
    ) * radius + (isLeft ? -circleCenter : circleCenter)

    const y = Math.sin(angle) * radius

    const center = isLeft ? -circleCenter : circleCenter
    const distanceFromCenter = Math.sqrt((x - center) * (x - center) + y * y)
    const z = 0.1 * (isLeft ? 1 : 1.2) * x * x + (y > 0 ? !isLeft ? -0 : .5 : 0.1) * y * y

      + (isLeft ? (2 * y + 0.4) * (2 * y + 0.4) * 0.05 : -(y + 1) * (y + 1) * 0.1)


    console.log('isNextRight:', isNextRight);
    const nextEdge = 0.15
    const isNextZ = isNextRight ?
      Math.sin(Math.min(2 * Math.PI * 3 / 4, (i % perCircle) / perCircle * 2 * Math.PI)) * nextEdge
      : Math.sin((i % perCircle) / perCircle * 2 * Math.PI) * nextEdge
    const isRightZ = isNextLeft ?
      -Math.sin(Math.min(2 * Math.PI * 3 / 4, (i % perCircle) / perCircle * 2 * Math.PI)) * nextEdge
      : -Math.sin((i % perCircle) / perCircle * 2 * Math.PI) * nextEdge
    console.log('isNextZ:', isNextZ);



    points.push(new THREE.Vector3(
      x * (isLeft ? 1.1 : 1)
      , y, z + 0.6 + 0.01 * initialValue + (isLeft ? isNextZ * y : -nextEdge)
    ));


  }
  //  console.log('points:', points);

  return points;
}



// 使用例とテスト用の設定
export function getOptimalParameters() {
  return {
    iterations: 50000,      // 非常に多くの点で密度を確保
    scale: 10,             // 適切なスケール
    initialValue: 0.1,     // 初期値
    lineWidth: 0.01,       // MeshLine用の線の太さ
    opacity: 0.8,          // 半透明で重なりを表現
  };
}

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
  baseCameraPos = new THREE.Vector3(
    -2, 0, 1.4
  );
  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera = new THREE.PerspectiveCamera(75, this.getCanvasSize().width / this.getCanvasSize().height, 0.1, 10);

    this.camera.position.set(-2, 0, 1.4);
    this.camera.up.set(
      3.2, 0.2, 0
    )

    this.camera.rotateX(-Math.PI / 10);
    this.camera.updateMatrix();
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
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);

    const axisHelper = new THREE.AxesHelper(5);
    //this.scene.add(axisHelper);
  }


  getViewport() {
    const distance = this.camera.position.z;
    const vFov = this.camera.fov * Math.PI / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.camera.aspect;
    return { width, height };
  }


  trailMaterials: MeshLineMaterial[] = [];
  lines: number[] = [];
  linesParam: { offsetInit: number; offsetScroll: number }[] = [];
  linesParamPrev: number[] = []
  createMeshLine = (initial: number) => {
    let points = generateDenseSpiral8(200, initial);
    if (points.length > 300) {
      //console.log('points.length:', points.length);
      //points = points.slice(100 * Math.random(), points.length);
      //console.log('points.length2:', points.length);
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const length = curve.getLength();
    this.lines.push(length);

    this.linesParam.push({
      offsetInit: 2,
      offsetScroll: 0,
    })

    let cP = curve.getSpacedPoints(length * 100); // 点の密度を調整
    const geometry = new THREE.BufferGeometry().setFromPoints(cP);

    const line = new MeshLine();
    line.setGeometry(geometry);

    const viewport = this.getViewport();

    const trailMaterial = new MeshLineMaterial({
      color: new THREE.Color('#0ff'), // 鮮やかなピンクに変更
      opacity: 1,
      lineWidth: 0.004,
      resolution: new THREE.Vector2(viewport.width, viewport.height),
      useDash: 1,
      dashArray: 2,
      dashOffset: 1,
      dashRatio: 0.5,
      transparent: true,
      depthWrite: false,
      uTotalLength: length,
      //blending: THREE.NormalBlending
    } as any);


    const _line = new THREE.Mesh(line.geometry, trailMaterial);

    this.trailMaterials.push(trailMaterial);

    return _line;
  }

  effectComposer: EffectComposer | null = null;
  addObject = () => {
    const loop = 90
    for (var i = 0; i < loop; i++) {
      const initial = (((i + 0.0001) / loop) * 0.3234 + 0.2) % 1
      console.log('initial:', initial);
      const meshLine = this.createMeshLine(
        initial
      );
      this.scene!.add(meshLine);
    }

    const strech = (

      index: number
    ) => {
      gsap.to(this.linesParam[index], {
        offsetInit: 1,
        //duration: 1,
        duration: 3,
        //delay: Math.random() * 0,
        ease: 'power4.in',
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
    this.trailMaterials.forEach((material, index) => {
      setTimeout(() => {
        strech(index)
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
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();

  }

  private render(_time: number): void {
    // カメラをゆっくり回転させてアトラクターを様々な角度から見せる
    if (this.controls) {
      this.controls.update();
    }

    this.mouseLerp.x = lerp(this.mouseLerp.x, this.mouse.x, 0.05);
    this.mouseLerp.y = lerp(this.mouseLerp.y, this.mouse.y, 0.05);

    const mouseDistance = Math.sqrt(this.mouseLerp.x * this.mouseLerp.x + this.mouseLerp.y * this.mouseLerp.y);

    const speed = 1
    const sct = Math.min(window.scrollY, window.innerHeight);
    const scrollRate = sct / window.innerHeight
    this.camera.position.set(
      this.baseCameraPos.x + 0.2 + Math.sin(speed * _time * 0.0005) * 0.1 + this.mouseLerp.y * 0.1,
      this.baseCameraPos.y - 0 + Math.cos(speed * _time * 0.001) * 0.15 + this.mouseLerp.x * 0.1,
      this.baseCameraPos.z + Math.cos(speed * _time * 0.0003) * 0.1 + 0.1 + mouseDistance * 0.1
    );

    this.camera.position.lerpVectors(
      this.camera.position,
      new THREE.Vector3(this.baseCameraPos.x + 0.8, 0, 1.2), // 原点
      scrollRate
    );


    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.camera.matrixAutoUpdate = true;


    this.trailMaterials.forEach((material, i) => {
      material.uTime = _time * 0.001
      const offset = -sct / window.innerHeight + this.linesParam[i].offsetInit
      material.dashOffset = lerp(
        this.linesParamPrev[i] || 2,
        offset,
        0.1
      )
      console.log('material.dashOffset:', material.dashOffset);
      this.linesParamPrev[i] = material.dashOffset
    })

    /* this.trailMaterials.forEach((material) => {
      if (material.dashOffset > 1) {
        material.dashOffset = 0
      }
      material.dashOffset += 0.003; // ダッシュのオフセットを更新して動きをつける
    }) */
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