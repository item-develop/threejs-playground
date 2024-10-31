import blurFragmentShader from './glsl/blur.frag?raw'
import "@splidejs/splide/css";
import "@splidejs/splide/css/skyblue";
import "@splidejs/splide/css/sea-green";
import "@splidejs/splide/css/core";
import * as THREE from 'three';
import { getVh, lerp, numToArray } from './Common/utils';
import { createSphereGeometry } from './sphere';
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { getWeight } from './BlurStage';

const SceneConfig = {
  width: 100,
  height: 100,
  halfWidth: 50,
  halfHeight: 50,
  sceneWidth: 3,
  sceneHeight: 3,
  dpr: 1,
  aspectRatio: 1,
};

export default class Stage {
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  bufferScene: THREE.Scene | null = null;
  camera: THREE.OrthographicCamera | null = null;
  shaderMaterial: THREE.ShaderMaterial | null;
  fbo_1: THREE.WebGLRenderTarget | null = null;
  renderTarget2: THREE.WebGLRenderTarget | null = null;
  renderTarget3: THREE.WebGLRenderTarget | null = null;
  sphere: THREE.Points | THREE.Mesh | null = null;
  mesh: THREE.Mesh | null = null;
  composer: EffectComposer | null = null;
  timer: number = 0;
  fvAnimEnd: boolean = false;
  vertical: THREE.Mesh | null = null;
  horizontal: THREE.Mesh | null = null;
  textureDisplayMesh: THREE.Mesh | null = null;
  ShapeMesh: THREE.Mesh | null = null;
  fbo_2: THREE.WebGLRenderTarget | null = null;
  fbo_3: THREE.WebGLRenderTarget | null = null;

