import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import gsap from 'gsap';

interface DotData {
  positions: DOMPoint[];
}

export class Stage {
  viewport
    : {
      x: number
      y: number
    } = {
      x: 0,
      y: 0
    }
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

  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.canvasSize = this.getCanvasSize()
    this.camera = new THREE.PerspectiveCamera(75, this.canvasSize.width / this.canvasSize.height, 0.1, 100);
    this.camera.position.y = 0;
    this.camera.position.z = 5;
    this.viewport = this.getViewport();

    this.renderer = new THREE.WebGLRenderer(
      {
        alpha: true,
        antialias: true
      }
    );
    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        Math.min(4096
          / window.innerWidth, 3)
    );
    this.scene = new THREE.Scene();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
  }

  setPositionData = (
    circle1Svg: HTMLElement,
  ) => {
    const circlePathes = circle1Svg.querySelectorAll('path')
    let dotCount = 0

    let counts: number[] = []

    const lengthDotRate = 2
    circlePathes.forEach((path, _i) => {
      const length = path.getTotalLength()
      dotCount += Math.floor(length / lengthDotRate)
      counts.push(Math.floor(length / lengthDotRate))
    })
    const dotsData = counts.map((pathCount, index) => {
      const path = circlePathes[index]
      let positions = []
      for (let i = 0; i < pathCount; i++) {
        const length = path.getTotalLength()
        const position = path.getPointAtLength(
          length * (lengthDotRate * i / pathCount)
        )
        position.z = 0
        positions.push(position)
      }
      return {
        positions: positions,
      }
    })

    return { dotsData, dotCount }
  }

  dotsData: any[] = []

  setPosition = (
    from: DotData[],
    to: DotData[],
    progress: number,
    _time: number
  ) => {
    //const loop = (time % 1000) / 1000
    const flatTo = to.reduce<DOMPoint[]>((acc, cur, _index) => {
      const t = cur.positions
      acc = [...acc, ...t]
      return acc
    }, [])

    const flatFrom = from.reduce<DOMPoint[]>((acc, cur, _index) => {
      const t = cur.positions
      acc = [...acc, ...t]
      return acc
    }, [])

    for (let i = 0; i < Math.max(flatTo.length, flatFrom.length); i++) {
      const goal = {
        x: 0,
        y: 0,
        z: 0
      }
      const fromPositionCurrent = flatFrom[i] ?? { x: 0, y: 0, z: 0 }
      //const fromNextPosition = flatFrom[i + 1] ?? { x: 0, y: 0, z: 0 }
      const toPositionCurrent = flatTo[i] ?? { x: 0, y: 0, z: 0 }
      //const toNextPosition = flatTo[i + 1] ?? { x: 0, y: 0, z: 0 }

      // loopに応じて補完
      /*     const fromPosition = {
            x: fromPositionCurrent.x + (fromNextPosition.x - fromPositionCurrent.x) * loop,
            y: fromPositionCurrent.y + (fromNextPosition.y - fromPositionCurrent.y) * loop,
            z: fromPositionCurrent.z + (fromNextPosition.z - fromPositionCurrent.z) * loop,
          }
          const toPosition = {
            x: toPositionCurrent.x + (toNextPosition.x - toPositionCurrent.x) * loop,
            y: toPositionCurrent.y + (toNextPosition.y - toPositionCurrent.y) * loop,
            z: toPositionCurrent.z + (toNextPosition.z - toPositionCurrent.z) * loop,
          } */


      const x = fromPositionCurrent.x + (toPositionCurrent.x - fromPositionCurrent.x) * progress
      const y = fromPositionCurrent.y + (toPositionCurrent.y - fromPositionCurrent.y) * progress
      const z = fromPositionCurrent.z + (toPositionCurrent.z - fromPositionCurrent.z) * progress
      goal.x = x
      goal.y = y
      goal.z = z

      const convert = this.convertPoints(goal)
      this.positions[i] = new DOMPoint(convert.x, convert.y, convert.z)
      this.InstancedMesh.instanceMatrix.needsUpdate = true;
    }
  }
  convertPoints = (
    point: {
      x: number
      y: number,
      z: number
    }
  ) => {
    return {
      x: point.x / 70 - 3,
      y: -(point.y / 70 - 3),
      z: point.z
    }
  }
  reverseConvertPoints = (point: {
    x: number
    y: number,
    z: number
  }) => {
    return {
      x: (point.x + 3) * 70,
      y: (point.y + 3) * 70,
      z: point.z
    }
  }
  InstancedMesh!: THREE.InstancedMesh

  getRandomPOsi = (
    maxDotCount: number
  ) => {
    let random = [
      {
        positions: []
      }
    ] as DotData[]

    console.log('1:', 1);
    for (var i = 0; i < maxDotCount; i++) {

      const revConv = this.reverseConvertPoints({
        x: Math.random() * 5 - 2.5,
        y: Math.random() * 5 - 2.5,
        z: Math.random() * 5 - 2.55
      })
      random[0].positions.push(
        new DOMPoint(revConv.x, revConv.y, revConv.z)
      )
    }
    return random
  }
  positions: DOMPoint[] = []
  addObject = () => {
    const circle1Svg = document.querySelector('#circle1') as HTMLElement
    const circle1Svg2 = document.querySelector('#circle2') as HTMLElement
    const { dotsData, dotCount } = this.setPositionData(circle1Svg)
    const { dotsData: dotsData2, dotCount: dotCount2 } = this.setPositionData(circle1Svg2)

    this.dotsData = [dotsData, dotsData2]
    const maxDotCount = Math.max(dotCount, dotCount2)
    let zeroData = [
      {
        positions: []
      }
    ] as DotData[]

    const rand = this.getRandomPOsi(maxDotCount)
    this.dotsData.push(rand)

    console.log('1:', 1);
    for (var i = 0; i < maxDotCount; i++) {
      this.positions.push(new DOMPoint(0, 0, 0))
      const shukai = (i / maxDotCount) * 3
      const rate = i / maxDotCount
      const revConv = this.reverseConvertPoints({
        x: shukai * Math.sin(
          rate * 5 * Math.PI * 2,
        ),
        y: shukai * Math.cos(
          rate * 5 * Math.PI * 2,
        ),
        z: 0
      })
      zeroData[0].positions.push(
        new DOMPoint(revConv.x, revConv.y, 0)
      )
    }
    console.log('2:', 2);


    const geometory = new THREE.PlaneGeometry(0.055, 0.055, 1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);

      }
      `,
      fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        //円
        vec2 st = vUv;
        st -= 0.5;
        float pct = length(st);
        if(pct < 0.5){
          gl_FragColor = vec4(vec3(0.),1.0);
        }
        else{
          discard;
    }

      }
      `,
      uniforms: {
        uTime: { value: 0.0 },
      }
    })
    this.InstancedMesh = new THREE.InstancedMesh(geometory, material, maxDotCount);



    /* const pro = {
      val: 0
    } */



    this.InstancedMesh.instanceMatrix.needsUpdate = true;
    this.scene!.add(
      this.InstancedMesh
    );

    this.animateTo(
      0
    )
  }

  animateTo = (
    index: number
  ) => {
    const pro = { val: 0 }
    const from = index === 0 ? this.dotsData[0] : this.dotsData[1]
    const to = index === 1 ? this.dotsData[0] : this.dotsData[1]
    const rand = this.dotsData[2]
    gsap.to(pro, {
      val: 1,
      duration: 2,
      ease: "power4.out",
      onUpdate: () => {
        this.setPosition(from, rand, pro.val, 0)
      },
      onComplete: () => {
        pro.val = 0
        gsap.to(pro, {
          val: 1,
          duration: 2,
          ease: "power4.out",
          onUpdate: () => {
            this.setPosition(rand, to, pro.val, 0)
          },
          onComplete: () => {
            setTimeout(() => {
              this.animateTo(index === 0 ? 1 : 0)
            }, 1000);
          }
        })
      }
    })
  }


  getViewport() {
    const x = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z * this.camera.aspect;
    const y = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z;
    return {
      x, y
    }
  }
  canvasSize = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  getCanvasSize = () => {
    const height = getVh(100)
    const width = window.innerWidth
    return {
      height
      , width
    }
  }

  private onWindowResize(): void {
    this.canvasSize = this.getCanvasSize()
    this.camera.aspect = this.canvasSize.width / this.canvasSize.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.viewport = this.getViewport();
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  }
  prevTime = 0
  private render(time: number): void {

    /* 
        const _time = this.prevTime % 3000
        const set = Math.floor(time / 3000) % 3
        console.log('set:', set);
        if (set === 0) {
          this.setPosition(this.dotsData[0], this.dotsData[1], _time / 3000, time)
        } else if (set === 1) {
          this.setPosition(this.dotsData[1], this.dotsData[2], _time / 3000, time)
        } else {
          this.setPosition(this.dotsData[2], this.dotsData[0], _time / 3000, time)
        } */

    for (let i = 0; i < this.positions.length; i++) {
      this.InstancedMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(
        this.positions[i].x, this.positions[i].y
        ,
        this.positions[i].z))
      this.InstancedMesh.instanceMatrix.needsUpdate = true;
    }

    this.renderer.render(this.scene!, this.camera)
    this.prevTime = time
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

