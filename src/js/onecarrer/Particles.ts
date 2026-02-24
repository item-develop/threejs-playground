/* function isOverlapping(x: number, y: number, posArray: Uint8Array | Uint8ClampedArray, currentIndex: number, radius: number): boolean {
  for (let i = 0; i < currentIndex; i += 4) {
    const dx = x - posArray[i];
    const dy = y - posArray[i + 1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 2 * radius) {
      return true;
    }
  }
  return false;
} */

const instanceCount = 20;
const RADIUS = 0.4
const VEROCITY_BASE = 5
type Vector2D = [number, number];

import * as THREE from 'three';

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

  private camera!: THREE.PerspectiveCamera;
  geometry!: THREE.PlaneGeometry;

  renderer = new THREE.WebGLRenderer();
  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    getCanvasSize: () => {
      width: number
      height: number
    }
  ) {
    this.getCanvasSize = getCanvasSize
    this.camera = camera
    this.renderer = renderer
    this.init();
  }

  getViewport() {
    const x = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z * this.camera.aspect;
    const y = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z;
    return {
      x, y
    }
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
    this.canvasSize = this.getCanvasSize()
    this.viewport = this.getViewport();

    const texture = new THREE.TextureLoader().load('/flame.png');
    const geometory = new THREE.PlaneGeometry(
      RADIUS, RADIUS, 1, 1);
    this.geometry = geometory;
    const maaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: {
          value: texture
        }
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position =  projectionMatrix * instanceMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `,
      fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main() {
        // CIRCLE
        vec2 coord = vUv - 0.5;
        float dist = length(coord);

        color = texture2D(uTexture, vUv);
        
        gl_FragColor = color;
      }
      `,

    })
    this.mesh = new THREE.InstancedMesh(geometory, maaterial, instanceCount);
    for (
      var i = 0; i < instanceCount; i++
    ) {
      this.velocities.push([VEROCITY_BASE * (Math.random() - 0.5), VEROCITY_BASE * (Math.random() - 0.5)])
      const pos = [
        this.viewport.x * ((i % 4) / 4) - this.viewport.x / 2 + RADIUS / 2,
        (RADIUS * 1.3) * (Math.ceil((i / 4))) - this.viewport.y / 2 + RADIUS / 2
      ] as [number, number]
      console.log('pos:', pos);
      this.pos.push(
        pos
      )
      this.scale.push([2, 2])
    }
  }




  onWindowResize(): void {
    this.canvasSize = this.getCanvasSize()
    this.camera.aspect = this.canvasSize.width / this.canvasSize.height;
    this.camera.updateProjectionMatrix();
    this.viewport = this.getViewport();
  }


  private calculateCollision(
    pos1: Vector2D,
    vel1: Vector2D,
    scale1: Vector2D,
    pos2: Vector2D,
    vel2: Vector2D,
    scale2: Vector2D
  ): { newVel1: Vector2D, newVel2: Vector2D } {
    // 位置の差分
    const diff: Vector2D = [
      pos1[0] - pos2[0],
      pos1[1] - pos2[1]
    ];
    // 距離計算
    const distance = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1]);

    // 衝突判定の半径（メッシュのサイズに応じて調整）
    const collisionRadius = (RADIUS / 2 * scale1[0] + RADIUS / 2 * scale2[0]);


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
        scale1[0] += 0.5
        scale1[1] += 0.5
        scale2[0] += 0.5
        scale2[1] += 0.5
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
        const convert = (v: number) => {
          return v < 0.2 ? 0.2 : v - 0.4
        }
        scale1[0] = convert(scale1[0])
        scale1[1] = convert(scale1[1])
        scale2[0] = convert(scale2[0])
        scale2[1] = convert(scale2[1])
      }
    }

    // 衝突していない場合は元の速度を返す
    return { newVel1: vel1, newVel2: vel2 };
  }
  prevTime = 0;



  render(time: number): void {
    const diff = time - this.prevTime;
    this.prevTime = time;
    const deltaTime = diff / 200; // 秒単位の経過時間

    // 衝突判定と速度更新
    for (let i = 0; i < instanceCount; i++) {
      for (let j = i + 1; j < instanceCount; j++) {
        // 衝突判定と新しい速度の計算
        const { newVel1, newVel2 } = this.calculateCollision(
          this.pos[i],
          this.velocities[i],
          this.scale[i],
          this.pos[j],
          this.velocities[j],
          this.scale[j]
        );

        // 速度の更新
        this.velocities[i] = newVel1;
        this.velocities[j] = newVel2;
      }
    }

    // 位置の更新と画面端での反射
    let instanceMatrix = new THREE.Matrix4();
    for (let i = 0; i < instanceCount; i++) {
      // 位置の更新
      const newPos: Vector2D = [
        this.pos[i][0] + this.velocities[i][0] * deltaTime,
        this.pos[i][1] + this.velocities[i][1] * deltaTime
      ];

      // 画面端での反射
      const kabeX = (this.viewport.x / 2 - RADIUS / 2)
      if (Math.abs(newPos[0]) > kabeX) {
        this.velocities[i][0] *= -1;
        newPos[0] = Math.sign(newPos[0]) * kabeX;
      }
      const kabeY = (this.viewport.y / 2 - RADIUS / 2)
      if (Math.abs(newPos[1]) > kabeY) {
        this.velocities[i][1] *= -1;
        newPos[1] = Math.sign(newPos[1]) * kabeY;
      }

      // 位置の更新と行列の設定
      this.pos[i] = newPos;
      //this.pos[i][1] -= 0.01;
      instanceMatrix.identity();
      instanceMatrix.makeScale(this.scale[i][0], this.scale[i][1], 1);
      instanceMatrix.setPosition(newPos[0], newPos[1], 0);

      this.mesh!.setMatrixAt(i, instanceMatrix);
    }


    this.mesh!.instanceMatrix.needsUpdate = true;



    // 運動エネルギー
    let kineticEnergy = 0;
    for (let i = 0; i < instanceCount; i++) {
      kineticEnergy +=
        0.5 *
        (this.velocities[i][0] * this.velocities[i][0] +
          this.velocities[i][1] * this.velocities[i][1]);
    }

    //scaleのtotal
    let totalScale = 0
    for (let i = 0; i < instanceCount; i++) {
      totalScale += this.scale[i][0]
    }
    console.log('totalScale:', totalScale);

  }




}

