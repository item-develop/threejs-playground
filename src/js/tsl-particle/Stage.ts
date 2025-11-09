import * as THREE from "three/webgpu";
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import { abs, float, Fn, hash, If, instancedArray, instanceIndex, Loop, uint, vec2, uniform } from "three/tsl";

const particleCount = 10;

export class Stage {
  private container!: HTMLDivElement;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGPURenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;
  scene: THREE.Scene | null = null;

  // uniformsを追加
  private deltaTime = uniform(1 / 60);
  private aspectRatio = uniform(1);

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.init();
    this.addObject();
    window.requestAnimationFrame(this.animate);
  }

  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    const size = this.getCanvasSize();
    const aspect = size.width / size.height;
    this.aspectRatio.value = aspect;

    this.camera = new THREE.OrthographicCamera(
      -aspect, aspect, 1, -1, 0.1, 1000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGPURenderer();
    this.renderer.setSize(size.width, size.height);
    this.renderer.setClearColor("#000");
    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 : Math.min(4096 / window.innerWidth, 3)
    );

    this.scene = new THREE.Scene();
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);

    this.positionBuffer = instancedArray(particleCount, "vec2");
    this.velocityBuffer = instancedArray(particleCount, "vec2");

    // 初期化の修正
    const init = Fn(() => {
      const pos_i = this.positionBuffer.element(instanceIndex);
      const vel_i = this.velocityBuffer.element(instanceIndex);

      // シード値を使った決定論的な乱数
      const seed1 = instanceIndex.mul(uint(12345));
      const seed2 = instanceIndex.mul(uint(67890));
      const seed3 = instanceIndex.mul(uint(11111));
      const seed4 = instanceIndex.mul(uint(22222));

      const initialPosition = vec2(
        hash(seed1).sub(0.5).mul(2.0 * aspect),
        hash(seed2).sub(0.5).mul(2.0)
      );

      const initVelocity = vec2(
        hash(seed3).sub(0.5).mul(0.5), // 初速を小さく
        hash(seed4).sub(0.5).mul(0.5)
      );

      pos_i.assign(initialPosition);
      vel_i.assign(initVelocity);
    });

    const initCompute = init().compute(particleCount);
    this.renderer.computeAsync(initCompute);

    const update = Fn(() => {
      const pos_i = this.positionBuffer.element(instanceIndex);
      const vel_i = this.velocityBuffer.element(instanceIndex);
      const dt = this.deltaTime.mul(10); // 10倍速

      // 速度の初期値を保存（デバッグ用）
      const initialSpeed = vel_i.length();

      let j = uint(0);
      const deltaVel = vec2(0);
      let collisionCount = uint(0);

      // パーティクル間の衝突

      const totalVelocity = float(0);
      Loop(particleCount, () => {
        const pos_j = this.positionBuffer.element(j);
        const vel_j = this.velocityBuffer.element(j);

        totalVelocity.addAssign(vel_j.length());
        If(j.notEqual(instanceIndex), () => {

          const delta = pos_i.sub(pos_j);
          const dist = delta.length();
          const collisionRadius = float(0.1);

          If(dist.lessThan(collisionRadius).and(dist.greaterThan(0.0001)), () => {
            const n = delta.div(dist);
            const dv = vel_i.sub(vel_j);
            const dvn = dv.dot(n);

            If(dvn.lessThan(0), () => {
              deltaVel.assign(deltaVel.sub(n.mul(dvn)));
              collisionCount.assign(collisionCount.add(uint(1)));
            });
          });
        });
        j.assign(j.add(uint(1)));
      });



      // 速度更新
      vel_i.assign(vel_i.add(deltaVel));
      const initVelocity = float(2);

      If(totalVelocity.greaterThan(float(0)), () => {
        vel_i.assign(
          vel_i.mul(
            (float(initVelocity)).div(totalVelocity)
          )
        )
      })


      // 先に位置を更新
      pos_i.assign(pos_i.add(vel_i.mul(dt)));

      // 壁判定（位置更新後）
      const margin = float(0.001);

      // X方向
      If(pos_i.x.greaterThan(this.aspectRatio.sub(margin)), () => {
        vel_i.x.assign(abs(vel_i.x).negate()); // 必ず左向きに
        pos_i.x.assign(this.aspectRatio.sub(margin));
      }).ElseIf(pos_i.x.lessThan(this.aspectRatio.negate().add(margin)), () => {
        vel_i.x.assign(abs(vel_i.x)); // 必ず右向きに
        pos_i.x.assign(this.aspectRatio.negate().add(margin));
      });

      // Y方向
      If(pos_i.y.greaterThan(float(1).sub(margin)), () => {
        vel_i.y.assign(abs(vel_i.y).negate()); // 必ず下向きに
        pos_i.y.assign(float(1).sub(margin));
      }).ElseIf(pos_i.y.lessThan(float(-1).add(margin)), () => {
        vel_i.y.assign(abs(vel_i.y)); // 必ず上向きに
        pos_i.y.assign(float(-1).add(margin));
      });

      // エネルギーチェック（オプション）
      const finalSpeed = vel_i.length();
      If(finalSpeed.greaterThan(initialSpeed.mul(1.1)), () => {
        // 10%以上増加したら制限
        vel_i.assign(vel_i.div(finalSpeed).mul(initialSpeed));
      });
    });

    this.updateCompute = update().compute(particleCount);
  }

  positionBuffer!: ReturnType<typeof instancedArray>;
  velocityBuffer!: ReturnType<typeof instancedArray>;
  updateCompute!: any;

  private lastTime = 0;

  addObject = () => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.SpriteNodeMaterial();
    material.color = new THREE.Color(0xff0000);
    material.scaleNode = Fn(() => float(0.1))();
    material.positionNode = this.positionBuffer.toAttribute();

    const mesh = new THREE.InstancedMesh(geometry, material, particleCount);
    this.scene!.add(mesh);
  }

  getCanvasSize = () => {
    const height = getVh(100);
    const width = window.innerWidth;
    return { height, width };
  }

  private onWindowResize(): void {
    const size = this.getCanvasSize();
    const aspect = size.width / size.height;

    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(size.width, size.height);
    this.aspectRatio.value = aspect;
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);

    // 実際のdeltaTimeを計算
    if (this.lastTime === 0) {
      this.lastTime = time;
    }
    const deltaMs = time - this.lastTime;
    this.lastTime = time;

    // 秒単位に変換し、上限を設定（フレームスキップ対策）
    this.deltaTime.value = Math.min(deltaMs * 0.001, 1 / 30);

    this.renderer.computeAsync(this.updateCompute);
    this.renderer.renderAsync(this.scene!, this.camera);
    this.stats.update();
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