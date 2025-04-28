// 必要なimportを追加
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getVh } from '../Common/utils';

import { GUI } from 'lil-gui'
import { colorBoxFrag, finalFrag } from '../Common/common';
import gsap from 'gsap';

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

  // レンダーターゲットの追加
  private frontFaceTarget!: THREE.WebGLRenderTarget;
  private backFaceTarget!: THREE.WebGLRenderTarget;
  private finalMaterial!: THREE.ShaderMaterial;
  private quadMesh!: THREE.Mesh;
  private boxMesh!: THREE.Mesh;


  private mouse = new THREE.Vector2(0, 0);
  private mouseWorldPosition = new THREE.Vector3();

  private maxPullDistance = 2.0; // 引っ張りの最大距離

  constructor() {
    this.init();
    this.createRenderTargets();
    this.createCube();
    this.createFinalPass();
    this.setupSimplePullInteraction();
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
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    const posbase = 3
    this.camera.position.set(posbase, posbase * 1.5, posbase);
    this.camera.lookAt(0, 0, 0);

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

    this.frontMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        uniform float uBox;
        uniform float uFlat;
        uniform float uTri;
        
        uniform float uTime;


       
      // マウスの位置と引っ張り情報
      uniform vec3 uMouseWorldPosition;
      uniform float uPullStrength;
      uniform vec3 uCameraPosition;
      uniform float uMaxPullDistance;

      
      const float PI = 3.14159265358979;
      const float MAX_PULL_DISTANCE = 2.0;


        vec3 rotateY (vec3 v, float angle) {
          float c = cos(angle);
          float s = sin(angle);
          return vec3(
            v.x * c - v.z * s,
            v.y,
            v.x * s + v.z * c
          );
        }
        vec3 scaleZ (vec3 v, float scale) {
          return vec3(
            v.x,
            v.y,
            v.z * scale
          );
        }



        // 距離ベースの引っ張り効果を適用する関数
      vec3 applyDistancePull(vec3 position, vec3 worldPosition) {
        if (uPullStrength < 0.01) return position;
        
        // マウスのワールド座標からの距離を計算
        float dist = distance(worldPosition, uMouseWorldPosition);
        
        // 距離に基づいて引っ張り効果を計算
        float pullFactor = 1.0 - smoothstep(0.0, uMaxPullDistance, dist);
        pullFactor = pow(pullFactor, 2.0); // より急な減衰カーブ
        
        // 引っ張りの方向（頂点からマウス位置へ）
        vec3 pullDir = normalize(uMouseWorldPosition - worldPosition);
        
        // 面に応じた調整（左下のバグを修正）
        vec3 absPos = abs(position);
        float maxCoord = max(max(absPos.x, absPos.y), absPos.z);
        
        // どの面に属するかを判断し、面の法線方向に沿った引っ張りを強めるが
        // 特定の面（y負方向、x負方向）の動きを制限して左下のバグを修正
        float faceFactor = 1.0;
        
        if (abs(absPos.x - maxCoord) < 0.001) {
          // X面の場合
          pullDir.x *= sign(position.x);
          // X負方向の場合、動きを抑制
          if (position.x < 0.0) faceFactor = 0.5;
        } else if (abs(absPos.y - maxCoord) < 0.001) {
          // Y面の場合
          pullDir.y *= sign(position.y);
          // Y負方向の場合、動きを抑制
          if (position.y < 0.0) faceFactor = 0.5;
        } else if (abs(absPos.z - maxCoord) < 0.001) {
          // Z面の場合
          pullDir.z *= sign(position.z);
        }
        
        // カメラ方向からの視認性を考慮
        vec3 toCam = normalize(uCameraPosition - worldPosition);
        float visibilityFactor = max(0.3, dot(normalize(pullDir), toCam));
        
        // 引っ張り効果を適用（faceFactor調整を適用）
        return position + pullDir * pullFactor * uPullStrength * visibilityFactor * faceFactor * 0.5;
      }

        
        void main() {
          vec3 pos = position;
          
          //float progress = mod(uTime, 2.0)/2.;
          float progress = sin(uTime * 2.0) * 0.5 + 0.5; // 0.0から1.0の範囲で変化

          float initY = pos.y;

          
          pos = rotateY(pos, PI * 0.25);
          pos = scaleZ(pos, 1.+ uBox*0.5);
          pos = rotateY(pos, -PI * 0.25);
          
          
          pos.y = (pos.y+0.5) * (1. - uFlat) - 0.5;
          // pos.x = pos.x + pos.x * uFlat * (-initY);
          // pos.z = pos.z + pos.z * uFlat * (-initY);

          pos.x = pos.x * (1. - uTri * (initY));
          pos.z = pos.z * (1. - uTri * (initY));

            // 引っ張り効果を適用
           // ワールド空間での位置を計算
        vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
        
  // 引っ張り効果を適用
        pos = applyDistancePull(pos, worldPos);

          vPosition = pos;
          vNormal = normal;
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
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
        uMaxPullDistance: { value: 2.0 }

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
        uMaxPullDistance: { value: 2.0 }

      },
      side: THREE.BackSide,
      transparent: true,
    });

    // メッシュを作成
    this.boxMesh = new THREE.Mesh(geometry, this.frontMaterial);
    this.boxMesh.position.y = 0.5

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

    let animObjs = {
      uBox: this.frontMaterial!.uniforms.uBox.value,
      uFlat: this.frontMaterial!.uniforms.uFlat.value,
      uTri: this.frontMaterial!.uniforms.uTri.value,
    };

    const boxAnim = () => {
      const uBox = Math.random() * 1
      gsap.to(animObjs, {
        uBox: uBox,
        //duration: Math.abs(animObjs.uBox - uBox) * 3,
        duration: 1,
        delay: 0,
        ease: "linear",
        onUpdate: () => {
          this.frontMaterial!.uniforms.uBox.value = animObjs.uBox
          this.backMaterial!.uniforms.uBox.value = animObjs.uBox
        },
        onComplete: () => {
          boxAnim()
        }
      })
    }
    const flatAnim = () => {
      const rand = Math.random()
      const uFlat = rand < 0.333 ? 0 : rand < 0.66 ? 1 : 2
      gsap.to(animObjs, {
        uFlat: uFlat,
        //duration: Math.abs(animObjs.uFlat - uFlat) * 3,
        duration: 2,
        delay: 0,
        ease: "power4.inOut",
        onUpdate: () => {
          this.frontMaterial!.uniforms.uFlat.value = animObjs.uFlat
          this.backMaterial!.uniforms.uFlat.value = animObjs.uFlat
        },
        onComplete: () => {
          flatAnim()
        }
      })
    }

    const triAnim = () => {
      const uTri = Math.random() * 1
      gsap.to(animObjs, {
        uTri: uTri,
        //duration: Math.abs(animObjs.uTri - uTri) * 3,
        duration: 1,
        delay: 0,
        ease: "linear",
        onUpdate: () => {
          this.frontMaterial!.uniforms.uTri.value = animObjs.uTri
          this.backMaterial!.uniforms.uTri.value = animObjs.uTri
        },
        onComplete: () => {
          triAnim()
        }
      })
    }

