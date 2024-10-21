import norenV from './glsl/base.vert?raw'
import norenF from './glsl/base.frag?raw'
import "@splidejs/splide/css";
import "@splidejs/splide/css/skyblue";
import "@splidejs/splide/css/sea-green";
import "@splidejs/splide/css/core";
import * as THREE from 'three';
import { getVh, isSP, lerp } from './Common/utils';
import { EffectComposer, RenderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';
import { createSphereGeometry } from './sphere';


type Point = [number, number];

function splineInterpolation(points: Point[], numPoints: number = 100): Point[] {
  const n = points.length;
  const result: Point[] = [];

  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < n - 2 ? points[i + 2] : points[i + 1];

    for (let j = 0; j < numPoints / (n - 1); j++) {
      const t = j / (numPoints / (n - 1));
      const tt = t * t;
      const ttt = tt * t;

      const q1 = -ttt + 2 * tt - t;
      const q2 = 3 * ttt - 5 * tt + 2;
      const q3 = -3 * ttt + 4 * tt + t;
      const q4 = ttt - tt;

      const tx = 0.5 * (p0[0] * q1 + p1[0] * q2 + p2[0] * q3 + p3[0] * q4);
      const ty = 0.5 * (p0[1] * q1 + p1[1] * q2 + p2[1] * q3 + p3[1] * q4);

      result.push([tx, ty]);
    }
  }

  return result;
}

function gaussianBlur(points: Point[], sigma: number): Point[] {
  const blurredPoints: Point[] = [];
  const kernelSize = Math.ceil(sigma * 3) * 2 + 1;

  for (let i = 0; i < points.length; i++) {
    let sumX = 0, sumY = 0, weightSum = 0;

    for (let j = -kernelSize; j <= kernelSize; j++) {
      const index = Math.min(Math.max(i + j, 0), points.length - 1);
      const weight = Math.exp(-(j * j) / (2 * sigma * sigma));

      sumX += points[index][0] * weight;
      sumY += points[index][1] * weight;
      weightSum += weight;
    }

    blurredPoints.push([sumX / weightSum, sumY / weightSum]);
  }

  return blurredPoints;
}

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

const yobun = 0.02

export default class Stage {
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  bufferScene: THREE.Scene | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  shaderMaterial: THREE.ShaderMaterial | null;
  renderTarget: THREE.WebGLRenderTarget | null = null;
  sphere: THREE.Points | null = null;
  mesh: THREE.Mesh | null = null;
  basicMaterial: THREE.ShaderMaterial | null;
  timer: number = 0;
  fvAnimEnd: boolean = false;

