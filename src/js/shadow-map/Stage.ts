import blurFragmentShader from '../glsl/blur.frag?raw'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh, isSP } from '../Common/utils';
import { ShadowMapViewer } from 'three/addons/utils/ShadowMapViewer.js';
import shadowFrag from '../glsl/shadow.frag'
import floorVert from '../glsl/output_floor.vert'
import floorFrag from '../glsl/output_floor.frag'
import boxVert from '../glsl/output_box.vert'
import boxFrag from '../glsl/output_box.frag'
import shadowPlaneVert from '../glsl/output_boxSdw.vert'
import shadowPlaneFrag from '../glsl/output_boxSdw.frag'
import Pack from './packing.glsl'
import gsap from 'gsap';
import { CustomEase } from 'gsap/all';

const frustumSize = 6;
const eRange = 100
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

gsap.registerPlugin(CustomEase)
export class Stage {
  viewport
    : {
      x: number
      y: number
    } = {
      x: 0,
      y: 0
    }
  private container!: HTMLDivElement;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;

  scene: THREE.Scene | null = null;
  finalScene!: THREE.Scene;

  commonUniforms!: any;
  uniforms!: any;

  fbo_1!: THREE.WebGLRenderTarget<THREE.Texture>;
  fbo_2!: THREE.WebGLRenderTarget<THREE.Texture>;
  fbo_3!: THREE.WebGLRenderTarget<THREE.Texture>;

  light: THREE.Light | null = null;

  sphere!: THREE.Mesh;
  floor!: THREE.Mesh;
  shadowPlane!: THREE.Mesh;
  vertical!: THREE.Mesh;
  horizontal!: THREE.Mesh;
  blurShadowMesh!: THREE.Mesh;
  finalSphere!: THREE.Mesh;

  geometory!: THREE.BoxGeometry;
  polygonGeometory!: THREE.PlaneGeometry;
  finalMaterial!: THREE.MeshBasicMaterial;
  shadowPlaneMaterial!: THREE.ShaderMaterial;
  shadowMaterialFloor!: THREE.ShaderMaterial;
  shadowMaterialBox!: THREE.ShaderMaterial;
  floorOMaterial!: THREE.ShaderMaterial;
  boxMaterial!: THREE.ShaderMaterial;
  finalSphereMaterial!: THREE.ShaderMaterial;
  verticalMaterial!: THREE.ShaderMaterial;
  horizontalMaterial!: THREE.ShaderMaterial;

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('originalResize', () => this.onWindowResize(), false);

