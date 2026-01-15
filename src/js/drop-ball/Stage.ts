import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { clamp, getVh, lerp } from '../Common/utils';
import * as CANNON from 'cannon-es';
import { BoxFish } from './BoxFish';
import { BoxBlock } from './BoxBlock';

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
  controls!: OrbitControls;
  scene!: THREE.Scene


  BoxFish: BoxFish
  BoxBlock: BoxBlock
  constructor() {

    if (!this.isWebGLAvailable()) {
      //  return;
    }

    window.addEventListener('resize', () => this.onWindowResize(), false);
    document.addEventListener('mousemove', this.onMouseMove.bind(this), false);

    this.init();
    this.initPhysics();
    this.addLights();
    this.addObject();

    this.BoxFish = new BoxFish(
      {
        camera: this.camera,
        world: this.world,
        scene: this.scene
      }
    )
    this.BoxBlock = new BoxBlock(
      {
        camera: this.camera,
        world: this.world,
        scene: this.scene
      }
    )


    window.requestAnimationFrame(this.animate);
  }

  mouse: THREE.Vector2 = new THREE.Vector2(
    -1, -1
  );

  onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.mousePlane);
    if (intersects.length > 0) {

    }
  }

  mouseWorldPosition: THREE.Vector3 = new THREE.Vector3(
    -10, 0, -10
  );
  lastMousePosition: THREE.Vector2 = new THREE.Vector2();
  mouseVelocity: THREE.Vector2 = new THREE.Vector2();

  clock = new THREE.Clock();
  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;
  raycaster!: THREE.Raycaster;

  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.canvasSize = this.getCanvasSize()

    const aspect = this.canvasSize.width / this.canvasSize.height;
    const base = 14
    this.camera = new THREE.OrthographicCamera(
      -base, base,
      base / aspect, -base / aspect,
      0.1, 1000
    );
    /* this.camera = new THREE.PerspectiveCamera(
      75, this.canvasSize.width / this.canvasSize.height, 0.1, 1000
    ) */
    this.camera.position.set(0, 15, 0);
    this.camera.lookAt(0, 0, 0);

    this.viewport = this.getViewport();
    this.raycaster = new THREE.Raycaster();

    this.renderer = new THREE.WebGLRenderer(
      {
        alpha: true
      }
    );

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        Math.min(4096
          / window.innerWidth, 3)
    );
    this.scene = new THREE.Scene();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.container.appendChild(this.renderer.domElement);

    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);

    // コントロール設定
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

  }
  world!: CANNON.World;
  boxMeshes: THREE.Mesh[] = [];
  meshes!: THREE.Mesh[];
  bodies!: CANNON.Body[];

  initPhysics() {
    // 物理ワールドの作成
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -139.82, 0) // 重力設定
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();


    // 物理オブジェクトとThree.jsオブジェクトを紐付けるための配列
    this.meshes = [];
    this.bodies = [];
  }
  addLights() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.scene!.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 8);
    directionalLight.position.set(10, 20, -10);


    this.scene!.add(directionalLight);


    const light = new THREE.SpotLight(0xbed7dc, 400, 100, Math.PI / 4, 1);
    light.position.set(15, 30, 10);
    light.lookAt(0, 0, 0);

  }

  addObject = () => {
    // 床の作成
    this.addFloor();
    // ボールの作成
    this.createMouseBall();

    this.createMousePlane();


  }
  mousePlane!: THREE.Mesh;

  createMousePlane() {
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.mousePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.mousePlane.rotation.x = -Math.PI / 2;
    this.mousePlane.position.y = -1;
    this.scene.add(this.mousePlane);
  }


  addFloor() {
    // Three.jsの床
    const floorGeometry = new THREE.BoxGeometry(100, 0.5, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({
      //color: 0xff00ff,
      color: 0x8899ff,
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    this.scene!.add(floorMesh);

    // Cannon.jsの床（物理ボディ）
    const floorShape = new CANNON.Box(new CANNON.Vec3(50, 0.25, 50));
    const floorBody = new CANNON.Body({
      mass: 0, // 質量0 = 動かない
      shape: floorShape,
      position: new CANNON.Vec3(0, 0, 0)
    });
    this.world.addBody(floorBody);
  }


  ballBody!: CANNON.Body;

  initialBoxes: { [key: string]: { x: number; y: number; z: number; prevX: number } } = {}

  getWindowRate() {
    return (window.innerHeight / (this.camera.top * 2))
  }

  mouseBallMesh!: THREE.Mesh;
  cMesh!: THREE.Mesh;
  mouseBallBody!: CANNON.Body;

  createMouseBall() {
    // Three.jsボール
    const ballRadius = 0.7;
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 16);
    const txt = new THREE.TextureLoader().load('/img/wood2.png')
    txt.colorSpace = THREE.SRGBColorSpace
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xddaa77,
      //metalness: 0.2,
      //roughness: 0.2,  
      map: txt,
    });

    this.mouseBallMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    this.scene.add(this.mouseBallMesh);

    const cylinder = new THREE.CylinderGeometry(0.6, 0.6, 1, 32);
    const cylinderMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });
    this.cMesh = new THREE.Mesh(cylinder, cylinderMat);
    this.scene.add(this.cMesh);

    //this.mouseBallMesh.castShadow = true;

    // Cannon.jsボール
    const ballShape = new CANNON.Sphere(ballRadius);

    this.mouseBallBody = new CANNON.Body({
      mass: 1,
      shape: ballShape,
      position: new CANNON.Vec3(0, 0, 0),
      type: CANNON.Body.KINEMATIC
    });
    this.world.addBody(this.mouseBallBody);
    this.meshes.push(this.mouseBallMesh);
    this.bodies.push(this.mouseBallBody);
  }

  updateMouseBall() {
    if (!this.mouseWorldPosition) return;

    const velocity = new CANNON.Vec3(
      this.mouseVelocity.x * 1,
      0,
      this.mouseVelocity.y * 1
    );
    this.mouseBallBody.velocity.copy(velocity);
  }

  // touchIds
  touchIds: number[] = [];
  time = 0
  prevX = []
  updatePhysics(deltaTime: number) {
    this.time += deltaTime;
    this.updateMouseBall();
    this.world.step(deltaTime);

    for (let i = 0; i < this.bodies.length; i++) {

      if (this.mouseBallMesh.uuid === this.meshes[i].uuid) {
        const shdowPos =
          new THREE.Vector3(
            this.bodies[i].position.x - 0.3,
            0,
            this.bodies[i].position.z + 0.3
          );
        this.cMesh.position.copy(shdowPos);
        this.meshes[i].position.copy(this.bodies[i].position);
      } else {
        this.meshes[i].position.copy(this.bodies[i].position);
        this.meshes[i].quaternion.copy(this.bodies[i].quaternion);
      }

    }
  }


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
    this.canvasSize = this.getCanvasSize()
    //this.camera.aspect = this.canvasSize.width / this.canvasSize.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.viewport = this.getViewport();
  }

  private animate = (time: number): void => {
    requestAnimationFrame((time) => this.animate(time));

    const sct = window.scrollY / (window.innerHeight / (this.camera.top * 2))
    this.camera.position.z = sct
    this.camera.lookAt(new THREE.Vector3(0, 0, this.camera.position.z));




    console.log('this.mouseBallBody.position.z:', this.mouseBallBody.position.z);
    const diffOrigin = Math.abs(this.mouseBallBody.position.z - sct)
    console.log('diffOrigin:', diffOrigin);
    const nextZ = lerp(
      this.mouseBallBody.position.z,
      sct,
      clamp(0.02 + diffOrigin * 0.001, 0.01, 0.2)
    )
    console.log('nextZ:', nextZ);
    const diff = nextZ - this.mouseBallBody.position.z

    //console.log('diff:', diff);
    //console.log('sct:', sct);
    //console.log('this.mouseBallBody.position.z:', this.mouseBallBody.position.z);

    this.mouseBallBody.position.z = nextZ

    // diff を元に回転
    this.mouseBallMesh.rotation.x += diff * 2
    //this.mouseBallMesh.visible = false

    this.mouseBallBody.position.y = 0.35
    this.mouseBallBody.position.x = 0

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.BoxFish.animate(time);
    this.BoxBlock.animate(time);
    // 物理シミュレーションを更新
    this.updatePhysics(deltaTime);

    // コントロールを更新
    //    this.controls!.update();
    this.stats.update();
    // レンダリング
    this.render(
      time
    );
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

