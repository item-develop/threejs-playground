/* import norenV from './glsl/base.vert?raw'
import norenF from './glsl/base.frag?raw' */
import * as THREE from 'three';
import { numToArray } from './Common/utils';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { shuffleEase } from './ItemLogo/random';
import LogoVert from './glsl/itemPic.vert?raw';
import LogoFrag from './glsl/itemPic.frag?raw';



export default class ItemPic {
  material: THREE.ShaderMaterial | null;
  composer: EffectComposer | null = null;
  planeGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  timer: any = 0;
  instancedMesh: THREE.InstancedMesh | null = null;

  aspect: number = 1
  MATH_COUNT = {
    x: 11,
    y: 13
  }

  constructor(
    sceneWidth: number,
    _sceneHeight: number,
    aspect: number = 1,
    uTexture: THREE.Texture
  ) {

    const imgRatio = uTexture.source.data.naturalHeight / uTexture.source.data.naturalWidth
    const WIDTH_RATE = 0.4
    this.aspect = aspect
    this.initDatGUI()
    this.MATH_COUNT.y = Math.ceil(imgRatio * this.MATH_COUNT.x)
    const picWidth = sceneWidth * WIDTH_RATE
    const MATH_WIDTH = picWidth / this.MATH_COUNT.x
    const MATH_HEIGHT = picWidth / this.MATH_COUNT.x * aspect * imgRatio * (this.MATH_COUNT.x / this.MATH_COUNT.y);


    // 単一のプレーンのジオメトリを作成
    this.planeGeometry = new THREE.PlaneGeometry(MATH_WIDTH, MATH_HEIGHT, 1, 1);

    // シェーダーマテリアルの作成

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        uTexture: { value: uTexture },
        uXNum: { value: this.MATH_COUNT.x },
        uYNum: { value: this.MATH_COUNT.y },
      },
      vertexShader: LogoVert,
      fragmentShader: LogoFrag,
      transparent: true,
    });

    this.material = material;

    // InstancedMeshの作成（11x3=33個のインスタンス）
    const count = this.MATH_COUNT.x * this.MATH_COUNT.y;
    this.instancedMesh = new THREE.InstancedMesh(this.planeGeometry, material, count);

    // マトリックスを作成して各インスタンスの位置を設定
    const matrix = new THREE.Matrix4();
    let index = 0;

    // グリッドの中心を原点に合わせるためのオフセット
    const offsetX = -sceneWidth * 0.5 + (sceneWidth * 0.5 - picWidth) * 0.5

    const offsetY =
      /* (-SceneConfig.sceneHeight * 0.5 + (this.MATH_COUNT.y + 3) * MATH_WIDTH / 2)
      + */
      (this.MATH_COUNT.y * MATH_HEIGHT) / 2 - MATH_HEIGHT / 2;   // (3 * 0.5) / 2 を元に調整

    for (let y = 0; y < this.MATH_COUNT.y; y++) {
      for (let x = 0; x < this.MATH_COUNT.x; x++) {
        matrix.makeTranslation(
          offsetX + x * MATH_WIDTH + MATH_WIDTH / 2,  // x方向の間隔は0.25
          offsetY - y * MATH_HEIGHT,   // y方向の間隔は0.5
          0
        );
        this.instancedMesh.setMatrixAt(index, matrix);
        index++;
      }
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.onChange()
  }

  counttt = 0


  onChange = () => {
    this.counttt++

    if (this.animType === 0) {
      /*  let _instanceIndices = numToArray(this.MATH_COUNT.x * this.MATH_COUNT.y).map(el => {
         if (el > 10) {
           return 1
         } else {
           return 2
         }
       }) */
      const iba = shuffleEase(
        numToArray(this.MATH_COUNT.x * this.MATH_COUNT.y),
        this.timer,
        this.onChange,
        this.counttt,
        this.MATH_COUNT.x * this.MATH_COUNT.y
      )


      this.planeGeometry.setAttribute(
        'aIndex',
        iba
      );

    }
  }
  gui!: GUI;
  animType = 0
  animInterval = 150
  initDatGUI() {
    this.gui = new GUI()
    if (!this.gui.domElement.parentElement) return
    this.gui.domElement.parentElement.style.zIndex = "100000";

    const obj = { animType: this.animType, animInterval: this.animInterval };
    this.gui.add(obj, 'animType', 0, 2, 1).onChange(e => {
      this.animType = e
      clearTimeout(this.timer)
      this.onChange()
    }); // min, max, step

    this.gui.add(obj, 'animInterval', 10, 500, 5).onChange(e => {
      this.animInterval = e
    }); // min, max, step
  }

  render(
    time: number
  ) {
    {
      if (!this.material) return;
      this.material.uniforms.time.value = time * 0.001;
    }
  }
}