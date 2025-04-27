// BoxGeometryの代わりにRayCastingによる立方体の実装

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getVh } from '../Common/utils';
import frag from '../glsl/color-box.frag?raw';

// 直方体のサイズ
const BOX_SIZE = {
  width: 1.0,
  height: 1.0,
  depth: 1.0
};

export class Stage {
  private container!: HTMLDivElement;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();
  private cubeShader!: THREE.ShaderMaterial;

  constructor() {
    this.init();
    this.createCube();
    window.addEventListener('resize', () => this.onWindowResize(), false);
    window.requestAnimationFrame(this.animate);
  }

  private init(): void {
    // コンテナの作成
    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    // シーンの作成
    this.scene = new THREE.Scene();

    // カメラの作成 (透視投影カメラ)
    const aspect = window.innerWidth / getVh(100);
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
    this.camera.position.set(2, 2, 2);
    this.camera.lookAt(0, 0, 0);

    // レンダラーの作成
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, getVh(100));
    this.container.appendChild(this.renderer.domElement);

    // コントロールの作成
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }

  private createCube(): void {
    // カスタムシェーダーマテリアルの作成
    this.cubeShader = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vCameraPosition;
        uniform float uTime;
        varying vec2 vUv;
        
        void main() {
          vec3 pos = position;
          
          float progress = mod(uTime, 5.0)/5.;

          float initY = pos.y;

        pos.y = pos.y*(1.-progress);
        pos.x = pos.x + pos.x* progress * initY;
        pos.z = pos.z + pos.z* progress * initY;
          // pos.z = pos.z + 2.* pos.x*progress*abs(initY);

          vPosition = pos;
          vNormal = normal;
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
          vCameraPosition = cameraPosition;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0.0 },
        uBoxSize: { value: new THREE.Vector3(BOX_SIZE.width, BOX_SIZE.height, BOX_SIZE.depth) }
      },
      transparent: true,
      depthWrite: false // 透明オブジェクトの深度書き込みを無効化
    });

    // 直方体の頂点情報を含む単純な立方体ジオメトリ
    const geometry = new THREE.BoxGeometry(
      BOX_SIZE.width,
      BOX_SIZE.height,
      BOX_SIZE.depth,
    );

    // メッシュを作成してシーンに追加
    const cube = new THREE.Mesh(geometry, this.cubeShader);
    //cube.position.y=1
    this.scene.add(cube);

    // 軸ヘルパーの追加（デバッグ用）
    const axesHelper = new THREE.AxesHelper(2);
    this.scene.add(axesHelper);
  }

  private onWindowResize(): void {
    const aspect = window.innerWidth / getVh(100);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, getVh(100));
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    // コントロールの更新
    this.controls.update();

    // シェーダーの時間パラメータを更新
    const elapsedTime = this.clock.getElapsedTime();
    
    this.cubeShader.uniforms.uTime.value = elapsedTime * 2;

    // レンダリング
    this.renderer.render(this.scene, this.camera);
  }
}