  constructor() {
    // ... (previous constructor code remains the same)

    const vh = getVh(100)
    const body = document.querySelector('body') as HTMLElement;
    const canvas = document.createElement('canvas');
    canvas.id = 'three-canvas';


    body.appendChild(canvas);




    this.scene = new THREE.Scene();
    this.bufferScene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);



    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10);
    this.camera.position.set(0, 0, 5);


    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
    });

    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        /* Math.min(window.devicePixelRatio, 2) */
        Math.min(4096
          / window.innerWidth, 3)
    );

    this.renderer.setSize(window.innerWidth, vh);
    this.camera.position.z = 5;


    // 使用例
    /* const coordinates = [
      [-1, 0],
      [1, 0],

    ]; */
      const coordinates = [
        [-1, -1],
        [1, -1],
        [-0.8, 0],
        [1, -0.3],
        [0, 0.2],
        [1, 1],
        [-1, 1]
      ];

    // 256個の頂点に補間
    const numToArray = num => new Array(num).fill(0).map((_, i) => i);
    const lerp = (a, b, t) => a + (b - a) * t; // 線形補間関数
    const lerpCord = numToArray(256).map(el => {
      const unit = 256 / (coordinates.length - 1);
      const startIndex = Math.floor(el / unit);
      const endIndex = startIndex + 1;
      const start = coordinates[startIndex];
      const end = coordinates[endIndex];
      const lerpRate = (el % unit) / unit;
      const x = lerp(start[0], end[0], lerpRate);
      const y = lerp(start[1], end[1], lerpRate);
      return { x, y };
    });

    const positions: number[] = [];
    lerpCord.forEach(({ x, y }) => {
      positions.push(x, y, 0); // Z軸を0に固定
    });
    console.log('positions:', positions);
    // BufferGeometryを使用してジオメトリを作成
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(positions);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    console.log('geometry:', geometry);

    const sphereGeometry = true ? geometry
      : createSphereGeometry(15, 15, 1, new THREE.Color(0xff0000));

    console.log('sphereGeometry:', sphereGeometry);


    // シェーダーマテリアルの作成
    const textureSize = 16;
    this.renderTarget = new THREE.WebGLRenderTarget(textureSize, textureSize,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        // format: THREE.RGBFormat,
        type: THREE.FloatType
      }
    );
    sphereGeometry.setAttribute('index', new THREE.Float32BufferAttribute(new Array(sphereGeometry.attributes.position.count).fill(0).map((_, i) => i), 1));
    this.shaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: `
        attribute float index;
        uniform sampler2D txt;
        uniform mat4 mvpMatrix;

        const float frag = 1.0 / 16.0;
        const float texShift = 0.5 * frag;

        void main() {
            float pu = fract(index * frag + texShift);
            float pv = floor(index * frag) * frag + texShift;
            vec3 tPosition = texture2D(txt, vec2(pu, pv)).rgb * 2.0 - 1.0;
            float posiLength = texture2D(txt, vec2(pu, pv)).a;
            gl_Position = mvpMatrix * vec4(tPosition * posiLength, 1.0);
            gl_PointSize = 30.0;
        }
      `,
      fragmentShader: `
         uniform sampler2D txt;

        void main() {
            gl_FragColor = texture2D(txt, gl_PointCoord);
        }
      `,
      uniforms: {
        txt: { value: this.renderTarget.texture },
        mvpMatrix: { value: new THREE.Matrix4() }
      }
    });


    this.basicMaterial = true ? new THREE.ShaderMaterial({
      vertexShader: `
void main() {
  gl_PointSize = 30.0;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`,
      fragmentShader: `
        void main() {
            gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
        }
      `
    }) : new THREE.MeshBasicMaterial({ color: 0xff0000 });



    // 頂点データを格納するためのオブジェクト
    this.sphere = new THREE.Points(sphereGeometry, this.shaderMaterial);
    //this.sphere = new THREE.Points(sphereGeometry, this.basicMaterial);

    this.scene.add(this.sphere);

    // テクスチャに頂点データを描画
    this.bufferScene = new THREE.Scene();
    const bufferMaterial = new THREE.RawShaderMaterial({
      vertexShader: `
                attribute vec3 position;
                attribute float index;
                varying vec4 vColor;
                const float frag = 1.0 / 16.0;
                const float texShift = 0.5 * frag;

                void main() {
                    vColor = vec4((normalize(position.xyz) + 1.0) * 0.5,
                    length(position)
                    );
                    float pu = fract(index * frag) * 2.0 - 1.0;
                    float pv = floor(index * frag) * frag * 2.0 - 1.0;
                    gl_Position = vec4(pu + texShift, pv + texShift, 0.0, 1.0);
                    gl_PointSize = 1.0;
                }
            `,
      fragmentShader: `
      precision highp float;

                varying vec4 vColor;
                void main() {
                    gl_FragColor = vColor;
                }
            `
    });

    const bufferMesh = new THREE.Points(sphereGeometry, bufferMaterial);

    this.bufferScene.add(bufferMesh);


    requestAnimationFrame(this.animate);
  }


  createCustomPlaneGeometry(coordinates: number[][]): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Calculate bounding box for UV mapping
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    coordinates.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    // Create vertices and UVs
    coordinates.forEach(([x, y]) => {
      vertices.push(x, y, 0);
      uvs.push(
        (x - minX) / (maxX - minX),
        (y - minY) / (maxY - minY)
      );
    });

    // Create indices for triangulation
    for (let i = 1; i < coordinates.length - 1; i++) {
      indices.push(0, i, i + 1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  count = 0
  animate = (time: number) => {
    requestAnimationFrame(this.animate);

    if (!this.renderer) return
    if (!this.renderTarget) return
    if (!this.camera) return
    if (!this.bufferScene) return
    if (!this.scene) return
    if (!this.shaderMaterial) return
    if (!this.sphere) return


    // フレームバッファへの描画
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.bufferScene, this.camera);

    if(this.count===0){

      const texture = this.renderTarget.texture
      // データを読み出す
      const data = new Float32Array(16 * 16 * 4);
      this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, 16, 16, data);
      
      console.log('data:', data);
      this.count++
    }

    this.renderer.setRenderTarget(null);


    this.shaderMaterial.uniforms.mvpMatrix.value.copy(this.camera.projectionMatrix).multiply(this.camera.matrixWorldInverse);

    /*     this.camera.position.x = Math.sin(this.timer) * 5;
        this.camera.position.z = Math.cos(this.timer) * 5;
        this.camera.position.y = Math.sin(this.timer) * 5;
        this.camera.lookAt(0, 0, 0);
     */
    this.timer += 0.01;

    this.renderer.render(this.scene, this.camera);


  }
}