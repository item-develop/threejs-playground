import * as THREE from 'three';
import { EffectComposer, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import baseFrag from '../glsl/flame.frag?raw'
import baseVert from '../glsl/base.vert?raw'


const CANVAS_WIDTH = 3

export class Stage {
  private container!: HTMLDivElement;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;
  scene: THREE.Scene | null = null;

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.init();
    this.addObject();
    window.requestAnimationFrame(this.animate);
  }



  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;

  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.getCanvasSize()
    this.camera = new THREE.OrthographicCamera(
      -CANVAS_WIDTH / 2, CANVAS_WIDTH / 2,
      (CANVAS_WIDTH / this.getCanvasSize().aspect) / 2,
      -(CANVAS_WIDTH / this.getCanvasSize().aspect) / 2,
      0.1, 100);
    this.camera.position.y = 0;
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer(
      {
        alpha: true
      }
    );
    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        Math.min(4096
          / window.innerWidth, 3)
    );
    this.scene = new THREE.Scene();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();

    this.effectComposer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera)
    this.effectComposer.addPass(renderPass)

    const HorizontalBlurShader = {
      uniforms: {
        tDiffuse: { value: null },
        resolution: {
          value: new THREE.Vector2(
            window.innerWidth, window.innerHeight
          )
        },
        blurSize: { value: 3.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vUv = uv;
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float blurSize;
        varying vec2 vUv;
        
        void main() {
          vec2 texelSize = 1.0 / resolution;
          float strength = 1.0;
          
          // 水平方向のみぼかし
          vec4 sum = vec4(0.0);
          
          sum += texture2D(tDiffuse, vec2(vUv.x - 4.0 * texelSize.x * blurSize, vUv.y)) * 0.05;
          sum += texture2D(tDiffuse, vec2(vUv.x - 3.0 * texelSize.x * blurSize, vUv.y)) * 0.09;
          sum += texture2D(tDiffuse, vec2(vUv.x - 2.0 * texelSize.x * blurSize, vUv.y)) * 0.12;
          sum += texture2D(tDiffuse, vec2(vUv.x - 1.0 * texelSize.x * blurSize, vUv.y)) * 0.15;
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y)) * 0.18;
          sum += texture2D(tDiffuse, vec2(vUv.x + 1.0 * texelSize.x * blurSize, vUv.y)) * 0.15;
          sum += texture2D(tDiffuse, vec2(vUv.x + 2.0 * texelSize.x * blurSize, vUv.y)) * 0.12;
          sum += texture2D(tDiffuse, vec2(vUv.x + 3.0 * texelSize.x * blurSize, vUv.y)) * 0.09;
          sum += texture2D(tDiffuse, vec2(vUv.x + 4.0 * texelSize.x * blurSize, vUv.y)) * 0.05;
          
          gl_FragColor = sum;
        }
      `,
    };

    const VerticalBlurShader = {
      uniforms: {
        tDiffuse: { value: null },
        resolution: {
          value: new THREE.Vector2(
            window.innerWidth, window.innerHeight
          )
        },
        blurSize: { value: 3.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vUv = uv;
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float blurSize;
        varying vec2 vUv;
        
        void main() {
          vec2 texelSize = 1.0 / resolution;
          float strength = 1.0;
          
          // 垂直方向のみぼかし
          vec4 sum = vec4(0.0);
          
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 4.0 * texelSize.y * blurSize)) * 0.05;
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 3.0 * texelSize.y * blurSize)) * 0.09;
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 2.0 * texelSize.y * blurSize)) * 0.12;
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 1.0 * texelSize.y * blurSize)) * 0.15;
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y)) * 0.18;
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 1.0 * texelSize.y * blurSize)) * 0.15;
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 2.0 * texelSize.y * blurSize)) * 0.12;
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 3.0 * texelSize.y * blurSize)) * 0.09;
          sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 4.0 * texelSize.y * blurSize)) * 0.05;
          
          gl_FragColor = sum;
        }
      `,
    };

    // シェーダーパスを作成して追加
    const horizontalBlurPass = new ShaderPass(HorizontalBlurShader);
    horizontalBlurPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    horizontalBlurPass.uniforms.blurSize.value = 4.0;

    const verticalBlurPass = new ShaderPass(VerticalBlurShader);
    verticalBlurPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    verticalBlurPass.uniforms.blurSize.value = 4.0;

    // 水平方向と垂直方向のパスを順番に追加
    this.effectComposer.addPass(horizontalBlurPass);
    this.effectComposer.addPass(verticalBlurPass);

  }
  effectComposer: EffectComposer | null = null;
  addObject = () => {
    const geometory = new THREE.PlaneGeometry(1, 1);
    const texture = new THREE.TextureLoader().load('/flame.png');

    const material = new THREE.ShaderMaterial({
      vertexShader: baseVert,
      fragmentShader: baseFrag,
      uniforms: {
        uTexture: {
          value: texture
        },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      }
    })

    this.scene!.add(new THREE.Mesh(geometory, material));

  }




  getCanvasSize = () => {
    const height = getVh(100)
    const width = window.innerWidth
    return {
      height
      , width,
      aspect: width / height
    }
  }

  private onWindowResize(): void {
    //this.camera.aspect = this.getCanvasSize().width / this.getCanvasSize().height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  }
  private render(_time: number): void {
    this.effectComposer?.render()
    //this.renderer.render(this.scene!, this.camera)
  }
  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }
}

