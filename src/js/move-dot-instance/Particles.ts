const instanceCount = 20;
const RADIUS = 0.4
const VEROCITY_BASE = 0.5
type Vector2D = [number, number];

import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/Addons.js';

export class Particles {
  //private WIDTH = 10;
  //private PARTICLES = this.WIDTH * this.WIDTH;
  getCanvasSize: () => {
    width: number
    height: number
  }
  viewport
    : {
      x: number
      y: number
    } = {
      x: 0,
      y: 0
    }

  private camera!: THREE.OrthographicCamera;
  geometry!: THREE.SphereGeometry;
  scene: THREE.Scene
  renderer = new THREE.WebGLRenderer();

  // デカール関連のプロパティを追加
  private decals: THREE.Mesh[] = [];
  private decalMaterial: THREE.MeshPhongMaterial;
  private sphereMeshes: THREE.Mesh[] = []; // 個別の球体メッシュを保持


  getViewport: () => {
    x: number
    y: number
  }
  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.OrthographicCamera,
    getCanvasSize: () => {
      width: number
      height: number
    },
    getViewport: () => {
      x: number
      y: number
    },
    scene: THREE.Scene
  ) {
    this.getCanvasSize = getCanvasSize
    this.camera = camera
    this.getViewport = getViewport
    this.renderer = renderer
    this.scene = scene

    // デカール用のマテリアルを初期化
    this.decalMaterial = new THREE.MeshPhongMaterial({
      map: new THREE.TextureLoader().load('/chara/img/logo_jamp.png'),
      transparent: true,
      opacity: 0.8,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });

    this.init();
  }


  mesh: THREE.InstancedMesh | null = null;
  canvasSize = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  velocities: [number, number][] = []
  pos: [number, number][] = []
  scale: [number, number][] = []
  private init = (): void => {
    this.canvasSize = this.getCanvasSize();
    this.viewport = this.getViewport();

    const geometry = new THREE.SphereGeometry(RADIUS);
    this.geometry = geometry;

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.2,
    });

    // インスタンス化されたメッシュの代わりに個別のメッシュを作成
    for (let i = 0; i < instanceCount; i++) {
      const sphereMesh = new THREE.Mesh(geometry, material);
      sphereMesh.castShadow = true;
      this.scene.add(sphereMesh);
      this.sphereMeshes.push(sphereMesh);

      this.velocities.push([
        (Math.random() - 0.5) * VEROCITY_BASE,
        (Math.random() - 0.5) * VEROCITY_BASE
      ]);
      const pos = [
        (Math.random() - 0.5) * this.viewport.x,
        (Math.random() - 0.5) * this.viewport.y
      ] as [number, number];

      this.pos.push(pos);
      //this.scale.push([2, 2]);

      // 各球体にデカールを追加
      this.addDecalToSphere(i);

      const axis = new THREE.Vector3(-.1, 1, 0).normalize();
      //console.log('axis:', axis);
      // 3-2. 回転角度を計算: θ = (speed * deltaTime) / RADIUS
      const angle = 10;

      // 3-3. 回転用のクォータニオンを作って乗算
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      sphereMesh.quaternion.multiply(q);

    }
  }


  // 球体にデカールを追加するメソッド
  private addDecalToSphere(index: number): void {
    const sphere = this.sphereMeshes[index];

    try {
      // デカールの位置とサイズを設定
      const position = new THREE.Vector3(0, 0, RADIUS);
      const size = new THREE.Vector3(RADIUS * 1, RADIUS * 1, RADIUS * 1);
      const orientation = new THREE.Euler(0, 0, 0);

      // デカールジオメトリの作成
      const decalGeometry = new DecalGeometry(
        sphere,
        position,
        orientation,
        size
      );

      // デカールメッシュの作成
      const decalMesh = new THREE.Mesh(decalGeometry, this.decalMaterial);
      decalMesh.renderOrder = 1;

      // デカールの初期位置を設定
      decalMesh.position.copy(sphere.position);
      decalMesh.position.z += RADIUS;

      this.decals[index] = decalMesh;
      this.scene.add(decalMesh);
    } catch (error) {
      console.error('Error creating decal:', error);
    }
  }




  onWindowResize(): void {
    this.canvasSize = this.getCanvasSize()
    this.camera.updateProjectionMatrix();
    this.viewport = this.getViewport();
  }


  private calculateCollision(
    pos1: Vector2D,
    vel1: Vector2D,
    pos2: Vector2D,
    vel2: Vector2D,
  ): { newVel1: Vector2D, newVel2: Vector2D } {
    // 位置の差分
    const diff: Vector2D = [
      pos1[0] - pos2[0],
      pos1[1] - pos2[1]
    ];
    // 距離計算
    const distance = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1]);

    // 衝突判定の半径（メッシュのサイズに応じて調整）
    const collisionRadius = (RADIUS * 2);


    if (distance < collisionRadius && distance > 0) {
      // 衝突法線を計算
      const normal: Vector2D = [
        diff[0] / distance,
        diff[1] / distance
      ];

      // 相対速度を計算
      const relativeVelocity: Vector2D = [
        vel1[0] - vel2[0],
        vel1[1] - vel2[1]
      ];

      // 法線方向の相対速度
      const relativeVelocityAlongNormal =
        relativeVelocity[0] * normal[0] +
        relativeVelocity[1] * normal[1];

      // 衝突している場合（お互いに近づいている場合）
      if (relativeVelocityAlongNormal < 0) {
        const restitution = 1.0; // 反発係数
        const impulseMagnitude = -(1.0 + restitution) * relativeVelocityAlongNormal;
        const impulse = impulseMagnitude / 2; // 質量が同じと仮定

        // 新しい速度を計算
        const newVel1: Vector2D = [
          vel1[0] + impulse * normal[0],
          vel1[1] + impulse * normal[1]
        ];

        const newVel2: Vector2D = [
          vel2[0] - impulse * normal[0],
          vel2[1] - impulse * normal[1]
        ];

        return { newVel1, newVel2 };
      } else {

      }
    }

    // 衝突していない場合は元の速度を返す
    return { newVel1: vel1, newVel2: vel2 };
  }
  prevTime = 0;





  render(time: number): void {
    const diff = time - this.prevTime;
    this.prevTime = time;
    const deltaTime = diff / 200;

    // 衝突判定と速度更新
    for (let i = 0; i < instanceCount; i++) {
      for (let j = i + 1; j < instanceCount; j++) {
        const { newVel1, newVel2 } = this.calculateCollision(
          this.pos[i],
          this.velocities[i],
          this.pos[j],
          this.velocities[j]
        );

        this.velocities[i] = newVel1;
        this.velocities[j] = newVel2;
      }
    }

    // 位置の更新と画面端での反射
    for (let i = 0; i < instanceCount; i++) {
      const newPos: Vector2D = [
        this.pos[i][0] + this.velocities[i][0] * deltaTime,
        this.pos[i][1] + this.velocities[i][1] * deltaTime
      ];

      // 画面端での反射
      const kabeX = (this.viewport.x / 2 - RADIUS / 2);
      if (Math.abs(newPos[0]) > kabeX) {
        this.velocities[i][0] *= -1;
        newPos[0] = Math.sign(newPos[0]) * kabeX;

        //        this.sphereMeshes[i].quaternion.identity();
      }
      const kabeY = (this.viewport.y / 2 - RADIUS / 2);
      if (Math.abs(newPos[1]) > kabeY) {
        this.velocities[i][1] *= -1;
        newPos[1] = Math.sign(newPos[1]) * kabeY;

        // this.sphereMeshes[i].quaternion.identity();
      }

      // 位置の更新
      this.pos[i] = newPos;

      // 球体の位置と回転を更新
      const sphere = this.sphereMeshes[i];
      sphere.position.set(newPos[0], newPos[1], 0);


      // 移動方向に基づいて回転を計算
      //const velocity = this.velocities[i];
      //      const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]);

      const vx = this.velocities[i][0];
      const vy = this.velocities[i][1];
      const speed = Math.sqrt(vx * vx + vy * vy);

      //    速度がほぼゼロの場合は回転更新しなくてOK
      if (speed > 1e-6) {
        // 回転軸 (XY平面で速度ベクトルを90°回転させたもの)
        const axis = new THREE.Vector3(-vy, vx, 0).normalize();

        //console.log('axis:', axis);
        // 3-2. 回転角度を計算: θ = (speed * deltaTime) / RADIUS
        const angle = (speed * deltaTime) / RADIUS;

        // 3-3. 回転用のクォータニオンを作って乗算
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);

        // sphere.quaternion に今の回転を掛け合わせる
        sphere.quaternion.premultiply(q);

      }


      // デカールの位置と回転も更新
      const decal = this.decals[i];
      if (decal) {
        decal.position.copy(sphere.position);
        decal.rotation.copy(sphere.rotation);


        /* // デカールの位置オフセットを計算
        const offset = new THREE.Vector3(0, 0, RADIUS);
        offset.applyEuler(decal.rotation);
        decal.position.add(offset);

         */
      }
    }
  }

}

