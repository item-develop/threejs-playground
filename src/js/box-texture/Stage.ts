import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import gsap from 'gsap';

const getRandom = (max: number, min: number) => {
  return Math.random() * (max - min) + min
}
const randomAnimate = (rotation: {
  y: number
}) => {
  const max = Math.PI / 2
  const gotoRotate = getRandom(max * 0.9, max * 0.1)
  const current = rotation.y
  const diff = gotoRotate - current
  const duration = Math.abs(diff) * 2
  gsap.to(rotation, {
    y: gotoRotate,
    duration: duration,
    ease: "linear",
    onComplete: () => {
      randomAnimate(
        rotation
      )
    }
  })
}

const COUNT = 7
const atsumi = 0.34
const boxWidth = 2.2

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

    for (var i = 0; i < 7; i++) {
      this.boxRotateGsap.push({
        rotation:
          { y: Math.PI / 4 }
      }
      )
    }


    this.boxRotateGsap.forEach((_box,) => {
      randomAnimate(
        _box.rotation
      )
    })
    window.requestAnimationFrame(this.animate);
  }



  raycastPlane!: THREE.Mesh;
  pointer: THREE.Vector2 = new THREE.Vector2();
  dummy!: THREE.Mesh;

  raycaster!: THREE.Raycaster

  isWheeling = false
  timer: any = 0
  private init(): void {
    this.raycaster = new THREE.Raycaster();

    window.addEventListener('mousemove', (e) => {
      this.pointer.x = (e.clientX / this.canvasSize.width) * 2 - 1;

      //console.log('this.pointer.x:', this.pointer.x);
      this.pointer.y = -(e.clientY / this.canvasSize.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
    }
    )

    window.addEventListener('wheel', (e) => {
      this.isWheeling = true
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.isWheeling = false
      }, 1000);
      this.wheelTotalY = clamp(this.wheelTotalY + e.deltaY * 1, -400, 400)
      //console.log('this.wheelTotalY:', this.wheelTotalY);
    })
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.canvasSize = this.getCanvasSize()
    const canvasRate = this.canvasSize.width / this.canvasSize.height
    this.camera = new THREE.OrthographicCamera(
      -3,
      3,
      3 / canvasRate,
      -3 / canvasRate,
    )


    this.camera.position.y = 0;
    this.camera.position.z = 60;
    this.viewport = this.getViewport();

    this.renderer = new THREE.WebGLRenderer(
      {
        alpha: true,
        antialias: false,
      }
    );
    // color rgb


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


    const blacktexture = new THREE.TextureLoader().load('/media_black.png')
    const bluetexture = new THREE.TextureLoader().load('/media_blue.png')

    blacktexture.colorSpace = "srgb";
    bluetexture.colorSpace = "srgb";



    this.boxMaterial = [
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }) // right
      , new THREE.MeshBasicMaterial({
        map: blacktexture

      })// left
      , new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }) // top
      , new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }) // bottom
      , new THREE.MeshBasicMaterial({ transparent: true, map: bluetexture }) // front
      , new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }) // back
    ]
  }

  boxGeometory!: THREE.BoxGeometry
  addObject = () => {
    console.log('123:', 123);
    this.boxMeshes.forEach((box, _i) => {
      if (this.scene) {
        this.scene.remove(box)
      }
    })


    console.log('this.scene!.children:', this.scene!.children);
    this.boxMeshes = []

    this.boxGeometory = new THREE.BoxGeometry(boxWidth, atsumi, boxWidth);
    for (var i = 0; i < 7; i++) {
      const box = new THREE.Mesh(this.boxGeometory, this.boxMaterial);
      box.position.y = (-(Math.floor(COUNT / 2)) + i) * atsumi;
      this.boxMeshes.push(box)
      this.scene!.add(box);
    }
  }

  boxMeshes: THREE.Mesh[] = []


  getViewport() {
    const x = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z;
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

    this.boxGeometory.dispose()
    this.canvasSize = this.getCanvasSize()

    const canvasRate = this.canvasSize.width / this.canvasSize.height
    this.camera.left = -3
    this.camera.right = 3
    this.camera.top = 3 / canvasRate
    this.camera.bottom = -3 / canvasRate

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.viewport = this.getViewport();

    if (this.scene) {
      this.scene!.children = []
    }

    this.addObject();
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  }

  cameraY = 0
  wheelTotalY = 0
  boxRotatesMouse: number[] = []
  boxMaterial: THREE.Material[] = []
  boxRotateGsap: { rotation: { y: number } }[] = []
  private render(time: number): void {

    const canvasRate = this.canvasSize.width / this.canvasSize.height
    this.boxMeshes.forEach((box, i) => {
      const distanceY = Math.abs(this.pointer.y * 3 / canvasRate - box.position.y)
      const xVal = clamp(this.pointer.x, -boxWidth / 2, boxWidth / 2)

      //-boxWidth/2の時 = -PI/2
      //+boxWidth/2の時 = PI/2
      const rotateY = (Math.PI / 2 * (xVal / (boxWidth / 2))) / 5 / (distanceY * distanceY + 0.5)
      const prevMouse = this.boxRotatesMouse[i] || 0
      const lerpMouse = lerp(prevMouse, rotateY, 0.1, (time - this.currentTime) / 10)
      box.rotation.y = clamp(this.boxRotateGsap[i].rotation.y + lerpMouse, -Math.PI / 2, Math.PI / 2)
      this.boxRotatesMouse[i] = lerpMouse
    })


    this.wheelTotalY = Math.abs(this.wheelTotalY) < 4 ? 0 : this.wheelTotalY - 4 * Math.sign(this.wheelTotalY)
    this.cameraY = lerp(this.cameraY, this.wheelTotalY, 0.5, (time - this.currentTime) / 10)
    this.camera.position.y = this.cameraY / 10
    this.camera.lookAt(0, 0, 0)
    this.camera.updateMatrixWorld();

    this.renderer.render(this.scene!, this.camera)
    this.currentTime = time
  }
  currentTime = 0

  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }
}


const clamp = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max);
}
/* const roundNumber = (num: number, scale: number) => {
  return Math.round(num * scale) / scale
} */

const lerp = (start: number, end: number, amt: number, delta: number) => {
  const calc = (1 - amt * delta) * start + amt * delta * end;
  return Math.round(calc * 100) / 100;
};