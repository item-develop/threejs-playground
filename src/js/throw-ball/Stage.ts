import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import * as CANNON from 'cannon-es';

// 物理オブジェクトの型定義
interface PhysicsObject {
  mesh: THREE.Mesh;
  body: CANNON.Body;
}

export class Stage {
  viewport: {
    x: number;
    y: number;
  } = {
    x: 0,
    y: 0,
  };

  private container!: HTMLDivElement;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;
  scene: THREE.Scene | null = null;

  // Cannon-es 物理世界
  private world!: CANNON.World;

  // ゲームオブジェクト
  private ball!: PhysicsObject;
  private pins: PhysicsObject[] = [];
  private lane!: PhysicsObject;

  // マウス操作用
  private isDragging = false;
  private dragStart: THREE.Vector2 = new THREE.Vector2();
  private dragCurrent: THREE.Vector2 = new THREE.Vector2();

  // 発射ガイド
  private arrowHelper!: THREE.ArrowHelper;

  // 初期位置保存（リセット用）
  private initialBallPosition: CANNON.Vec3 = new CANNON.Vec3(-15, 0.5, 0);
  private initialPinPositions: CANNON.Vec3[] = [];

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.init();
    this.initPhysics();
    this.addObjects();
    this.setupControls();
    this.createResetButton();
    window.requestAnimationFrame(this.animate);
  }

  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.canvasSize = this.getCanvasSize();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvasSize.width / this.canvasSize.height,
      0.1,
      200
    );
    // カメラ位置：ボールの後方上空から俯瞰
    this.camera.position.set(-20, 8, 0);
    this.camera.lookAt(0, 0, 0);
    this.viewport = this.getViewport();

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(
      window.innerWidth < 767
        ? 4
        : Math.min(4096 / window.innerWidth, 3)
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // 空色の背景

    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls（デバッグ用、固定カメラのため無効化）
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;

    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);
  }

  // 物理エンジンの初期化
  private initPhysics(): void {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0); // 重力設定
    this.world.broadphase = new CANNON.NaiveBroadphase();

    // Solverの設定
    const solver = new CANNON.GSSolver();
    solver.iterations = 10;
    this.world.solver = solver;
  }

  // オブジェクトの追加
  private addObjects(): void {
    this.createLane();
    this.createBall();
    this.createPins();
    this.createArrowHelper();
    this.addLights();
  }

  // レーン（床）の作成
  private createLane(): void {
    const width = 3;
    const length = 40;
    const height = 0.5;

    // Three.js メッシュ
    const geometry = new THREE.BoxGeometry(width, height, length);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -height / 2, 0);
    mesh.receiveShadow = true;
    this.scene!.add(mesh);

    // Cannon.js 物理ボディ
    const shape = new CANNON.Box(
      new CANNON.Vec3(width / 2, height / 2, length / 2)
    );
    const body = new CANNON.Body({
      mass: 0, // 静的オブジェクト
      shape: shape,
      position: new CANNON.Vec3(0, -height / 2, 0),
    });
    this.world.addBody(body);

    this.lane = { mesh, body };
  }

  // ボーリングボールの作成
  private createBall(): void {
    const radius = 0.5;

    // Three.js メッシュ
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000, // 赤色
      roughness: 0.5,
      metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      this.initialBallPosition.x,
      this.initialBallPosition.y,
      this.initialBallPosition.z
    );
    mesh.castShadow = true;
    this.scene!.add(mesh);

    // Cannon.js 物理ボディ
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass: 7, // 質量 (kg)
      shape: shape,
      position: this.initialBallPosition.clone(),
      linearDamping: 0.3,
      angularDamping: 0.3,
    });
    this.world.addBody(body);

    this.ball = { mesh, body };
  }

  // ボーリングピンの配置（10本）
  private createPins(): void {
    const pinRadius = 0.15;
    const pinHeight = 1.0;
    const spacing = 0.5;
    const startZ = 15; // ピンの開始位置（Z軸）

    // 標準的なボーリングピンの配置（三角形、4列）
    const positions: [number, number, number][] = [
      // 1列目（1本）
      [0, pinHeight / 2, startZ],
      // 2列目（2本）
      [-spacing / 2, pinHeight / 2, startZ + spacing * Math.sqrt(3)],
      [spacing / 2, pinHeight / 2, startZ + spacing * Math.sqrt(3)],
      // 3列目（3本）
      [-spacing, pinHeight / 2, startZ + spacing * Math.sqrt(3) * 2],
      [0, pinHeight / 2, startZ + spacing * Math.sqrt(3) * 2],
      [spacing, pinHeight / 2, startZ + spacing * Math.sqrt(3) * 2],
      // 4列目（4本）
      [
        -spacing * 1.5,
        pinHeight / 2,
        startZ + spacing * Math.sqrt(3) * 3,
      ],
      [-spacing / 2, pinHeight / 2, startZ + spacing * Math.sqrt(3) * 3],
      [spacing / 2, pinHeight / 2, startZ + spacing * Math.sqrt(3) * 3],
      [spacing * 1.5, pinHeight / 2, startZ + spacing * Math.sqrt(3) * 3],
    ];

    positions.forEach((pos) => {
      // Three.js メッシュ
      const geometry = new THREE.CylinderGeometry(
        pinRadius,
        pinRadius * 1.5,
        pinHeight,
        16
      );
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff, // 白色
        roughness: 0.7,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.castShadow = true;
      this.scene!.add(mesh);

      // Cannon.js 物理ボディ
      const shape = new CANNON.Cylinder(
        pinRadius,
        pinRadius * 1.5,
        pinHeight,
        16
      );
      const body = new CANNON.Body({
        mass: 1.5, // 質量 (kg)
        shape: shape,
        position: new CANNON.Vec3(pos[0], pos[1], pos[2]),
      });
      this.world.addBody(body);

      this.pins.push({ mesh, body });
      this.initialPinPositions.push(new CANNON.Vec3(pos[0], pos[1], pos[2]));
    });
  }

  // 発射ガイド（矢印）の作成
  private createArrowHelper(): void {
    const dir = new THREE.Vector3(1, 0, 0).normalize();
    const origin = new THREE.Vector3(
      this.initialBallPosition.x,
      this.initialBallPosition.y,
      this.initialBallPosition.z
    );
    const length = 3;
    const color = 0xffff00;

    this.arrowHelper = new THREE.ArrowHelper(dir, origin, length, color);
    this.arrowHelper.visible = false;
    this.scene!.add(this.arrowHelper);
  }

  // ライトの追加
  private addLights(): void {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene!.add(ambientLight);

    // ディレクショナルライト
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene!.add(directionalLight);
  }

  // マウスコントロールのセットアップ
  private setupControls(): void {
    this.renderer.domElement.addEventListener(
      'mousedown',
      this.onMouseDown.bind(this)
    );
    this.renderer.domElement.addEventListener(
      'mousemove',
      this.onMouseMove.bind(this)
    );
    this.renderer.domElement.addEventListener(
      'mouseup',
      this.onMouseUp.bind(this)
    );
  }

  // マウスダウン
  private onMouseDown(event: MouseEvent): void {
    // ボールが静止している場合のみドラッグ可能
    if (this.ball.body.velocity.length() < 0.1) {
      this.isDragging = true;
      this.dragStart.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
      this.dragCurrent.copy(this.dragStart);
    }
  }

  // マウスムーブ
  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.dragCurrent.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      // ドラッグベクトルを計算
      const dragVector = new THREE.Vector2()
        .subVectors(this.dragCurrent, this.dragStart)
        .multiplyScalar(10);

      // 矢印の方向と長さを更新
      const direction = new THREE.Vector3(
        dragVector.x,
        0,
        dragVector.y
      ).normalize();
      const length = Math.min(dragVector.length(), 5);

      this.arrowHelper.setDirection(direction);
      this.arrowHelper.setLength(length, length * 0.2, length * 0.1);
      this.arrowHelper.position.copy(this.ball.mesh.position);
      this.arrowHelper.visible = true;
    }
  }

  // マウスアップ（ボール発射）
  private onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.arrowHelper.visible = false;

      // ドラッグベクトルから力を計算
      const dragVector = new THREE.Vector2()
        .subVectors(this.dragCurrent, this.dragStart)
        .multiplyScalar(100);

      // ボールに力を加える
      const force = new CANNON.Vec3(dragVector.x, 0, dragVector.y);
      this.ball.body.applyImpulse(force, this.ball.body.position);
    }
  }

  // リセットボタンの作成
  private createResetButton(): void {
    const button = document.createElement('button');
    button.textContent = 'リセット';
    button.style.position = 'absolute';
    button.style.top = '20px';
    button.style.left = '20px';
    button.style.padding = '10px 20px';
    button.style.fontSize = '16px';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.zIndex = '1000';

    button.addEventListener('click', () => this.resetGame());

    document.body.appendChild(button);

    // 操作説明テキストの追加
    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <p><strong>操作方法：</strong></p>
      <p>1. マウスでドラッグしてボールの方向と強さを決定</p>
      <p>2. マウスを離してボールを発射</p>
    `;
    instructions.style.position = 'absolute';
    instructions.style.top = '70px';
    instructions.style.left = '20px';
    instructions.style.color = 'white';
    instructions.style.fontSize = '14px';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    instructions.style.padding = '10px';
    instructions.style.borderRadius = '5px';
    instructions.style.zIndex = '1000';

    document.body.appendChild(instructions);
  }

  // ゲームのリセット
  private resetGame(): void {
    // ボールの位置と速度をリセット
    this.ball.body.position.copy(this.initialBallPosition);
    this.ball.body.velocity.setZero();
    this.ball.body.angularVelocity.setZero();
    this.ball.body.quaternion.set(0, 0, 0, 1);

    // ピンの位置と速度をリセット
    this.pins.forEach((pin, index) => {
      pin.body.position.copy(this.initialPinPositions[index]);
      pin.body.velocity.setZero();
      pin.body.angularVelocity.setZero();
      pin.body.quaternion.set(0, 0, 0, 1);
    });
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

  private lastTime = 0;

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  };

  private render(time: number): void {
    // 時間の差分を計算（秒単位）
    const deltaTime = this.lastTime === 0 ? 0 : (time - this.lastTime) / 1000;
    this.lastTime = time;

    // 物理シミュレーションの更新（最大タイムステップを制限）
    if (deltaTime > 0) {
      this.world.step(Math.min(deltaTime, 1 / 30));
    }

    // 物理オブジェクトの位置をThree.jsメッシュに同期
    this.updateMeshFromBody(this.ball);
    this.pins.forEach((pin) => this.updateMeshFromBody(pin));

    this.renderer.render(this.scene!, this.camera);
  }

  // 物理ボディの位置と回転をメッシュに同期
  private updateMeshFromBody(obj: PhysicsObject): void {
    obj.mesh.position.copy(obj.body.position as unknown as THREE.Vector3);
    obj.mesh.quaternion.copy(
      obj.body.quaternion as unknown as THREE.Quaternion
    );
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

