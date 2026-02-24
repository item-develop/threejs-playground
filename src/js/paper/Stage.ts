import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import baseFrag from '../glsl/base.frag?raw'
import baseVert from '../glsl/base.vert?raw'
import { Mesh, PlaneGeometry } from 'three';

const Kl = {
  ASSET_DIR: "/sites/default/files/special/curiosity-is-life/assets",
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,
  PAGE_Y: 2,
  PAGE_Y_DIF: 1,
  PAGE_SEGMENT_X: 3,
  PAGE_SEGMENT_Y: 3,
  PAGE_STACK_COUNT: 4,
  DESK_Y: 0,
  PAGE_DIVISION_X: 31,
  PAGE_DIVISION_Y: 31,
  PAGE_NUM: 39,
  PAGE_NUM_ZSTART: 27,
  DUMMY_PAGE_NUM: 0,
  HAS_DUMMY_PAGE: !1,
  PAGE_AUTO_SLIP_SPEED_DIF_OUT: .3,
  PAGE_AUTO_SLIP_SPEED_DIF_IN: .7,
  PAGE_AUTO_SLIP_THRESHOLD: 100,
  PAGE_AUTO_SLIP_SPEED_MIN_OUT: 0,
  DEBUG_OVERLAY_ENABLED: !1,
  DEBUG_PHISICS_OVERLAY_ENABLED: !1,
  PIXEL_RATIO: Math.min(1.5, window.devicePixelRatio || 1),
  CAMERA_SHIFT_Y: -126.75,
  CAMERA_R: 700,
  CAMERA_ROT_X: 1 * Math.PI / 2.25,
  CAMERA_FOV_DEFAULT: 30,
  FRAME_LINE_WIDTH: 50,
  /* DESK_COLOR: new Vi(15592419),
  WALL_COLOR: new Vi(15328483),
  PAGE_COLOR: new Vi(.96, .96, .94) */
};

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

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    window.addEventListener('resize', () => this.onWindowResize(), false);
    document.addEventListener('mousemove', this.handleMouseMove, false);

    this.init();
    this.addObject();
    window.requestAnimationFrame(this.animate);
  }

  handleMouseMove = (event: MouseEvent) => {
    const x = event.clientX;
    const y = event.clientY;
    // canvas要素の幅・高さ
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.mouse.x = (x / w) * 2 - 1;
    this.mouse.y = -(y / h) * 2 + 1;
  }
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;
  computeCamera!: THREE.OrthographicCamera;
  computeScene!: THREE.Scene;
  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.canvasSize = this.getCanvasSize()
    this.camera = new THREE.PerspectiveCamera(75, this.canvasSize.width / this.canvasSize.height, 0.1, 10000);

    this.camera.position.set(
      105
      ,
      537.4011537017761
      ,
      537.401153701776
    )

    this.computeCamera = new THREE.OrthographicCamera(
      -1, 1, 1, -1, 0.1, 10
    );
    this.viewport = this.getViewport();

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
    this.computeScene = new THREE.Scene();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
  }


  buildComputeMaterial() {
    return new THREE.ShaderMaterial({
      glslVersion: "300 es",
      vertexShader: `
                  out vec2 vUv;
                  out vec3 vColor;
                  uniform vec3 pageVertices[${(Kl.PAGE_SEGMENT_X + 1) * (Kl.PAGE_SEGMENT_Y + 1)}];
                  void main() {
                      vUv = uv;
      
                      float gx = uv.x * (float(${Kl.PAGE_SEGMENT_X}));
                      float gy = uv.y * (float(${Kl.PAGE_SEGMENT_Y}));
                      int x0 = int(floor(gx));
                      int y0 = int(floor(gy));
                      int idx00 = clamp(y0 * (${Kl.PAGE_SEGMENT_X} + 1) + x0, 0, ${(Kl.PAGE_SEGMENT_X + 1) * (Kl.PAGE_SEGMENT_Y + 1) - 1});
                      vec3 p00 = pageVertices[idx00];
                      vColor = p00;
                      gl_Position = vec4(position, 1.0);
                  }
              `,
      fragmentShader: `
                  precision highp float;
                  in vec2 vUv;
                  in vec3 vColor;
                  layout(location=0) out vec4 outPos;
                  layout(location=1) out vec4 outNormal;
                  uniform vec3 pageVertices[${(Kl.PAGE_SEGMENT_X + 1) * (Kl.PAGE_SEGMENT_Y + 1)}];
      
                  // 4x4 Beźier basis
                        vec4 bernstein(float t){
                            float it = 1.0 - t;
                            float b0 = it*it*it;
                            float b1 = 3.0*t*it*it;
                            float b2 = 3.0*t*t*it;
                            float b3 = t*t*t;
                            return vec4(b0,b1,b2,b3);
                        }
                        vec4 dBernstein(float t){
                            float it = 1.0 - t;
                            float db0 = -3.0*it*it;
                            float db1 = 3.0 - 12.0*t + 9.0*t*t;
                            float db2 = 6.0*t - 9.0*t*t;
                            float db3 = 3.0*t*t;
                            return vec4(db0, db1, db2, db3);
                        }
            
                        vec3 bezierEval(vec2 uv){
                            vec4 Bu = bernstein(clamp(uv.x,0.0,1.0));
                            vec4 Bv = bernstein(clamp(uv.y,0.0,1.0));
                            vec3 p = vec3(0.0);
                            for(int j=0;j<4;j++){
                                for(int i=0;i<4;i++){
                                int idx = j * (${Kl.PAGE_SEGMENT_X}+1) + i;
                                p += pageVertices[idx] * Bu[i] * Bv[j];
                                }
                            }
                            return p;
                        }
                        void bezierEvalWithDerivatives(vec2 uv, out vec3 P, out vec3 dPu, out vec3 dPv){
                            float u = clamp(uv.x,0.0,1.0);
                            float v = clamp(uv.y,0.0,1.0);
                            vec4 Bu = bernstein(u);
                            vec4 Bv = bernstein(v);
                            vec4 dBu = dBernstein(u);
                            vec4 dBv = dBernstein(v);
                            P = vec3(0.0);
                            dPu = vec3(0.0);
                            dPv = vec3(0.0);
                            for(int j=0;j<4;j++){
                                for(int i=0;i<4;i++){
                                    int idx = j * (${Kl.PAGE_SEGMENT_X}+1) + i;
                                    vec3 cp = pageVertices[idx];
                                    float w  = Bu[i]  * Bv[j];
                                    float wu = dBu[i] * Bv[j];
                                    float wv = Bu[i]  * dBv[j];
                                    P  += cp * w;
                                    dPu += cp * wu;
                                    dPv += cp * wv;
                                }
                            }
                        }
            
                        void main(){
                            vec2 grid   = vec2(float(${Kl.PAGE_DIVISION_X}) + 1.0, float(${Kl.PAGE_DIVISION_Y}) + 1.0);
                            vec2 ij     = round(vUv * (grid - 1.0));
                            ij          = clamp(ij, vec2(0.0), grid - 1.0);
            
                            vec2 uvParam = vec2(
                                ij.x / float(${Kl.PAGE_DIVISION_X}),
                                ij.y / float(${Kl.PAGE_DIVISION_Y})
                            );
                            vec3 P, dPu, dPv;
                            bezierEvalWithDerivatives(uvParam, P, dPu, dPv);
            
                            outPos = vec4(
                                (P.x / float(${Kl.PAGE_WIDTH}) + 1.0) / 2.0,
                                P.y / float(${Kl.PAGE_WIDTH}),
                                (P.z / float(${Kl.PAGE_HEIGHT}) + 0.5),
                                1.0
                            );
                            // outPos = vec4(
                            //     vec3((vColor.x / float(${Kl.PAGE_WIDTH}) + 1.0) / 2.0,vColor.y / float(${Kl.PAGE_WIDTH}),(vColor.z / float(${Kl.PAGE_HEIGHT}) + 1.0) / 1.0),
                            //     1.0
                            // );
            
                            // 右手系に合わせて外積順を反転（以前の実装は dFdx x (-dFdy)）
                            vec3 N = normalize(cross(dPv, dPu));
                            if (dot(N,N) < 1e-6) {
                                vec3 dPosdx = dFdx(P);
                                vec3 dPosdy = dFdy(P);
                                N = normalize(cross(dPosdx, -dPosdy));
                            }
                            if (dot(N,N) < 1e-6) N = vec3(0.0,1.0,0.0);
                            outNormal = vec4(N*0.5+0.5, 1.0);
                        }
                    `,
      uniforms: {
        pageVertices: {
          value: [
            new THREE.Vector3(0, 2, -148.5),
            new THREE.Vector3(70.00000000000001, 2, -148.5),
            new THREE.Vector3(140.00000000000003, 2, -148.49999999999997),
            new THREE.Vector3(210, 2, -148.50000000000003),
            new THREE.Vector3(0, 2, -49.5),
            new THREE.Vector3(69.99999999999999, 2, -49.49999999999999),
            new THREE.Vector3(140.00000000000003, 2, -49.499999999999986),
            new THREE.Vector3(210, 2, -49.500000000000014),
            new THREE.Vector3(0, 2, 49.5),
            new THREE.Vector3(70, 2, 49.500000000000014),
            new THREE.Vector3(140.00000000000003, 2, 49.49999999999999),
            new THREE.Vector3(209.99999999999997, 2, 49.499999999999986),
            new THREE.Vector3(0, 2, 148.5),
            new THREE.Vector3(69.99999999999999, 2, 148.50000000000003),
            new THREE.Vector3(140, 2, 148.50000000000003),
            new THREE.Vector3(210, 2, 148.49999999999997)
          ].map(el => {
            //return new THREE.Vector3((el.x) * 0.01, (el.y)*0.01, el.z * 0.01)
            return el
          })
        }
      },
      depthTest: !1,
      depthWrite: !1,
      transparent: !1
    })
  }

  buildRenderMaterial(e: THREE.WebGLRenderTarget) {
    return new THREE.ShaderMaterial({
      glslVersion: "300 es",
      vertexShader: `
                  precision highp float;
                  uniform sampler2D pagePosTex;
                  uniform sampler2D pageNormalTex;
                  uniform float pageY;
                  out vec3 vNormal;
                  out vec2 vUv;
                  vec3 decodePos(vec3 enc){
                      float x = (enc.x * 2.0 - 1.0) * float(${Kl.PAGE_WIDTH});
                      float y = enc.y * float(${Kl.PAGE_WIDTH});
                      float z = (enc.z - 0.5) * float(${Kl.PAGE_HEIGHT});
                      return vec3(x, y, z);
                  }
                  void main(){
                      vec2 texSize = vec2(float(${Kl.PAGE_DIVISION_X}) + 1.0, float(${Kl.PAGE_DIVISION_Y}) + 1.0);
                      vec2 ij = round(uv * (texSize - 1.0));        // 端(0,1)を含む頂点UV→最近傍の格子点へ
                            ij = clamp(ij, vec2(0.0), texSize - 1.0);     // （ここは -1.0 が正しい）
                            vec2 uvCell = (ij + 0.5) / texSize;           // テクセル中心
                            
                            vec3 P = decodePos(texture(pagePosTex, uvCell).xyz);
                            // 表示用にページのスタック高さを反映
                            P.y += pageY;
                            vec3 N = normalize(texture(pageNormalTex, uvCell).xyz * 2.0 - 1.0);
                            vNormal = N;
                            vUv = uv;
                            gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
                        }
                    `,
      fragmentShader: `
                  precision highp float;
                  in vec3 vNormal;
                  in vec2 vUv;
                  uniform vec3 pageLeftColor;
                  uniform vec3 pageRightColor;
                  uniform sampler2D pageLeftTex;
                  uniform sampler2D pageRightTex;
                  out vec4 outColor;
                  void main(){
                      vec3 baseColor;
                      vec4 texColor;
                      if(gl_FrontFacing){
                          baseColor = pageLeftColor;
                          texColor = texture(pageLeftTex, 1.0 - vUv);
                      }else{
                            baseColor = pageRightColor;
                          texColor = texture(pageRightTex, vec2(vUv.x, 1.0 - vUv.y));
                      }
                      vec3 finalColor = mix(baseColor, texColor.rgb, texColor.a);
                      outColor = linearToOutputTexel(vec4(finalColor, 1.0));
                      outColor = vec4(vec3(1.,0.,0.), 1.0);
                  }
              `,
      uniforms: {
        pagePosTex: {
          value: e.textures[0]
        },
        pageNormalTex: {
          value: e.textures[1]
        },
        pageY: {
          value: 0
        },
        pageLeftColor: {
          value: new THREE.Color(.96, .96, .94)
        },
        pageRightColor: {
          value: new THREE.Color(.96, .96, .94)
        },
        pageLeftTex: {
          value: new THREE.TextureLoader().load('/grad_txt_3.png')
        },
        pageRightTex: {
          value: new THREE.TextureLoader().load('/grad_txt_3.png')
        }
      },
      transparent: !0,
      depthTest: !0,
      depthWrite: !0,
      side: 2
    })
  }
  getMRT() {
    const e = new THREE.WebGLRenderTarget(Kl.PAGE_DIVISION_X + 1, Kl.PAGE_DIVISION_Y + 1, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      count: 2,
    });
    console.log('e:', e);
    return e.textures[0].generateMipmaps = !1,
      e.textures[0].minFilter = 1006,
      e.textures[0].magFilter = 1006,
      e.textures[1].generateMipmaps = !1,
      e.textures[1].minFilter = 1006,
      e.textures[1].magFilter = 1006,
      e
  }

  computeMaterial!: THREE.ShaderMaterial;
  computeMesh!: THREE.Mesh
  renderMaterial!: THREE.ShaderMaterial;
  renderMesh!: THREE.Mesh
  mrt!: THREE.WebGLRenderTarget

  addObject = () => {
    this.computeMaterial = this.buildComputeMaterial()
    this.computeMesh = new Mesh(new THREE.PlaneGeometry(2, 2), this.computeMaterial)
    this.mrt = this.getMRT()
    this.renderMaterial = this.buildRenderMaterial(this.mrt)

    this.renderMesh = new Mesh(new PlaneGeometry(1, 1, Kl.PAGE_DIVISION_X, Kl.PAGE_DIVISION_Y), this.renderMaterial)
    this.renderMesh.frustumCulled = false

    const geometory = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: baseVert,
      fragmentShader: baseFrag,
      uniforms: {
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      }
    })
    // this.scene!.add(new THREE.Mesh(geometory, material));
    this.computeScene!.add(this.computeMesh);
    this.scene!.add(this.renderMesh);
  }


  getViewport() {
    const x = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z * this.camera.aspect;
    const y = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z;
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
      height
      , width
    }
  }

  private onWindowResize(): void {
    this.canvasSize = this.getCanvasSize()
    this.camera.aspect = this.canvasSize.width / this.canvasSize.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.viewport = this.getViewport();
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);
    this.render(time);
    this.stats.update();
  }
  private render(_time: number): void {
    this.renderer.setRenderTarget(this.mrt)

    // レイキャスト = マウス位置からまっすぐに伸びる光線ベクトルを生成


    this.renderer.clear(!0, !1, !1)
    this.renderer.render(this.computeScene, this.computeCamera)
    this.computeMaterial.uniforms.pageVertices.value = this.computeMaterial.uniforms.pageVertices.value.map(
      (el: any) => {
        return new THREE.Vector3(el.x, el.y + (el.x > 200 ? 1 : 0), el.z)
      })
    this.renderMaterial.uniforms.pagePosTex.value = this.mrt.textures[0]
    this.renderMaterial.uniforms.pageNormalTex.value = this.mrt.textures[1]


    this.renderer.setRenderTarget(null)



    this.raycaster.setFromCamera(this.mouse, this.camera);

    console.log('this.scene!.children:', this.scene!.children);
    const intersects = this.raycaster.intersectObjects(this.scene!.children);
    console.log('this.mouse:', this.mouse);
    console.log('intersects:', intersects);
    if (intersects.length > 0) {
      // ぶつかったオブジェクトに対してなんかする
    }
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