/*     boxAnim()
    flatAnim()
    triAnim()
 */


    this.gui!.add(myObject, 'uBox')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.frontMaterial!.uniforms.uBox.value = value
        this.backMaterial!.uniforms.uBox.value = value

      });
    this.gui!.add(myObject, 'uFlat')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.frontMaterial!.uniforms.uFlat.value = value
        this.backMaterial!.uniforms.uFlat.value = value
      });

    this.gui!.add(myObject, 'uTri')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.frontMaterial!.uniforms.uTri.value = value
        this.backMaterial!.uniforms.uTri.value = value
      });


    this.gui.add(
      { maxPullDistance: this.maxPullDistance },
      'maxPullDistance',
      0.5,
      5.0,
      0.1
    ).onChange((value: number) => {
      this.maxPullDistance = value;
      this.frontMaterial!.uniforms.uMaxPullDistance.value = value;
      this.backMaterial!.uniforms.uMaxPullDistance.value = value;
    });



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



  // シンプルな引っ張りインタラクションのセットアップメソッド
  private setupSimplePullInteraction(): void {
    // マウス移動イベント
    window.addEventListener('mousemove', (event) => {
      // マウス位置を正規化 (-1 ~ 1 の範囲)
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);

      this.updateMouseWorldPosition();
    });

    // マウスダウンイベント


    // マウスアップイベント

    // タッチイベントのサポート（モバイル用）
    window.addEventListener('touchstart', (event) => {
      if (event.touches.length > 0) {
        ///this.isPulling = true;
        this.mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -((event.touches[0].clientY / window.innerHeight) * 2 - 1);
        this.updateMouseWorldPosition();
      }
    });

    window.addEventListener('touchmove', (event) => {
      if (event.touches.length > 0) {
        this.mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -((event.touches[0].clientY / window.innerHeight) * 2 - 1);
        this.updateMouseWorldPosition();
      }
    });

    window.addEventListener('touchend', () => {
      //this.isPulling = false;
    });
  }


  // マウスの3D空間での位置を更新
  private updateMouseWorldPosition(): void {
    // マウス位置をスクリーン上の点（z=0.5）として扱い、3D空間に変換
    console.log('this.mouse:', this.mouse);
    const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
    vector.unproject(this.camera);

    const camPos = this.camera.position;
    const dir = vector.sub(camPos).normalize();

    // レイの始点、方向、距離
    const distance = -camPos.z / dir.z;

    // ワールド空間でのマウス位置
    this.mouseWorldPosition.copy(camPos).add(dir.multiplyScalar(distance));

    // シェーダーユニフォームを更新
    if (this.frontMaterial && this.backMaterial) {
      console.log('this.mouseWorldPosition:', this.mouseWorldPosition);
      this.frontMaterial.uniforms.uMouseWorldPosition.value.copy(this.mouseWorldPosition);
      this.backMaterial.uniforms.uMouseWorldPosition.value.copy(this.mouseWorldPosition);
    }
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



    // Raycasterの更新（毎フレーム）
    if (this.controls.enabled) {

    }

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