// 必要なimportを追加
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getVh } from '../Common/utils';

import { GUI } from 'lil-gui'
import { boxVertex, finalFrag } from '../Common/common';
import gsap from 'gsap';
import { colorBoxFrag } from '../Common/colorBoxFrag';
import { DecalGeometry } from 'three/examples/jsm/Addons.js';

// 直方体のサイズ
const BOX_SIZE = {
  width: 1.0,
  height: 1.2,
  depth: 1.0
};

function calculateCameraDistance(
  squareSize: number,
  fovDegrees: number,
  aspect: number
) {
  const fovRad = (fovDegrees * Math.PI) / 180;
  const halfSize = squareSize / 2;

  // 垂直方向の視野から必要な距離
  const distanceFromHeight = halfSize / Math.tan(fovRad / 2);

  // 水平方向の視野から必要な距離
  const horizontalFov = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
  const distanceFromWidth = halfSize / Math.tan(horizontalFov / 2);

  // より遠い方の距離を使用（両方向で収まるように）
  return distanceFromWidth;
}



export class Stage {
  private container!: HTMLDivElement;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();

  // レンダーターゲットの追加
  private frontFaceTarget!: THREE.WebGLRenderTarget;
  private backFaceTarget!: THREE.WebGLRenderTarget;
  private finalMaterial!: THREE.ShaderMaterial;
  private quadMesh!: THREE.Mesh;
  private boxMesh!: THREE.Mesh;


  private maxPullDistance = 2.0; // 引っ張りの最大距離

  constructor() {
    this.init();
    this.createRenderTargets();
    this.createCube();
    this.createFinalPass();
    window.addEventListener('resize', () => this.onWindowResize(), false);
    window.requestAnimationFrame(this.animate);
  }

