import "@splidejs/splide/css";
import "@splidejs/splide/css/skyblue";
import "@splidejs/splide/css/sea-green";
import "@splidejs/splide/css/core";
import * as THREE from 'three';
import { getVh, lerp, numToArray } from './Common/utils';
import { createSphereGeometry } from './sphere';


export default class Stage {
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  bufferScene: THREE.Scene | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  shaderMaterial: THREE.ShaderMaterial | null;
  renderTarget: THREE.WebGLRenderTarget | null = null;
  sphere: THREE.Points | THREE.Mesh | null = null;
  mesh: THREE.Mesh | null = null;
  basicMaterial: THREE.ShaderMaterial | THREE.MeshBasicMaterial | null;
  timer: number = 0;
  fvAnimEnd: boolean = false;

  constructor() {
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
        Math.min(4096
          / window.innerWidth, 3)
    );

    this.renderer.setSize(window.innerWidth, vh);
    this.camera.position.z = 5;

    const coordinates = [
      [-1, -1],
      [1, -1],
      [-0.8, 0],
      [1, -0.3],
      [0, 0.2],
      [1, 1],
      [-1, 1],
    ];

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
    const positions: number[][] = [];
    lerpCord.forEach(({ x, y }) => {
      positions.push([x, y]); // Z軸を0に固定
    });



    const shape = new THREE.Shape();
    shape.moveTo(positions[0][0], positions[0][1]); // 最初の座標で移動
    for (let i = 1; i < positions.length; i++) {
      shape.lineTo(positions[i][0], positions[i][1]); // 各座標に線を描く
    }
    shape.closePath(); // パスを閉じる

    const geometry = new THREE.ShapeGeometry(shape);

    const sphereGeometry = true ? geometry
      : createSphereGeometry(15, 15, 1, new THREE.Color(0xff0000));

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
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`,
      fragmentShader: `
        void main() {
            gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
        }
      `
    }) : new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });

    this.sphere = new THREE.Mesh(sphereGeometry, this.basicMaterial);

    this.scene.add(this.sphere);
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

  animate = (time: number) => {
    requestAnimationFrame(this.animate);

    if (!this.renderer) return
    if (!this.renderTarget) return
    if (!this.camera) return
    if (!this.bufferScene) return
    if (!this.scene) return
    if (!this.shaderMaterial) return
    if (!this.sphere) return


    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.bufferScene, this.camera);
    const data = new Float32Array(16 * 16 * 4);
    this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, 16, 16, data);

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