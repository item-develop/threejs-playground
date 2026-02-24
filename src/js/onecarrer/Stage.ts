import * as THREE from 'three';
import { EffectComposer, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';

import baseVert from '../glsl/base.vert?raw'
import { Mouse } from './Mouse';
import { onecarrerSnoise, snoise } from '../Common/common';


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
  Mouse!: Mouse;
  private init(): void {


    const canvas = document.getElementById('grad-bg') as HTMLCanvasElement;
    this.Mouse = new Mouse();
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
        alpha: true,
        canvas
      }
    );
    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        Math.min(4096
          / window.innerWidth, 3)
    );
    this.scene = new THREE.Scene();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);


    this.stats = new Stats();
  }

  addObject = () => {
    const geometory = new THREE.PlaneGeometry(
      CANVAS_WIDTH,
      CANVAS_WIDTH / this.getCanvasSize().aspect, 32, 32
    );
    const texture = new THREE.TextureLoader().load('/flame.png');

    const material = new THREE.ShaderMaterial({
      vertexShader: baseVert,
      fragmentShader: `
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform bool uIsSp;
      varying vec2 vUv;

      ${onecarrerSnoise}


      float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
}


      vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;
    
    if (hsl.y == 0.0) {
        rgb = vec3(hsl.z); // Luminance
    } else {
        float f2;
        
        if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
        else
            f2 = hsl.z + hsl.y - hsl.y * hsl.z;
            
        float f1 = 2.0 * hsl.z - f2;
        
        rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
        rgb.g = hue2rgb(f1, f2, hsl.x);
        rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
    }   
    return rgb;
}

vec3 hsl2rgb(float h, float s, float l) {
    return hsl2rgb(vec3(h, s, l));
}


void main(){
  vec2 uv = vUv;
  vec2 centeredUv = uv - vec2(0.5);
  float aspect = uResolution.x / uResolution.y;
  centeredUv.x *= aspect;
  uv = centeredUv + vec2(0.5);

  vec2 mouseUv = uMouse * 0.5 * aspect + vec2(0.5);

  float noise = snoise(vec3(centeredUv * 0.7, uTime * 0.1));
  float noise2 = snoise(vec3((centeredUv + vec2(0.5)) * 1.3, uTime * 0.15));
  float fbmNoise = fbm(vec3(centeredUv * 120., uTime * .5), 2);

  uv.x = (uv.x - 0.5) * (1. + .9*noise) + 0.5; // アスペクト比を考慮してUVを調整
  float mouseDistance = distance(uv, mouseUv);
  // mouseDistance += noise * 0.2;
  mouseDistance = clamp((uIsSp?2.4:1.3) * mouseDistance, 0.0, 0.7);
  mouseDistance = pow(mouseDistance, 1.5);
  mouseDistance = 1.0 - (1.0 - mouseDistance) * (1.0 - fbmNoise * 0.02);

  // 0〜1 に正規化
  float d = mouseDistance / 0.7;

  // カラーランプ: 赤 → オレンジ → 黄 → 水色 → 青（緑を飛ばす）
  vec3 red    = vec3(1.0, 0.1, 0.05);
  vec3 orange = vec3(1.0, 0.55, 0.05);
  vec3 yellow = vec3(0.9, 0.8, 0.14);
 vec3 cyan   = vec3(0.15, 0.7, 0.65);  // 元: vec3(0.2, 0.7, 0.9) → 緑寄りに

  //vec3 blue   = vec3(0.12, 0.4, 0.75);
  vec3 blue = vec3(0.04, 0.37, 0.84);

  vec3 col = red;
  col = mix(col, yellow, smoothstep(0.0 +(noise2+1.) /2. * 0.1, 0.5, d));
  col = mix(col, cyan, smoothstep(0.44, 0.7, d));
  col = mix(col, blue, smoothstep(0.6, 1.0, d));



float brightness = 0.95 + 0.08 * fbmNoise;
vec3 blueTinted = blue * brightness;


  col = mix(col, blueTinted, smoothstep(0.55, 0.95, d));

  gl_FragColor = vec4(col, 1.0);
}

      `,
      uniforms: {
        uTexture: {
          value: texture
        },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },

        uMouse: {
          value: new THREE.Vector2(0.0, 0.0)
        },
        uIsSp: {
          value: window.innerWidth < 767
        }
      }
    })


    this.mesh = new THREE.Mesh(geometory, material);
    this.scene!.add(this.mesh);
  }
  mesh!: THREE.Mesh;






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
    this.camera.left = -CANVAS_WIDTH / 2;
    this.camera.right = CANVAS_WIDTH / 2;
    this.camera.top = (CANVAS_WIDTH / this.getCanvasSize().aspect) / 2;
    this.camera.bottom = -(CANVAS_WIDTH / this.getCanvasSize().aspect) / 2;

    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.PlaneGeometry(
      CANVAS_WIDTH,
      CANVAS_WIDTH / this.getCanvasSize().aspect, 32, 32
    );

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = time / 1000;
    mat.uniforms.uResolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (touchDevice) {
      const x = Math.sin(time / 3000) * 0.5 + 0.5 + Math.cos(time / 2000) * 0.5 + 0.5;
      const y = Math.cos(time / 3000) * 0.5 + 0.5 + Math.sin(time / 2000) * 0.5 + 0.5;
      mat.uniforms.uMouse.value = new THREE.Vector2(x * .5, y * 0.5);
    } else {
      mat.uniforms.uMouse.value = new THREE.Vector2(this.Mouse.lerpMouse.x, this.Mouse.lerpMouse.y);
    }
    mat.uniforms.uIsSp.value = window.innerWidth < 767

    this.render(time);
    this.stats.update();
  }
  private render(_time: number): void {
    this.renderer.render(this.scene!, this.camera)
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

