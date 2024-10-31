/* import norenV from './glsl/base.vert?raw'
import norenF from './glsl/base.frag?raw' */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { controlledShuffle, shuffleEase } from './ItemLogo/random';
import LogoVert from './glsl/logo.vert?raw';
import LogoFrag from './glsl/logo.frag?raw';



export default class ItemLogo {
  material!: THREE.ShaderMaterial | null;
  composer: EffectComposer | null = null;
  planeGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  timer: any = 0;
  instancedMesh: THREE.InstancedMesh | null = null;

  sceneWidth: number = 3
  aspect: number = 1
  sceneHeight: number = 3
  constructor(
    sceneWidth: number,
    sceneHeight: number,
    aspect: number = 1
  ) {

    this.sceneWidth = sceneWidth
    this.sceneHeight = sceneHeight
    this.aspect = aspect
    //this.initDatGUI()

    this.init()
    this.onChange()
  }



  init() {
    const WIDTH_RATE = 0.4

    const issp = window.innerWidth < 767
    const picWidth = this.sceneWidth * WIDTH_RATE * (issp ? 1.4 : 1)

    const picHeight = picWidth * (3 / 11) * this.aspect
    const MATH_WIDTH = picWidth / this.MATH_COUNT.x
    const MATH_HEIGHT = picWidth / this.MATH_COUNT.x * this.aspect;

    this.planeGeometry = new THREE.PlaneGeometry(MATH_WIDTH, MATH_HEIGHT, 1, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: LogoVert,
      fragmentShader: LogoFrag,
      transparent: true,
    });

    this.material = material;

    const count = this.MATH_COUNT.x * this.MATH_COUNT.y;
    this.instancedMesh = new THREE.InstancedMesh(this.planeGeometry, material, count + 1);

    const matrix = new THREE.Matrix4();
    let index = 0;


    const margin = (0.5 - 0.4) / 2 * this.sceneWidth
    const offsetX = -picWidth + this.sceneWidth / 2 - margin



    const offsetY = -MATH_HEIGHT * 0.5 + picHeight - this.sceneHeight / 2 + margin


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
    matrix.makeTranslation(
      offsetX + 3 * MATH_WIDTH,  // x方向の間隔は0.25
      offsetY - 2 * MATH_HEIGHT,   // y方向の間隔は0.5
      0
    );
    this.instancedMesh.setMatrixAt(index, matrix);
    index++;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  counttt = 0
  MATH_COUNT = {
    x: 11,
    y: 3
  }

  resize(aspect: number) {
    this.aspect = aspect
    this.init()
  }

  onChange = () => {
    this.counttt++
    const logoIndex = [
      2, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0,
      1, 0, 1, 1, 0, 0, 2, 0, 1, 2, 1,
      0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1,
      2,
    ]

    if (this.animType === 0) {
      const iba = shuffleEase(
        logoIndex,
        this.timer,
        this.onChange,
        this.counttt,
        this.MATH_COUNT.x * this.MATH_COUNT.y + 1,
        true
      )
      this.planeGeometry.setAttribute(
        'aIndex',
        iba,

      );
    } else if (this.animType === 1) {
      let _instanceIndices = logoIndex
      const allRate = 16
      const logologo = 9
      const logo = (this.counttt % allRate) < logologo
      if (logo) {
        this.timer = setTimeout(() => {
          this.onChange()
        }, this.animInterval);
      } else {
        _instanceIndices = controlledShuffle(_instanceIndices, 0.99)
        _instanceIndices[_instanceIndices.length - 1] = 0
        this.timer = setTimeout(() => {
          this.onChange()
        }, this.animInterval);

      }
      const instanceIndices = new Float32Array(
        this.MATH_COUNT.x * this.MATH_COUNT.y + 1
      );
      for (
        var l = 0; l < instanceIndices.length; l++
      ) {
        instanceIndices[l] = _instanceIndices[l];
      }
      this.planeGeometry.setAttribute(
        'aIndex',
        new THREE.InstancedBufferAttribute(instanceIndices, 1)
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