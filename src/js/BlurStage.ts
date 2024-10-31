import blurFragmentShader from './glsl/blur.frag?raw'
import * as THREE from 'three';
import { getVh } from './Common/utils';

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

export const getWeight = (eRange: number) => {
  var weight = new Array(10);
  var t = 0.0;
  var d = eRange * eRange / 100;
  for (var i = 0; i < weight.length; i++) {
    var r = 1.0 + 2.0 * i;
    var w = Math.exp(-0.5 * (r * r) / d);
    weight[i] = w;
    if (i > 0) { w *= 2.0; }
    t += w;
  }
  for (i = 0; i < weight.length; i++) {
    weight[i] /= t;
  }
  return weight;
}

export default class BlurStage {
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  scene2: THREE.Scene | null = null;
  camera: THREE.OrthographicCamera | null = null;
  fbo_1: THREE.WebGLRenderTarget | null = null;
  fbo_2: THREE.WebGLRenderTarget | null = null;
  material: THREE.MeshBasicMaterial | null;
  vertical: THREE.Mesh | null;
  horizontal: THREE.Mesh | null;

  timer: number = 0;
  fvAnimEnd: boolean = false;


  constructor() {
    const vh = getVh(100)
    const SCREEN_WIDTH = window.innerWidth
    const SCREEN_HEIGHT = vh
    console.log('SCREEN_HEIGHT:', SCREEN_HEIGHT);
    const RESOLUTION = {
      x: SCREEN_WIDTH * 2,
      y: SCREEN_HEIGHT * 2
    }
    const body = document.querySelector('body') as HTMLElement;
    const canvas = document.createElement('canvas');
    canvas.id = 'three-canvas';
    body.appendChild(canvas);

    this.scene = new THREE.Scene();
    this.scene2 = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.OrthographicCamera(
      -SceneConfig.sceneWidth * 0.5,
      SceneConfig.sceneWidth * 0.5,
      SceneConfig.sceneHeight * 0.5,
      -SceneConfig.sceneHeight * 0.5,
      0.1,
      10
    );
    this.camera.position.z = 5;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    this.renderer.setPixelRatio(
      2
    );
    this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
    })
    this.material = material;
    const plane = new THREE.Mesh(geometry, material);
    this.scene.add(plane);

    this.fbo_1 = new THREE.WebGLRenderTarget(RESOLUTION.x, RESOLUTION.y);
    this.fbo_2 = new THREE.WebGLRenderTarget(RESOLUTION.x, RESOLUTION.y);

    const eRange = 100
    const commonUniforms = {
      weight: {
        value: getWeight(eRange)
      },
      uResolution: {
        value: new THREE.Vector2(RESOLUTION.x, RESOLUTION.y)
      },
      uStep: {
        value: new THREE.Vector2(10, 10)
      }
    }
    const polygon = new THREE.PlaneGeometry(SceneConfig.sceneWidth, SceneConfig.sceneHeight, 100, 100);

    const commonVertexShader = `
        varying vec2 vTexCoord;
        void main() {
          vTexCoord = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `
    this.vertical = new THREE.Mesh(
      polygon,
      new THREE.ShaderMaterial({
        vertexShader: commonVertexShader,
        fragmentShader: blurFragmentShader,
        uniforms: {
          uDiffuse: {
            value: this.fbo_2.texture
          },
          horizontal: {
            value: false
          },
          ...commonUniforms
        },
      })
    );
    this.horizontal = new THREE.Mesh(
      polygon,
      new THREE.ShaderMaterial({
        vertexShader: commonVertexShader,
        fragmentShader: blurFragmentShader,
        uniforms: {
          uDiffuse: {
            value: this.fbo_1.texture
          },
          horizontal: {
            value: true
          },
          ...commonUniforms
        },
      })
    );



    requestAnimationFrame(this.animate);
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    if (this.material) {
      //this.material.uniforms.time.value = time * 0.001;
    }
    if (!this.renderer) return
    if (!this.vertical) return


    if (false) {
      //this.renderer.setRenderTarget(null);
      //this.renderer.render(this.scene!, this.camera!);
    } else {

      this.renderer.setRenderTarget(this.fbo_1);
      this.renderer.render(this.scene!, this.camera!);

      this.renderer.setRenderTarget(this.fbo_2);
      this.renderer.render(this.horizontal!, this.camera!);

      this.renderer.setRenderTarget(null);
      this.renderer?.render(this.vertical!, this.camera!);

    }

  }
}