  private init(): void {
    // 既存のコード
    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    const aspect = window.innerWidth / getVh(100);
    this.camera = new THREE.PerspectiveCamera(5, aspect, 0.1, 1000);


    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, getVh(100));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }

  private createRenderTargets(): void {
    // レンダーターゲットの作成
    const rtWidth = this.renderer.domElement.width;
    const rtHeight = this.renderer.domElement.height;

    this.frontFaceTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });

    this.backFaceTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });
  }

  frontMaterial: THREE.ShaderMaterial | null = null
  backMaterial: THREE.ShaderMaterial | null = null
  private createCube(): void {
    const geometry = new THREE.BoxGeometry(
      BOX_SIZE.width,
      BOX_SIZE.height,
      BOX_SIZE.depth,
    );

    const gradTexture1 = new THREE.TextureLoader().load("/grad_txt_1.png");
    const gradTexture2 = new THREE.TextureLoader().load("/grad_txt_2.png");
    const gradTexture3 = new THREE.TextureLoader().load("/grad_txt_3.png");
    const gradTexture4 = new THREE.TextureLoader().load("/grad_txt_4.png");
    const gradTexture5 = new THREE.TextureLoader().load("/grad_txt_5.png");
    const gradTexture6 = new THREE.TextureLoader().load("/grad_txt_6.png");


    [
      gradTexture1,
      gradTexture2,
      gradTexture3,
      gradTexture4,
      gradTexture5,
      gradTexture6
    ].forEach((texture) => {
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipMapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      // テクスチャのラッピングモードを設定
      texture.wrapS = THREE.MirroredRepeatWrapping;
      texture.wrapT = THREE.MirroredRepeatWrapping;
    })

    const txtsUniforms = {
      tGrad1: { value: gradTexture1 },
      tGrad2: { value: gradTexture2 },
      tGrad3: { value: gradTexture3 },
      tGrad4: { value: gradTexture4 },
      tGrad5: { value: gradTexture5 },
      tGrad6: { value: gradTexture6 }
    }

    this.frontMaterial = new THREE.ShaderMaterial({
      vertexShader: boxVertex,
      fragmentShader: colorBoxFrag,
      uniforms: {
        uTime: { value: 0.0 },
        uBoxSize: { value: new THREE.Vector3(BOX_SIZE.width, BOX_SIZE.height, BOX_SIZE.depth) },
        uBox: { value: 1 },
        uFlat: { value: 0 },
        uTri: { value: 0 },
        uMouseWorldPosition: { value: new THREE.Vector3() },
        uPullStrength: { value: 0.0 },
        uCameraPosition: { value: new THREE.Vector3() },
        uMaxPullDistance: { value: 2.0 },
        uIsFront: { value: true },
        ...txtsUniforms

      },
      side: THREE.FrontSide,
      transparent: true,
    });


    // 裏面用シェーダーマテリアル
    this.backMaterial = new THREE.ShaderMaterial({
      vertexShader: this.frontMaterial.vertexShader,
      fragmentShader: colorBoxFrag,
      uniforms: {
        uTime: { value: 0.0 },
        uBoxSize: { value: new THREE.Vector3(BOX_SIZE.width, BOX_SIZE.height, BOX_SIZE.depth) },
        uBox: { value: 1 },
        uFlat: { value: 0 },
        uTri: { value: 0 },
        // 引っ張り効果関連のユニフォーム
        uMouseWorldPosition: { value: new THREE.Vector3() },
        uPullStrength: { value: 0.0 },
        uCameraPosition: { value: new THREE.Vector3() },
        uMaxPullDistance: { value: 2.0 },
        uIsFront: { value: false },
        ...txtsUniforms

      },
      side: THREE.BackSide,
      transparent: true,
    });

    // メッシュを作成
    this.boxMesh = new THREE.Mesh(geometry, this.frontMaterial);


    // 歪める



    // BufferGeometryの頂点を直接変更




    this.scene.add(this.boxMesh);

    // 参照を保持（後でマテリアルを切り替えるため）
    this.boxMesh.userData.frontMaterial = this.frontMaterial;
    this.boxMesh.userData.backMaterial = this.backMaterial;

    // 軸ヘルパー
    //    const axesHelper = new THREE.AxesHelper(2);
    //    this.scene.add(axesHelper);
    this.gui = new GUI()


    const myObject = {
      uBox: this.frontMaterial!.uniforms.uBox.value,
      uFlat: this.frontMaterial!.uniforms.uFlat.value,
      uTri: this.frontMaterial!.uniforms.uTri.value,
    };



    const sealMat = new THREE.ShaderMaterial({
      vertexShader: boxVertex,
      fragmentShader: `
       void main() {
          gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // 赤色のシンプルなシェーダー
      }
      `,
      uniforms: {
        uTime: { value: 0.0 },
        uBoxSize: { value: new THREE.Vector3(BOX_SIZE.width, BOX_SIZE.height, BOX_SIZE.depth) },
        uBox: { value: 1 },
        uFlat: { value: 0 },
        uTri: { value: 0 },
        uMouseWorldPosition: { value: new THREE.Vector3() },
        uPullStrength: { value: 0.0 },
        uCameraPosition: { value: new THREE.Vector3() },
        uMaxPullDistance: { value: 2.0 },
        uIsFront: { value: true },
      },
      side: THREE.FrontSide,
      transparent: true,
    });

    const geometryLast = new THREE.BoxGeometry(
      0.4 * BOX_SIZE.width,
      1.001 * BOX_SIZE.height,
      0.4 * BOX_SIZE.depth,
    );
    const sealMesh = new THREE.Mesh(geometryLast, sealMat);

    //this.scene.add(sealMesh);



    // デカールの位置、向き、サイズを定義
    const position = new THREE.Vector3(0.29, 0, -0.29); // 貼り付ける位置
    const orientation = new THREE.Euler(-Math.PI * 0.5, 0, Math.PI * 0.5); // 回転
    const size = new THREE.Vector3(1.6, 1.6, 1.6); // サイズ

    // デカールジオメトリを作成
    this.boxMesh.scale.set(1, 1, 1); // ボックスのスケールを調整
    const decalGeometry = new DecalGeometry(
      this.boxMesh, // デカールを貼り付ける対象のメッシュ
      position,
      orientation,
      size
    );

    // デカール用のマテリアルを作成
    const texture = new THREE.TextureLoader().load('/linn_logo.png'); // デカールのテクスチャ
    const decalMaterial = new THREE.MeshBasicMaterial({
      map: texture, // シールのテクスチャ

      polygonOffset: true,
      polygonOffsetFactor: -10,
      alphaTest: 0.01,
      transparent: true,
      side: THREE.FrontSide,

    });

    // デカールメッシュを作成してシーンに追加
    const decalMesh = new THREE.Mesh(decalGeometry, decalMaterial);
    this.scene.add(decalMesh);

    const position2 = new THREE.Vector3(0, 0.4, 0); // 貼り付ける位置
    const orientation2 = new THREE.Euler(-Math.PI * 0, 0, Math.PI * 0); // 回転
    const size2 = new THREE.Vector3(0.95, 0.3, 1); // サイズ

    const decalGeometry2 = new DecalGeometry(
      this.boxMesh, // デカールを貼り付ける対象のメッシュ
      position2,
      orientation2,
      size2
    );

    // デカール用のマテリアルを作成
    const texture2 = new THREE.TextureLoader().load('/linn_copy.png'); // デカールのテクスチャ

    const decalMaterial2 = new THREE.MeshBasicMaterial({
      map: texture2, // シールのテクスチャ

      polygonOffset: true,
      polygonOffsetFactor: -10,
      alphaTest: 0.08,
      opacity: 1,
      transparent: true,
      side: THREE.FrontSide,


    });


    // デカールメッシュを作成してシーンに追加
    const decalMesh2 = new THREE.Mesh(decalGeometry2, decalMaterial2);
    this.scene.add(decalMesh2);








  }
  gui !: GUI
  private createFinalPass(): void {
    // 最終合成用のシーン
    const finalScene = new THREE.Scene();

    // 画面全体を覆うクワッドジオメトリ
    const quadGeometry = new THREE.PlaneGeometry(2, 2);

    // 最終合成用シェーダー
    this.finalMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: finalFrag,
      uniforms: {
        tFront: { value: this.frontFaceTarget.texture },
        tBack: { value: this.backFaceTarget.texture },
        uTime: { value: 0.0 },
        uBoxSize: { value: new THREE.Vector3(BOX_SIZE.width, BOX_SIZE.height, BOX_SIZE.depth) },
        uCameraPosition: { value: this.camera.position }
      }
    });

    // クワッドメッシュ
    this.quadMesh = new THREE.Mesh(quadGeometry, this.finalMaterial);
    finalScene.add(this.quadMesh);

    // メンバ変数に保存
    this.quadMesh.userData.finalScene = finalScene;

  }



  cameraPositionSet = (time: number) => {
    // 使用例
    const r = 1; // 正方形の一辺


    const aspect = window.innerWidth / getVh(100);

    const cameraR = calculateCameraDistance(r, 5, aspect);
    // クォータニオンで回転を定義

    const quat1 = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      time * 0.2
    );
    const quat2 = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.sin(time) * 0.3
    );

    // クォータニオンを合成
    const finalQuat = new THREE.Quaternion().multiplyQuaternions(quat1, quat2);

    // 基本位置に適用
    const basePos = new THREE.Vector3(0, 0, cameraR);
    basePos.applyQuaternion(finalQuat);

    this.camera.position.copy(basePos);

    const posbase = 12
    const startPosi = new THREE.Vector3(posbase, posbase * 1.5, posbase);

    const lerp = Math.sin(time * 0.5); // 補間係数
    startPosi.lerp(this.camera.position, lerp);
    this.camera.position.copy(startPosi);

    this.camera.lookAt(0, 0, 0); // 原点を見る
  }




  private onWindowResize(): void {
    const aspect = window.innerWidth / getVh(100);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, getVh(100));

    // レンダーターゲットのリサイズ
    const rtWidth = this.renderer.domElement.width;
    const rtHeight = this.renderer.domElement.height;

    this.frontFaceTarget.setSize(rtWidth, rtHeight);
    this.backFaceTarget.setSize(rtWidth, rtHeight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    // 時間の更新
    const elapsedTime = this.clock.getElapsedTime();

    // コントロールの更新
    this.controls.update();

    // ユニフォームの更新
    const frontMaterial = this.boxMesh.userData.frontMaterial as THREE.ShaderMaterial;
    const backMaterial = this.boxMesh.userData.backMaterial as THREE.ShaderMaterial;

    frontMaterial.uniforms.uTime.value = elapsedTime;
    backMaterial.uniforms.uTime.value = elapsedTime;

    // 一定値のpullStrengthを使用（0または1）
    //const pullStrength = this.isPulling ? 1.0 : 0.0;
    const pullStrength = 0
    frontMaterial.uniforms.uPullStrength.value = pullStrength;
    backMaterial.uniforms.uPullStrength.value = pullStrength;


    this.finalMaterial.uniforms.uTime.value = elapsedTime;
    this.finalMaterial.uniforms.uCameraPosition.value.copy(this.camera.position);

    this.cameraPositionSet(
      elapsedTime
    );
    // フロントフェイスのレンダリング
    this.boxMesh.material = frontMaterial;
    this.renderer.setRenderTarget(this.frontFaceTarget);
    this.renderer.render(this.scene, this.camera);

    // バックフェイスのレンダリング
    this.boxMesh.material = backMaterial;
    this.renderer.setRenderTarget(this.backFaceTarget);
    this.renderer.render(this.scene, this.camera);

    // 最終合成レンダリング
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadMesh.userData.finalScene, this.camera);
  }
}