    this.init();
    this.addObject();
    this.paperDrop()
    window.requestAnimationFrame(this.animate);
  }



  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;

  private init(): void {

    this.uniforms = {
      uAlpha: {
        value: 1.0
      },
      uTextProgress: {
        value: 0,
      },
      uOffsetHeight: { value: -100 },

      uDotScale: {
        value: 0.4,
      },
      uLineScale: {
        value: 0.4,
      },
      uFogColor: {
        value: new THREE.Color(0x000000)
      },
      uFloorToneColor: {
        value: new THREE.Color(0xff00ff)
      },
      uTime: {
        value: 0
      },
      uSpread: { // 広がり、sinしゅうき
        value: 0.9
      },
      uBentBase: { //周期基準
        value: -1.6
      },
      uPosZ: { // z
        value: 3
      },
      uPosX: { // z
        value: -3
      },
      uBentSize: { // 厳密にはrotation量
        value: 1.
      },
      uTexture: {
        value: new THREE.TextureLoader().load('/letter.png')
      },
      uTextureTextJa: {
        value: new THREE.TextureLoader().load('/txt_ja.png')
      },
      uTextureTextEn: {
        value: new THREE.TextureLoader().load('/txt_en.png')
      },
      uBlack: {
        value: 0
      },
    }


    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.canvasSize = this.getCanvasSize()
    this.camera = new THREE.PerspectiveCamera(75, this.canvasSize.width / this.canvasSize.height, 0.01, 100);
    this.camera.position.z = isSP() ? 3.5 : 2.5;
    this.viewport = this.getViewport();

    this.renderer = new THREE.WebGLRenderer(
      {
        alpha: true,
        antialias: true
      }
    );
    const ratio = window.innerWidth < 767 ? 2 :
      Math.min(4096
        / window.innerWidth, 2)
    this.renderer.setPixelRatio(
      ratio
    );
    this.scene = new THREE.Scene();
    //this.scene.background = new THREE.Color(0xffffff);
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.container.appendChild(this.renderer.domElement);
    //this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
  }

  dirLightShadowMapViewer!: ShadowMapViewer;

  paperDrop = () => {
    const custom = CustomEase.create("custom", "M0,0 C0.387,0 0.697,1 1,1 ");;
    const tl = gsap.timeline();
    tl.to(this.uniforms.uBentBase, {
      duration: 1.2,
      value: 2.5,
      ease: custom,
    }).to(this.uniforms.uPosX, {
      duration: 1.2,
      value: 3,
      ease: custom
    }, '<').to(this.uniforms.uPosZ, {
      duration: 1.2,
      value: 1.3,
      ease: custom
    }, '<').to(this.uniforms.uSpread, {
      duration: 1.2,
      value: 0.8,
      ease: custom
    }, '<').to(this.uniforms.uBentBase, {
      duration: 1,
      value: -2,
      ease: custom
    }, '=0').to(this.uniforms.uPosX, {
      duration: 1,
      value: -2,
      ease: custom
    }, '<').to(this.uniforms.uPosZ, {
      duration: 1,
      value: 0.3,
      ease: custom
    }, '<').to(this.uniforms.uSpread, {
      duration: 1,
      value: 0.85,
      ease: custom
    }, '<')
      .to(this.uniforms.uBentBase, {
        duration: 0.8,
        value: 1,
        ease: custom
      }, '=0').to(this.uniforms.uPosX, {
        duration: 0.8,
        value: 0,
        ease: custom
      }, '<').to(this.uniforms.uPosZ, {
        duration: 0.8,
        value: 0.05,
        ease: custom
      }, '<').to(this.uniforms.uSpread, {
        duration: 0.5,
        value: 0.92,
        ease: custom
      }, '<').to(this.uniforms.uSpread, {
        duration: 1,
        value: 1,
        ease: custom
      }, '-=0.3')
  }

  addObject = () => {
    const w = this.viewport.x * 0.6
    const letterAspect = 964 / 1496
    this.geometory = new THREE.BoxGeometry(w, w * letterAspect, 0.01, 64, 64);

    this.sphere = new THREE.Mesh(this.geometory, undefined)
    this.shadowPlane = new THREE.Mesh(this.geometory, undefined)

    //sphere.castShadow = true;



    /// add light

    this.light = new THREE.DirectionalLight(0xffffff, 20);
    this.light.position.set(-2.4, 3, 3);

    this.light.castShadow = true;



    this.light!.shadow!.camera = new THREE.OrthographicCamera(
      frustumSize / -2, frustumSize / 2, frustumSize / 2, frustumSize / -2, 0.1
      , 10
    );



    this.light!.shadow!.camera.position.copy(
      this.light.position
    );
    this.light.shadow!.camera.lookAt(
      this.scene!.position
    );
    if (this.light!.shadow!.map === null) {
      this.light!.shadow!.mapSize.x = isSP() ? 1024 : 2048;
      this.light!.shadow!.mapSize.y = isSP() ? 1024 : 2048;

      this.light!.shadow!.map = new THREE.WebGLRenderTarget(this.light!.shadow!.mapSize.x, this.light!.shadow!.mapSize.y
        ,
        {
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          format: THREE.RGBAFormat,
        }

      );
    }


    this.scene!.add(this.light);
    this.scene!.add(this.light.shadow!.camera);

    this.uniforms = {
      ...this.uniforms,
      uDirLightPos: { value: this.light.position },
      uEyePosition: { value: this.camera.position },
      uOffsetHeight: { value: -100 },
      shadowMap: { value: this.light!.shadow!.map?.texture },
      shadowMapSize: { value: this.light!.shadow!.mapSize },
      shadowP: { value: this.light!.shadow!.camera.projectionMatrix },
      shadowV: { value: this.light!.shadow!.camera.matrixWorldInverse },

    }

    this.fbo_3 = new THREE.WebGLRenderTarget(
      this.canvasSize.width * 2, this.canvasSize.height * 2
    );
    this.fbo_1 = new THREE.WebGLRenderTarget(
      this.canvasSize.width * 2, this.canvasSize.height * 2
    );
    this.fbo_2 = new THREE.WebGLRenderTarget(
      this.canvasSize.width * 2, this.canvasSize.height * 2
    );
    const uStap = new THREE.Vector2(

      this.canvasSize.width / 300,
      this.canvasSize.height / 300,

    )


    this.commonUniforms = {
      weight: {
        value: getWeight(eRange)
      },
      uResolution: {
        value: new THREE.Vector2(
          this.canvasSize.width * 2,
          this.canvasSize.height * 2
        )
      },
      uStep: {
        value: uStap
      }
    }


    this.polygonGeometory = new THREE.PlaneGeometry(
      this.getViewport().x, this.getViewport().y
      , 1, 1);

    const commonVertexShader = `
        varying vec2 vTexCoord;
        void main() {
          vTexCoord = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `

    this.verticalMaterial = new THREE.ShaderMaterial({
      vertexShader: commonVertexShader,
      fragmentShader: blurFragmentShader,
      uniforms: {
        uDiffuse: {
          value: this.fbo_2.texture
        },
        horizontal: {
          value: false
        },
        ...this.commonUniforms
      },
    })
    this.vertical = new THREE.Mesh(
      this.polygonGeometory,
      this.verticalMaterial
    );
    this.horizontalMaterial = new THREE.ShaderMaterial({
      vertexShader: commonVertexShader,
      fragmentShader: blurFragmentShader,
      uniforms: {
        uDiffuse: {
          value: this.fbo_1.texture
        },
        horizontal: {
          value: true
        },
        ...this.commonUniforms
      },
    })
    this.horizontal = new THREE.Mesh(
      this.polygonGeometory,
      this.horizontalMaterial
    );



    this.shadowMaterialBox = new THREE.ShaderMaterial({
      vertexShader: boxVert,
      fragmentShader: Pack + shadowFrag,
      uniforms: this.uniforms,
      //      side: THREE.BackSide
    });
    this.shadowMaterialFloor = new THREE.ShaderMaterial({
      vertexShader: floorVert,
      fragmentShader: Pack + shadowFrag,
      uniforms: this.uniforms,
      //side: THREE.BackSide
    });

    const floorOGeometry = new THREE.PlaneGeometry(
      this.viewport.x
      , this.viewport.y, 1, 1);

    this.boxMaterial = new THREE.ShaderMaterial({
      vertexShader: Pack + (boxVert),
      fragmentShader: Pack + (boxFrag),
      transparent: true,
      uniforms: {
        ...this.uniforms,
        ...{
          uColor: {
            value: new THREE.Vector4(
              1.0, 0.0, 0.0, 1.0
            )
          },
        }
      },
    });

    this.floorOMaterial = new THREE.ShaderMaterial({
      vertexShader: Pack + (floorVert),
      fragmentShader: Pack + (floorFrag),
      uniforms: {
        ...this.uniforms,
        ...{
          uColor: {
            value: new THREE.Vector4(
              1.0, 1.0, 1.0, 1.0
            )
          },
        }
      },

    });



    this.shadowPlaneMaterial = new THREE.ShaderMaterial({
      vertexShader: Pack + (shadowPlaneVert),
      fragmentShader: Pack + (shadowPlaneFrag),
      uniforms: {
        ...this.uniforms,
        ...{
          uColor: {
          },
        }
      },
    });

    this.shadowPlane.material = this.shadowPlaneMaterial;
    this.floor = new THREE.Mesh(floorOGeometry, this.floorOMaterial);
    this.scene!.add(this.sphere);
    this.scene!.add(this.floor);


    this.finalScene = new THREE.Scene();
    /*     this.finalMaterial = new THREE.ShaderMaterial({
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
          `,
          fragmentShader: `
            uniform sampler2D map;
            uniform float opacity;
            varying vec2 vUv;
            void main() {
            vec4 color= texture2D(map, vUv);
      float alphaStep=smoothstep((1.-vUv.y-0.2),(1.-vUv.y), opacity);
    
              gl_FragColor = vec4(color.rgb, opacity);
            }
          `,
          uniforms: {
            map: {
              value: null
            },
            opacity: {
              value: 1.0
            }
          }
        }) */
    this.finalMaterial = new THREE.MeshBasicMaterial({
      map: null,
      transparent: true,
    })
    this.blurShadowMesh = new THREE.Mesh(
      this.polygonGeometory,
      this.finalMaterial
    )
    this.finalScene.add(
      this.blurShadowMesh
    )
    //this.sphere.material = this.boxMaterial;

    this.finalSphereMaterial = new THREE.ShaderMaterial({
      vertexShader: Pack + (boxVert),
      fragmentShader: Pack + (boxFrag),
      transparent: true,
      uniforms: {
        ...this.uniforms,
        ...{
          uColor: {
            value: new THREE.Vector4(
              1.0, 0.0, 0.0, 1.0
            )
          },
        }
      },
    });
    this.finalSphere = new THREE.Mesh(
      this.geometory,
      this.finalSphereMaterial
    )

    this.finalScene.add(this.finalSphere)

    //this.scene!.add(new THREE.CameraHelper(this.light.shadow!.camera));
    //this.initShadowMapViewers();


  }

  initShadowMapViewers = () => {
    this.dirLightShadowMapViewer = new ShadowMapViewer(this.light!);
    this.dirLightShadowMapViewer.size.set(256, 256);
    this.dirLightShadowMapViewer.update(); //Required when setting position or size directly
  }

  txtViewMesh: THREE.Mesh | null = null;

  private render(time: number): void {


    /* this.commonUniforms.weight.value = getWeight(
      this.uniforms.uPosZ.value * 30
    ); */
    this.commonUniforms.uStep.value = new THREE.Vector2(
      this.uniforms.uPosZ.value * 5 + 5,
      this.uniforms.uPosZ.value * 5 + 5,
    )
    this.uniforms.uBlack.value = 0.3 + this.uniforms.uPosZ.value / 5;

    //this.material!.uniforms.uTime.value = time;
    this.uniforms.uEyePosition.value = this.camera.position;


    this.sphere.material = this.shadowMaterialBox;
    //this.sphere.position.x = Math.sin(time / 1000) * 2.5;
    //this.sphere.position.z = Math.sin(time / 1000) * 1 + 1.2;

    this.sphere.material.visible = true;
    this.floor.material = this.shadowMaterialFloor;
    this.renderer.setRenderTarget(this.light!.shadow!.map);
    this.renderer.render(this.scene!, this.light!.shadow!.camera)

    this.uniforms.uTime.value = time / 1000.

    const fvSec = document.querySelector('.fv-section') as HTMLElement
    const fvContent = document.querySelector('.fv-content') as HTMLElement
    const sc = fvSec.getBoundingClientRect().top

    //this.uniforms.uTextProgress.value = -sc / ((fvSec.clientHeight - fvContent.clientHeight - 400))
    this.uniforms.uTextProgress.value = -sc / ((fvSec.clientHeight - fvContent.clientHeight))

    //this.uniforms.uAlpha.value = clamp(4.8 - allProgress * 4, -0, 1)
    //    this.light?.position.set(


    this.uniforms.shadowMap.value = this.light!.shadow!.map!.texture;

    this.boxMaterial.uniforms.uColor.value = new THREE.Vector4(
      1.0, 0.0, 0.0, 1.0
    );
    this.sphere.material = this.boxMaterial;

    this.floorOMaterial.uniforms.uColor.value = new THREE.Vector4(
      1.0, 1.0, 1.0, 1.0
    );
    this.floor.material = this.floorOMaterial;

    this.sphere.material.visible = false;

    this.renderer.setRenderTarget(
      this.fbo_1
    );
    this.renderer.render(this.scene!, this.camera!);

    this.renderer.setRenderTarget(this.fbo_2);
    this.renderer.render(this.horizontal!, this.camera!);

    this.renderer.setRenderTarget(this.fbo_3);
    this.renderer?.render(this.vertical!, this.camera!);


    this.renderer.setRenderTarget(null);
    //this.finalMaterial.uniforms.map.value = this.fbo_3.texture;
    this.finalMaterial.map = this.fbo_3.texture;
    //this.finalMaterial.uniforms.opacity.value = this.uniforms.uAlpha.value;
    this.finalMaterial.opacity = this.uniforms.uAlpha.value;

    console.log('this.finalMaterial.opacity:', this.finalMaterial.opacity);
    this.renderer?.render(this.finalScene!, this.camera!);

    if (this.dirLightShadowMapViewer) {
      this.dirLightShadowMapViewer.render(this.renderer);
    }
  }

  getViewport() {
    const x = 2 * Math.tan(
      this.camera.fov
      / 2 * Math.PI / 180) * this.camera.position.z * this.camera.aspect;
    const y = 2 * Math.tan(
      this.camera.fov
      / 2 * Math.PI / 180) * this.camera.position.z;
    return {
      x, y
    }
  }
  canvasSize = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  getCanvasSize = () => {
    const height = getVh(100)
    const width = window.innerWidth
    return {
      height,
      width
    }
  }

  private onWindowResize(): void {
    this.canvasSize = this.getCanvasSize()
    this.viewport = this.getViewport();

    this.camera.aspect = this.canvasSize.width / this.canvasSize.height;
    this.camera.updateProjectionMatrix();

    this.fbo_1.setSize(this.canvasSize.width * 2, this.canvasSize.height * 2);
    this.fbo_2.setSize(this.canvasSize.width * 2, this.canvasSize.height * 2);
    this.fbo_3.setSize(this.canvasSize.width * 2, this.canvasSize.height * 2);

    this.commonUniforms.uResolution.value = new THREE.Vector2(
      this.canvasSize.width * 2,
      this.canvasSize.height * 2
    );

    this.geometory.dispose()
    this.polygonGeometory.dispose()
    this.finalMaterial.dispose()
    this.shadowPlaneMaterial.dispose()
    this.shadowMaterialFloor.dispose()
    this.shadowMaterialBox.dispose()
    this.floorOMaterial.dispose()
    this.boxMaterial.dispose()
    this.finalSphereMaterial.dispose()
    this.verticalMaterial.dispose()
    this.horizontalMaterial.dispose()
    this.light?.dispose();
    this.scene!.children = []
    this.finalScene.children = []
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.addObject();
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
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