  constructor() {
    const vh = getVh(100)
    /* const SCREEN_WIDTH = window.innerWidth
    const SCREEN_HEIGHT = vh */
    const TEXTURE_SIZE = 10;
    /* const _RESOLUTION = {
      x: SCREEN_WIDTH * 2,
      y: SCREEN_HEIGHT * 2
    } */

    const body = document.querySelector('body') as HTMLElement;
    const canvas = document.createElement('canvas');
    canvas.id = 'three-canvas';
    body.appendChild(canvas);
    this.scene = new THREE.Scene();
    this.bufferScene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    //    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10);

    this.camera = new THREE.OrthographicCamera(
      -SceneConfig.sceneWidth * 0.7,
      SceneConfig.sceneWidth * 0.7,
      SceneConfig.sceneHeight * 0.5,
      -SceneConfig.sceneHeight * 0.5,
      0.1,
      10
    );

    this.camera.position.set(0, 0, 5);


    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
    });

    this.renderer.setPixelRatio(
      2
    );

    this.renderer.setSize(window.innerWidth, vh);
    this.camera.position.z = 5;

    const coordinates = [
      [-1, -1],
      [-1, 1],
      [1, 1],
      [0.5, 0.5],
      [1, -0],
      [0.5, -0.5],
      [1, -1],
      [-1, -1],
    ];

    const lerpCord = numToArray(TEXTURE_SIZE * TEXTURE_SIZE).map(el => {
      const unit = (TEXTURE_SIZE * TEXTURE_SIZE) / (coordinates.length - 1);

      const startIndex = Math.floor(el / unit);
      const endIndex = startIndex + 1;
      const start = coordinates[startIndex];
      const end = coordinates[endIndex];

      let lerpRate = (el % unit) / (unit);

      if (TEXTURE_SIZE * TEXTURE_SIZE - 1 === el) {
        lerpRate = (el % unit) / (unit - 1);
      }

      const x = lerp(start[0], end[0], lerpRate);
      const y = lerp(start[1], end[1], lerpRate);
      return { x, y };
    });
    lerpCord[lerpCord.length - 1] = lerpCord[0];
    const positions: number[][] = coordinates;
    const positions2: number[][] = [];
    console.log('lerpCord:', lerpCord);
    lerpCord.forEach(({ x, y }) => {
      positions2.push([x, y]); // Z軸を0に固定
    });

    console.log('positions:', positions);
    const shape = new THREE.Shape();
    shape.moveTo(positions[0][0], positions[0][1]); // 最初の座標で移動
    for (let i = 1; i < positions.length; i++) {
      console.log('positions[i][0]:', positions[i][0]);
      shape.lineTo(positions[i][0], positions[i][1]); // 各座標に線を描く
    }
    shape.closePath(); // パスを閉じる



    const shape2 = new THREE.Shape();

    shape2.moveTo(positions2[0][0], positions2[0][1]); // 最初の座標で移動
    for (let i = 1; i < positions2.length; i++) {
      shape2.lineTo(positions2[i][0], positions2[i][1]); // 各座標に線を描く
    }
    shape2.closePath(); // パスを閉じる
    const geometry = new THREE.ShapeGeometry(shape2);
    console.log('geometry:', geometry);
    const geometry2 = new THREE.ShapeGeometry(shape2);
    const sphereGeometry = true ? geometry
      : createSphereGeometry(15, 15, 1, new THREE.Color(0xff0000));

    this.fbo_1 = new THREE.WebGLRenderTarget(TEXTURE_SIZE * TEXTURE_SIZE, 1,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        // format: THREE.RGBFormat,
        type: THREE.FloatType,

      }
    );
    this.fbo_2 = new THREE.WebGLRenderTarget(TEXTURE_SIZE * TEXTURE_SIZE, 1,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        // format: THREE.RGBFormat,
        type: THREE.FloatType,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
      }
    );
    this.fbo_3 = new THREE.WebGLRenderTarget(TEXTURE_SIZE * TEXTURE_SIZE, 1,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        type: THREE.FloatType,

      }
    );

    const planeGeometry = new THREE.PlaneGeometry(6, 1);
    const eRange = 40
    const weight = getWeight(eRange)
    console.log('weight:', weight);
    const commonUniforms = {
      weight: {
        value: weight
      },
      uResolution: {
        value: new THREE.Vector2(TEXTURE_SIZE * TEXTURE_SIZE, 1)
      },
      uStep: {
        value: new THREE.Vector2(1, 1)
      }
    }

    console.log('sphereGeometry.attributes.position:', sphereGeometry.attributes.position);
    sphereGeometry.setAttribute('pIndex', new THREE.Float32BufferAttribute(new Array(sphereGeometry.attributes.position.count).fill(0).map((_, i) => i), 1));
    console.log('sphereGeometry:', sphereGeometry);
    this.shaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: `
        attribute float pIndex;
        uniform sampler2D txt;
        uniform mat4 mvpMatrix;
        uniform vec2 uResolution;
        void main() {
            float fragX = 1.0 / uResolution.x;
            float fragY = 1.0 / uResolution.y;
            float texShiftX = 0.5 * fragX;
            float texShiftY = 0.5 * fragY;
            float pu = fract(pIndex * fragX + texShiftX);
            float pv = floor(pIndex * fragX) * fragX + texShiftY;
            vec3 tPosition = texture2D(txt, vec2(pu, pv)).rgb * 2.0 - 1.0;
            float posiLength = texture2D(txt, vec2(pu, pv)).a;
            gl_PointSize = 30.0;
            gl_Position = mvpMatrix * vec4(tPosition * posiLength, 1.0);
            
        }
      `,
      fragmentShader: `
         uniform sampler2D txt;

        void main() {
            gl_FragColor = texture2D(txt, gl_PointCoord);
            //gl_FragColor =vec4(1.,0.,0.,1.) ;
        }
      `,
      uniforms: {
        txt: { value: this.fbo_3.texture },
        uResolution: {
          value: new THREE.Vector2(
            TEXTURE_SIZE * TEXTURE_SIZE,
            1
          )
        },
        mvpMatrix: { value: new THREE.Matrix4() }
      }
    });

    const boxGeometory = new THREE.PlaneGeometry(1, 1, 12, 12);

    console.log('sphereGeometry:', sphereGeometry);
    console.log('boxGeometory:', boxGeometory);
    console.log('geometry2:', geometry2);
    geometry2.setAttribute('pIndex', new THREE.Float32BufferAttribute(new Array(geometry2.attributes.position.count).fill(0).map((_, i) => i), 1));
    this.sphere = new THREE.Points(geometry2, this.shaderMaterial);
    //this.sphere = new THREE.Mesh(geometry2, this.shaderMaterial);
    //this.sphere = new THREE.Mesh(sphereGeometry, this.basicMaterial);

    //    this.scene.add(this.sphere);

    const commonVertexShader = `
    varying vec2 vTexCoord;
    void main() {
      vTexCoord = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `

    this.vertical = new THREE.Mesh(
      planeGeometry,
      new THREE.ShaderMaterial({
        vertexShader: commonVertexShader,
        fragmentShader: blurFragmentShader,
        uniforms: {
          uDiffuse: {
            value: this.fbo_1.texture
          },
          horizontal: {
            value: false
          },
          ...commonUniforms,
          uStep: {
            value: new THREE.Vector2(0, 0)
          }
        },
      })
    );

    this.horizontal = new THREE.Mesh(
      planeGeometry,
      new THREE.ShaderMaterial({
        vertexShader: commonVertexShader,
        fragmentShader: blurFragmentShader,
        uniforms: {
          uDiffuse: {
            value: this.fbo_2.texture
          },
          horizontal: {
            value: true
          },
          uIsSlip: {
            value: false
          },
          ...commonUniforms,

        },
      })
    );
    this.bufferScene = new THREE.Scene();
    const bufferMaterial = new THREE.RawShaderMaterial({
      vertexShader: `
                attribute vec3 position;
                attribute float pIndex;
                varying vec4 vColor;
                uniform vec2 uResolution;
                
                void main() {
                    float fragX = 1.0 / uResolution.x;
                    float fragY = 1.0 / uResolution.y;
                    float texShiftX = 0.5 * fragX;
                    float texShiftY = 0.5 * fragY;
                    vColor = vec4((normalize(position.xyz) + 1.0) * 0.5,
                    length(position)
                    );
                    float pu = fract(pIndex * fragX) * 2.0 - 1.0;
                    float pv = floor(pIndex * fragX) * fragY * 2.0 - 1.0;
                    gl_Position = vec4(pu + texShiftX, pv + texShiftY, 0.0, 1.0);
                    gl_PointSize = 1.0;
                }
            `,
      fragmentShader: `
      precision highp float;

                varying vec4 vColor;
                void main() {
                    gl_FragColor = vColor;
                }
            `,
      uniforms: {
        uResolution: {
          value: new THREE.Vector2(TEXTURE_SIZE * TEXTURE_SIZE, 1)
        }
      }
    });

    const bufferMesh = new THREE.Points(sphereGeometry, bufferMaterial);

    this.bufferScene.add(bufferMesh);

    this.textureDisplayMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: commonVertexShader,
        fragmentShader: `
          uniform sampler2D txt;
          varying vec2 vTexCoord;
          void main() {
            gl_FragColor = texture2D(txt, vTexCoord);
          }
        `,
        uniforms: {
          txt: { value: this.fbo_3.texture }
        }
      })
    )
    this.ShapeMesh = new THREE.Mesh(
      sphereGeometry,
      new THREE.ShaderMaterial({
        vertexShader: commonVertexShader,
        fragmentShader: `
          uniform sampler2D txt;
          varying vec2 vTexCoord;
          void main() {
            gl_FragColor = texture2D(txt, vTexCoord);
          }
        `,
        uniforms: {
          txt: { value: this.fbo_1.texture }
        }
      })
    )
    requestAnimationFrame(this.animate);
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    if (!this.renderer) return
    if (!this.fbo_1) return
    if (!this.camera) return
    if (!this.bufferScene) return
    if (!this.scene) return
    if (!this.shaderMaterial) return
    if (!this.sphere) return
    if (!this.vertical) return
    if (!this.horizontal) return
    if (!this.textureDisplayMesh) return


    this.renderer.setRenderTarget(this.fbo_1);
    this.renderer.render(this.bufferScene, this.camera);


    //this.composer?.render();
    /*    console.log('this.composer:', this.composer);
       const data = new Float32Array(16 * 16 * 4);
       this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, 16, 16, data);
       
       */

    this.renderer.setRenderTarget(this.fbo_2);
    this.renderer.render(this.vertical, this.camera);
    this.renderer.setRenderTarget(this.fbo_3);
    this.renderer.render(this.horizontal, this.camera);
    this.renderer.setRenderTarget(null);

    this.shaderMaterial.uniforms.mvpMatrix.value.copy(this.camera.projectionMatrix).multiply(this.camera.matrixWorldInverse);

    this.timer += 0.01;
    this.renderer.setRenderTarget(null);
    if (true) {
      this.renderer.render(this.sphere, this.camera);
    } else {
      //this.renderer.render(this.ShapeMesh, this.camera);
     // this.renderer.render(this.textureDisplayMesh, this.camera);
    }



    /*     this.camera.position.x = Math.sin(this.timer) * 5;
        this.camera.position.z = Math.cos(this.timer) * 5;
        this.camera.position.y = Math.sin(this.timer) * 5;
        this.camera.lookAt(0, 0, 0);
     */


  }
}