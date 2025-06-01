import * as THREE from 'three';
import { EffectComposer, OrbitControls } from 'three/examples/jsm/Addons.js';
import { GPUComputationRenderer } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import { snoise } from '../Common/common';
import { GUI } from 'lil-gui'
import MouseMove from '../Common/MouseMove';
import gsap from 'gsap';
import { TextureUI } from './TextureUI';

const CAMERA_Z = 5;
const TEXTURE_SIZE = 1024; // パーティクルのテクスチャサイズ
const PARTICLES = TEXTURE_SIZE * TEXTURE_SIZE; // パーティクル総数

export class Stage {
  private container!: HTMLDivElement;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private stats!: Stats;
  controls: OrbitControls | null = null;
  scene: THREE.Scene | null = null;

  // GPGPUのためのオブジェクト
  private gpuCompute!: GPUComputationRenderer;
  private positionVariable!: any;
  private velocityVariable!: any;
  private sizeVariable!: any;
  private particleUniforms: any = {};
  private imageTexture!: THREE.DataTexture;
  private imageTexture2!: THREE.DataTexture;

  mouse: null | MouseMove = null;
  cameraMove = false

  // パーティクルシステム
  private particleSystem!: THREE.Points;

  constructor() {
    if (!this.isWebGLAvailable()) {
      return;
    }
    this.mouse = new MouseMove();
    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.init();
    this.initComputeRenderer();

    this.loadImage('/ii.png', (dt) => {
      this.imageTexture = dt
    }); // ハーフトーン用の白黒画像
    this.loadImage('/ii2.png', (dt) => {
      this.imageTexture2 = dt
    }); // ハーフトーン用の白黒画像

    // パーティクルシステムを作成
    this.createParticleSystem();

    // アニメーションを開始
    window.requestAnimationFrame(this.animate);

  }

  raycastPlane!: THREE.Mesh;
  dummy!: THREE.Mesh;

  isError = false;

  private init(): void {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    const aspect = window.innerWidth / getVh(100);
    this.getCanvasSize();
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);

    this.camera.position.y = 0;
    this.camera.position.z = CAMERA_Z;
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true
    });



    const originalConsoleError = (arr: any) => {
      console.log(arr[0]);
      this.isError = true;
    };

    console.error = function (
      summary, getError, programParamCode, programParam,
      programLogExample, programLog, vertexErrors, fragmentErrors
    ) {
      return originalConsoleError(
        [summary, getError, programParamCode, programParam,
          programLogExample, programLog, vertexErrors, fragmentErrors]
      );
    };


    this.renderer.setPixelRatio(
      window.innerWidth < 767 ? 4 :
        Math.min(4096 / window.innerWidth, 3)
    );
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.renderer.setSize(this.getCanvasSize().width, this.getCanvasSize().height);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  private initComputeRenderer(): void {
    this.gpuCompute = new GPUComputationRenderer(TEXTURE_SIZE, TEXTURE_SIZE, this.renderer);

    const dtPosition = this.gpuCompute.createTexture();
    const dtVelocity = this.gpuCompute.createTexture();
    const dtSize = this.gpuCompute.createTexture();

    this.fillPositionTexture(dtPosition);
    this.fillVelocityTexture(dtVelocity);

    // 座標計算用シェーダー
    this.positionVariable = this.gpuCompute.addVariable(
      'texturePosition',
      `
        uniform float time;
      uniform sampler2D imageTexture;
      uniform float uRandomRate;
      uniform float uParticleRate;
      uniform vec2 uMouse;
      ${snoise}



      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 pos = texture2D(texturePosition, uv);
        vec4 vel = texture2D(textureVelocity, uv);


        pos.xyz += vel.xyz*.01;
        
         vec2 cord = gridCord();
       vec3 gridPos =vec3(
       cord.x, cord.y, 0.
       );
       

       vec3 lerpPos = lerp(
        pos.xyz,gridPos, 0.
       );

//       vec3 lerpPos = lerp(
//        pos.xyz,gridPos, clamp(((1.-uRandomRate) - 0.99)*100., 0., 1.)
//       );

          vec2 testUv = gl_FragCoord.xy / resolution.xy;
          vec2 centerUv = (testUv-vec2(0.5,0.5) )* 2.;

          float _n  = (snoise(vec3(time+uv * 500.0 , 1.)) + 1.) / 2.;
          float n  = mix( 1., _n , uParticleRate);

          float mouseDistance = smoothstep(0.,0.4 + n*0.15, 
          length(centerUv - uMouse)
          );


          float mouseDis = length(uMouse);
        vec2 fromMouse = cord.xy - uMouse *2. +  max(vec2(0.5),uMouse) *3.;
        
          vec2 add = lerpPos.xy +  n* normalize(fromMouse) * 0.01 * (1.-mouseDistance);

          

        gl_FragColor =  + vec4(add.x, add.y, 0., 1.0);

    
      }
        
      `,
      dtPosition
    );

    // 速度計算用シェーダー
    this.velocityVariable = this.gpuCompute.addVariable(
      'textureVelocity',
      `
      uniform float time;
      uniform float uRandomRate;
      uniform float uSpread;
      uniform sampler2D imageTexture;
      
      
      ${snoise}

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 vel = texture2D(textureVelocity, uv);
        vec4 position = texture2D(texturePosition, uv);
        // 画像のピクセル値を取得

        float n  = (snoise(vec3(uv * 500.0 , 1.)) + 1.) / 2.;
        float stepn = ceil(n*10.)/10. ;

        
        vec2 cord1 =vec2(
       0.,0.
       ) ;

        vec2 cord = gridCord();
       vec3 gridVel;
       vec3 target = vec3(cord.x, cord.y, 0.0);

       target.xy += uSpread* normalize(cord) * (1.+uSpread)/1. *(pow(  1. , uSpread+2. ) * 0.04*(4.*n) );

       vec3 direction = target - position.xyz;
        float distance = length(direction);
        if (distance > 0.001) {

        float speedFactor = min(distance, 0.5) / 0.5; // 距離0.5以上で最大速度、それ以下では比例して減速

          vec3 force = normalize(direction);

          vec3 idealVel = force * 3.6 * speedFactor;

          float dampingFactor = 0.2;

          gridVel = mix(vel.xyz, idealVel, dampingFactor);

        }else{
          //gridVel = vec3(0., 0., 0.);
         gridVel = vel.xyz * 0.8; // 減衰
      }




      vec3 circleVel = vec3(
       (n+0.2)* sin(time*n),
       (n+0.2)* cos(time*n),0
      );


        // 中心点からの方向ベクトル
  vec3 centerToParticle = position.xyz - vec3(0.0, 0.0, 0.0);
  float dist = length(centerToParticle);
  
  // 円軌道に乗せるための力を計算
  // 向心力 = 中心からの距離に垂直な方向への力
  vec3 normalizedDir = normalize(centerToParticle);
  vec3 perpendicular = vec3(-normalizedDir.y*n * 1.4, normalizedDir.x*n, 0.0);
  
  // 円運動の速さを調整するパラメータ
  float orbitSpeed = 1.3+ 2.*(abs(cord.x)+abs(cord.y));
  
  // 理想的な円軌道上の速度ベクトル
  vec3 targetVel = perpendicular * orbitSpeed;

   float targetRadius = 2.0;
  vec3 radiusForce = normalizedDir * (targetRadius - dist) * 0.1;
  targetVel.xyz += radiusForce;


      vel.xyz = lerp(
      gridVel, 
      targetVel,
      uRandomRate
      );

        gl_FragColor = vel;
        
      }

      `,
      dtVelocity
    );

    // パーティクルサイズ計算用シェーダー
    this.sizeVariable = this.gpuCompute.addVariable(
      'textureSize',
      `
      uniform float time;
      uniform sampler2D imageTexture;
      uniform vec2 imageTextureResolution;
      uniform sampler2D imageTexture2;
      uniform vec2 imageTexture2Resolution;
      uniform float uRandomRate;
      uniform float uImageRate;
      uniform float uSinWave;
      uniform float uNoiseWave;
      uniform float uParticleRate;
      uniform float uGridBetween;
      uniform float uRandomScale;
      uniform float uParticleSizeContrust;
      uniform vec2 uMouse;


      ${snoise}
      
     float getAverage(vec2 uv, float pixelSize) {
        // 9近傍のピクセル輝度平均を計算
        float sum = 0.0;
        float grid = 3.;
        for(int x = -1; x <= 1; x++) {
          for(int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) * pixelSize*1.;
            vec4 _color = texture2D(imageTexture, uv + offset);
            //vec3 color = halftone(_color.rgb, uv, 1000.);
            sum += (_color.r + _color.g + _color.b) / 3.0;
          }
        }

       
        return sum / 9.0;  // 9ピクセルの平均
      }

      vec2 scaleUv(vec2 uv, float scale) {
        vec2 center = vec2(0., 0.);
        vec2 scaledUv = (uv - center) / scale + center;
        // スケーリング後のUV座標を元の範囲に戻す
        return scaledUv;
      }


      float txtSample (
      sampler2D txt,
      vec2 uv
      ){
      vec4 _color = texture2D(txt, uv);
        //vec3 color = halftone(_color.rgb, uv, 1000.);
        vec3 color = _color.rgb;
        float avgLuminance = (color.r + color.g + color.b) / 3.;

        float size = avgLuminance;


        float pixelSize = 1.0 / resolution.x;
        float average = getAverage(uv, pixelSize);

        return size;
      }

      void main() {
        vec4 position = texture2D(texturePosition, gl_FragCoord.xy / resolution.xy);
        vec2 pos = vec2(position.x,  position.y*-1. );


        
        vec2 _uv = gl_FragCoord.xy / resolution.xy;
        _uv.y = 1. - _uv.y;
        vec2 uv = (_uv - vec2(0.5,0.5))* (1./1.) + vec2(0.5,0.5);

        uv.y = (uv.y-0.5)*1.4 + 0.5;


        vec2 uv1 = uv;
          vec2 uv2 = uv;
          uv1.y = (uv2.y - 0.5) / 1.4 + 0.5;
          uv2.y = (uv2.y - 0.5) / 1.4 + 0.5;
          uv1.y = (uv1.y-0.5)*(imageTextureResolution.x/imageTextureResolution.y) + 0.5;
          uv2.y = (uv2.y-0.5)*(imageTexture2Resolution.x/imageTexture2Resolution.y) + 0.5;


        float imgSize1 = txtSample(
        imageTexture, uv1
        );
        
        float imgSize2 = txtSample(
        imageTexture2, uv2
        );


        float size = mix(imgSize1, imgSize2,  uImageRate);
        size = lerp(0.3 ,size ,  uParticleSizeContrust);


        if(uv.x<0. || uv.x>1.){
        size= 0.3*(1.-uParticleSizeContrust);
        }
        if(uv.y<0. || uv.y>1.){
        size= 0.3*(1.-uParticleSizeContrust);
        }
        
        
        // size += uSinWave * 0.15 * sin(
        //   1. * time + (position.x+position.y)*2.5
        // );

        size *=1.+( uSinWave * 1.15 * (sin(
          1. * time + (position.x+position.y)*2.5
        )+1. ));

        // size += uNoiseWave * snoise(vec2(time/5.) + 0.4*vec2(position.x*sin(position.y),position.y*cos(position.x)));

        size *= (1.+  uNoiseWave * snoise(vec2(time/5.) + 0.4*vec2(position.x*sin(position.y),position.y*cos(position.x))));
        size *= (1.+ uRandomScale*snoise( 1000.*uv + vec2(time/1.)));


          vec2 testUv = gl_FragCoord.xy / resolution.xy;
          vec2 centerUv = (testUv-vec2(0.5,0.5) )* 2.;

          float mouseDistance = 1.-smoothstep(0., 0.3,
          length(centerUv - uMouse)
          );

        size *= (1.+ 1.5* mouseDistance*uParticleRate );


        size = mix(0.34, size, uParticleRate);


        bool isMabiki = mod(ceil(gl_FragCoord.x), uGridBetween) == 1. 
         && 
        mod(ceil(gl_FragCoord.y), uGridBetween)==1.;
      float alpha = 1.;

      if(!isMabiki   ){
   /* size *= 1. - ( 
   smoothstep( 1. - uParticleRate*1.1,  1.-uParticleRate*1.1 + 0.1,  uv.x)
   +
   smoothstep(0.,0.5,mouseDistance)
   ); */

   size *= 1. - ( 
   uParticleRate
   +
   smoothstep(0.,0.5,mouseDistance)
   ); 


      }
   


        gl_FragColor = vec4(size, size, size, 1.0);
      }
      `,
      dtSize
    );

    // 変数間の依存関係を設定
    this.gpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable]);
    this.gpuCompute.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable]);
    this.gpuCompute.setVariableDependencies(this.sizeVariable, [
      this.positionVariable,
      this.velocityVariable,
      this.sizeVariable
    ]);

    // ユニフォーム変数の追加
    this.positionVariable.material.uniforms['time'] = { value: 0.0 };
    this.velocityVariable.material.uniforms['time'] = { value: 0.0 };
    this.sizeVariable.material.uniforms['time'] = { value: 0.0 };
    this.positionVariable.material.uniforms['uImageRate'] = { value: 0.0 };
    this.velocityVariable.material.uniforms['uImageRate'] = { value: 0.0 };
    this.sizeVariable.material.uniforms['uImageRate'] = { value: 0.0 };
    this.positionVariable.material.uniforms['uSinWave'] = { value: 0.4 };
    this.velocityVariable.material.uniforms['uSinWave'] = { value: 0.4 };
    this.sizeVariable.material.uniforms['uSinWave'] = { value: 0.4 };
    this.positionVariable.material.uniforms['uRandomScale'] = { value: 0 };
    this.velocityVariable.material.uniforms['uRandomScale'] = { value: 0 };
    this.sizeVariable.material.uniforms['uRandomScale'] = { value: 0 };
    this.positionVariable.material.uniforms['uNoiseWave'] = { value: 0.8 };
    this.velocityVariable.material.uniforms['uNoiseWave'] = { value: 0.8 };
    this.sizeVariable.material.uniforms['uNoiseWave'] = { value: 0.8 };
    this.positionVariable.material.uniforms['uRandomRate'] = { value: 0 };
    this.velocityVariable.material.uniforms['uRandomRate'] = { value: 0 };
    this.sizeVariable.material.uniforms['uRandomRate'] = { value: 0 };

    this.positionVariable.material.uniforms['uSpread'] = { value: 0.0 };
    this.velocityVariable.material.uniforms['uSpread'] = { value: 0.0 };
    this.sizeVariable.material.uniforms['uSpread'] = { value: 0.0 };

    this.positionVariable.material.uniforms['uParticleSizeContrust'] = { value: 1 };
    this.velocityVariable.material.uniforms['uParticleSizeContrust'] = { value: 1 };
    this.sizeVariable.material.uniforms['uParticleSizeContrust'] = { value: 1 };
    this.positionVariable.material.uniforms['uParticleRate'] = { value: 1 };
    this.velocityVariable.material.uniforms['uParticleRate'] = { value: 1 };
    this.sizeVariable.material.uniforms['uParticleRate'] = { value: 1 };
    this.positionVariable.material.uniforms['uGridBetween'] = { value: 6 };
    this.velocityVariable.material.uniforms['uGridBetween'] = { value: 6 };
    this.sizeVariable.material.uniforms['uGridBetween'] = { value: 6 };

    this.positionVariable.material.uniforms['imageTexture'] = { value: null };
    this.velocityVariable.material.uniforms['imageTexture'] = { value: null };
    this.sizeVariable.material.uniforms['imageTexture'] = { value: null };
    this.positionVariable.material.uniforms['imageTextureResolution'] = { value: new THREE.Vector2(TEXTURE_SIZE, TEXTURE_SIZE) };
    this.velocityVariable.material.uniforms['imageTextureResolution'] = { value: new THREE.Vector2(TEXTURE_SIZE, TEXTURE_SIZE) };
    this.sizeVariable.material.uniforms['imageTextureResolution'] = { value: new THREE.Vector2(TEXTURE_SIZE, TEXTURE_SIZE) };

    this.positionVariable.material.uniforms['imageTexture2'] = { value: null };
    this.velocityVariable.material.uniforms['imageTexture2'] = { value: null };
    this.sizeVariable.material.uniforms['imageTexture2'] = { value: null };
    this.positionVariable.material.uniforms['imageTexture2Resolution'] = { value: new THREE.Vector2(TEXTURE_SIZE, TEXTURE_SIZE) };
    this.velocityVariable.material.uniforms['imageTexture2Resolution'] = { value: new THREE.Vector2(TEXTURE_SIZE, TEXTURE_SIZE) };
    this.sizeVariable.material.uniforms['imageTexture2Resolution'] = { value: new THREE.Vector2(TEXTURE_SIZE, TEXTURE_SIZE) };


    this.positionVariable.material.uniforms['uMouse'] = { value: new THREE.Vector2(0, 0) };
    this.velocityVariable.material.uniforms['uMouse'] = { value: new THREE.Vector2(0, 0) };
    this.sizeVariable.material.uniforms['uMouse'] = { value: new THREE.Vector2(0, 0) };



    this.gui = new GUI()

    // Setup texture UI
    this.textureUI = new TextureUI(this.gui, (texture, index) => {
      if (index === 1) {
        this.imageTexture = texture;
      } else {
        this.imageTexture2 = texture;
      }
    });

    const myObject = {
      uImageRate: 0,
      uRandomRate: 0,
      uSinWave: 0.4,
      uRandomScale: 0,
      uNoiseWave: 0.8,
      uParticleSizeContrust: 1,
      uParticleRate: 1,
      uSpread: 0,
      uGridBetween: 6,
      cameraMove: this.cameraMove
    };

    console.log('location.search:', location.search);
    const paramIsAnim = location.search.indexOf('anim') !== -1;
    const hover = location.search.indexOf('hover') !== -1;
    if (paramIsAnim) {
      this.animStart(myObject)
    }

    if (hover) {
      document.querySelector('.menu-list')?.classList.add('hover');
    }
    document.querySelectorAll('.menu-item').forEach((item) => {
      item.addEventListener('mouseover', () => {
        const to3 = {
          value: myObject.uSpread
        }
        gsap.to(
          to3
          , {
            value: 2,
            duration: 0.04,
            delay: 0,
            ease: "power4.out",
            onComplete: () => {
              gsap.to(
                to3
                , {
                  value: 0,
                  duration: 0.5,
                  delay: 0,
                  ease: "power4.inOut",
                  onComplete: () => {
                  },
                  onUpdate: () => {
                    this.positionVariable.material.uniforms["uSpread"].value = to3.value;
                    this.velocityVariable.material.uniforms["uSpread"].value = to3.value;
                    this.sizeVariable.material.uniforms["uSpread"].value = to3.value;
                  }
                })
            },
            onUpdate: () => {
              this.positionVariable.material.uniforms["uSpread"].value = to3.value;
              this.velocityVariable.material.uniforms["uSpread"].value = to3.value;
              this.sizeVariable.material.uniforms["uSpread"].value = to3.value;

            }
          })


        const to2 = {
          value: 0
        }

        gsap.to(
          to2
          , {
            value: 1,
            duration: 1,
            delay: 0,
            onUpdate: () => {
              this.positionVariable.material.uniforms['uParticleSizeContrust'].value = to2.value;
              this.velocityVariable.material.uniforms['uParticleSizeContrust'].value = to2.value;
              this.sizeVariable.material.uniforms['uParticleSizeContrust'].value = to2.value;
            }
          })



      })



      item.addEventListener("mouseleave", () => {



        const to2 = {
          value: 1
        }

        gsap.to(
          to2
          , {
            value: 0,
            duration: 1,
            delay: 0,
            onUpdate: () => {
              this.positionVariable.material.uniforms['uParticleSizeContrust'].value = to2.value;
              this.velocityVariable.material.uniforms['uParticleSizeContrust'].value = to2.value;
              this.sizeVariable.material.uniforms['uParticleSizeContrust'].value = to2.value;
            }
          })



      })


    })
    this.gui!.add(myObject, 'uParticleRate')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.positionVariable.material.uniforms['uParticleRate'].value = value;
        this.velocityVariable.material.uniforms['uParticleRate'].value = value;
        this.sizeVariable.material.uniforms['uParticleRate'].value = value;
        this.particleUniforms['uParticleRate'].value = value;
      });
    this.gui!.add(myObject, 'uImageRate')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.positionVariable.material.uniforms['uImageRate'].value = value;
        this.velocityVariable.material.uniforms['uImageRate'].value = value;
        this.sizeVariable.material.uniforms['uImageRate'].value = value;
        this.particleUniforms['uImageRate'].value = value;

      });
    this.gui!.add(myObject, 'uParticleSizeContrust')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.positionVariable.material.uniforms['uParticleSizeContrust'].value = value;
        this.velocityVariable.material.uniforms['uParticleSizeContrust'].value = value;
        this.sizeVariable.material.uniforms['uParticleSizeContrust'].value = value;
      });

    this.gui!.add(myObject, 'uRandomRate')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.positionVariable.material.uniforms['uRandomRate'].value = value;
        this.velocityVariable.material.uniforms['uRandomRate'].value = value;
        this.sizeVariable.material.uniforms['uRandomRate'].value = value;
      });
    this.gui!.add(myObject, 'uSinWave')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.positionVariable.material.uniforms['uSinWave'].value = value;
        this.velocityVariable.material.uniforms['uSinWave'].value = value;
        this.sizeVariable.material.uniforms['uSinWave'].value = value;
      });
    this.gui!.add(myObject, 'uNoiseWave')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.positionVariable.material.uniforms['uNoiseWave'].value = value;
        this.velocityVariable.material.uniforms['uNoiseWave'].value = value;
        this.sizeVariable.material.uniforms['uNoiseWave'].value = value;
      });
    this.gui!.add(myObject, 'uRandomScale')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.positionVariable.material.uniforms['uRandomScale'].value = value;
        this.velocityVariable.material.uniforms['uRandomScale'].value = value;
        this.sizeVariable.material.uniforms['uRandomScale'].value = value;
      });


    this.gui!.add(myObject, 'uGridBetween')
      .min(2)
      .max(20)
      .step(1)
      .onChange((value: number) => {
        this.positionVariable.material.uniforms['uGridBetween'].value = value;
        this.velocityVariable.material.uniforms['uGridBetween'].value = value;
        this.sizeVariable.material.uniforms['uGridBetween'].value = value;
      });

    this.gui!.add(myObject, 'uSpread')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.positionVariable.material.uniforms['uSpread'].value = value;
        this.velocityVariable.material.uniforms['uSpread'].value = value;
        this.sizeVariable.material.uniforms['uSpread'].value = value;
      });
    this.gui!.add(myObject, 'cameraMove').onChange((value: boolean) => {
      this.cameraMove = value;
    })


    // GPUComputationRendererの初期化
    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error('GPUComputationRenderer init error:', error);
    }
  }

  private fillPositionTexture(texture: THREE.DataTexture): void {
    const theArray = texture.image.data;

    // 初期位置をランダムに配置
    for (let i = 0; i < theArray.length; i += 4) {
      // グリッド状に整列させつつ、少しランダム性を加える
      /* const x = i / 4 % TEXTURE_SIZE / TEXTURE_SIZE - 0.5;
      const y = Math.floor(i / 4 / TEXTURE_SIZE) / TEXTURE_SIZE - 0.5; */

      //const x = (Math.random() - 0.5) * 2;
      //const y = (Math.random() - 0.5) * 2;
      //const z = 0

      const randomRadius = Math.random() * 1.;
      const randomAngle = Math.random() * Math.PI * 2;
      const x = Math.cos(randomAngle) * randomRadius;
      const y = Math.sin(randomAngle) * randomRadius;
      const z = 0;

      theArray[i + 0] = x;
      theArray[i + 1] = y;
      theArray[i + 2] = z;
      theArray[i + 3] = 1.0; // w成分は不使用だが1.0に設定
    }
  }

  private fillVelocityTexture(texture: THREE.DataTexture): void {
    const theArray = texture.image.data;

    // 初速度をほぼゼロに設定
    for (let i = 0; i < theArray.length; i += 4) {
      //const x = (Math.random() - 0.5) * 0.01;
      //const y = (Math.random() - 0.5) * 0.01;
      //const z = (Math.random() - 0.5) * 0.01;
      const x = 0;
      const y = 0;
      const z = 0;

      theArray[i + 0] = x;
      theArray[i + 1] = y;
      theArray[i + 2] = z;
      theArray[i + 3] = 1.0;
    }
  }

  private loadImage(imageUrl: string, cb: (
    dt: THREE.DataTexture
  ) => void) {
    return new Promise<THREE.DataTexture>(resolve => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        // 画像データを取得
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 画像データをテクスチャに変換
        const dt = new THREE.DataTexture(
          data.data,
          data.width,
          data.height,
          THREE.RGBAFormat
        );
        dt.needsUpdate = true;
        cb(
          dt
        )
        resolve(dt)
      };
      img.onerror = () => {
        console.error('Failed to load image:', imageUrl);
      };
      img.src = imageUrl;
    })

  }

  private createParticleSystem(): void {
    // パーティクル用のジオメトリ
    const geometry = new THREE.BufferGeometry();

    // パーティクルの位置を格納する配列
    const positions = new Float32Array(PARTICLES * 3);
    const uvs = new Float32Array(PARTICLES * 2);

    // UVをセット（これでGPUの計算結果にアクセスする）
    let p = 0;
    for (let j = 0; j < TEXTURE_SIZE; j++) {
      for (let i = 0; i < TEXTURE_SIZE; i++) {
        uvs[p++] = i / (TEXTURE_SIZE - 1);
        uvs[p++] = j / (TEXTURE_SIZE - 1);
      }
    }

    // バッファ属性を設定
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('puv', new THREE.BufferAttribute(uvs, 2));

    // パーティクル用のシェーダーマテリアル
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        texturePosition: { value: null },
        textureSize: { value: null },
        time: { value: 0.0 },
        uImageRate: { value: 0.0 },
        uParticleRate: { value: 1 },
        color: { value: new THREE.Color(0xffffff) },
        imageTexture: { value: this.imageTexture },
        imageTextureResolution: { value: new THREE.Vector2(TEXTURE_SIZE, TEXTURE_SIZE) },
        imageTexture2: { value: this.imageTexture2 },
        imageTexture2Resolution: { value: new THREE.Vector2(TEXTURE_SIZE, TEXTURE_SIZE) },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        uniform sampler2D texturePosition;
        uniform sampler2D textureSize;
        uniform float time;
        attribute vec2 puv;
        

        varying float vSize;
        varying vec3 vColor;
        varying vec2 vUv;
        varying float vDisplay;
        
        void main() {
          // パーティクルの位置をテクスチャから取得
          vec4 pos = texture2D(texturePosition, puv);
          
          // パーティクルのサイズをテクスチャから取得
          vec4 sizeInfo = texture2D(textureSize, puv);
          vSize = sizeInfo.x;

          if(vSize*12.<0.2){
            vDisplay = 0.;
            }else{
              vDisplay=1.;
              }
          
          // カメラに向かって常に正面を向くようにする
          vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);
          
          // サイズを適用（輝度に応じたサイズ変化）
          gl_PointSize = clamp(vSize*12., 1., 100.0);
          
          // UV位置に基づいて色を設定（これは見た目の効果用）
          vColor = mix(
            vec3(0.1, 0.2, 0.5), // 暗い部分の色
            vec3(0.9, 0.9, 1.0), // 明るい部分の色
            vSize / 2.0          // サイズに基づいて混合
          );

          vUv = puv;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,





      fragmentShader: `
        varying float vDisplay;
        varying float vSize;
        varying vec3 vColor;
        varying vec2 vUv;
        uniform sampler2D imageTexture;
        uniform vec2 imageTextureResolution;
        uniform sampler2D imageTexture2;
        uniform vec2 imageTexture2Resolution;


        uniform vec2 resolution;
        uniform vec2 uMouse;
        uniform float uParticleRate;
      uniform float uImageRate;


  vec2 scaleUv (vec2 uv, float scale) {
        vec2 center = vec2(0.5, 0.5);
        vec2 scaledUv = (uv - center) / scale + center;
        // スケーリング後のUV座標を元の範囲に戻す
        return scaledUv;
      }    

        void main() {
          // パーティクル形状を円形に
          float dist = length(gl_PointCoord - vec2(0.5, 0.5));
 




          if (dist > 1.-uParticleRate*0.5 || vDisplay == 0.) {
            discard; // 円の外側は描画しない
          }


          vec2 uv=vUv;
          
          uv= scaleUv(uv, 1.);
          uv.y = 1. - uv.y;
          
          uv.y = (uv.y-0.5)*1.4 + 0.5;
          
          vec2 uv1 = uv;
          vec2 uv2 = uv;
          uv1.y = (uv2.y - 0.5) / 1.4 + 0.5;
          uv2.y = (uv2.y - 0.5) / 1.4 + 0.5;
          uv1.y = (uv1.y-0.5)*(imageTextureResolution.x/imageTextureResolution.y) + 0.5;
          uv2.y = (uv2.y-0.5)*(imageTexture2Resolution.x/imageTexture2Resolution.y) + 0.5;

          
          vec2 centerUv = (vUv-vec2(0.5,0.5) )* 2.;
          float mouseDistance = smoothstep(0.,0.1, 
          length(centerUv - uMouse)
          );

                    
          float alpha = 1.;
      if(uv.x<0. || uv.x>1.){
        alpha= 0.;
        }
        if(uv.y<0. || uv.y>1.){
        alpha= 0.;
        }

          vec4 imgColor1 = texture2D(imageTexture, uv1);
          vec4 imgColor2 = texture2D(imageTexture2, uv);
          vec4 imgColor = mix(
          imgColor1,imgColor2,uImageRate
          );

          
          vec4 white=  vec4(
          vec3(pow(uParticleRate - 0., 2.)), uParticleRate);


          vec4 last = mix(
          white, imgColor, 1.-uParticleRate
          );
          //last.a = alpha * mouseDistance;
          
          gl_FragColor = last * alpha;
           //gl_FragColor = vec4(imgColor.rgb, 1.);
        }
      `,
      transparent: true,
      depthWrite: false,


    });

    // パーティクルシステムの作成
    this.particleSystem = new THREE.Points(geometry, particleMaterial);
    this.scene!.add(this.particleSystem);

    // ユニフォームを保存
    this.particleUniforms = particleMaterial.uniforms;
    this.getViewport()



  }
  gui: GUI | null = null;
  textureUI: TextureUI | null = null;

  effectComposer: EffectComposer | null = null;

  getCanvasSize = () => {
    const height = getVh(100);
    const width = window.innerWidth;
    return {
      height,
      width,
      aspect: width / height
    };
  }

  getViewport = () => {
    const vFOV = THREE.MathUtils.degToRad(this.camera.fov); // convert vertical fov to radians
    const height = 2 * Math.tan(vFOV / 2) * CAMERA_Z; // visible height
    const width = height * this.camera.aspect;           // visible width
    console.log('width:', width);
    return {
      height,
      width,
      aspect: this.camera.aspect
    };
  }

  private onWindowResize(): void {
    const size = this.getCanvasSize();
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(size.width, size.height);
  }

  private animate = (time: number): void => {
    if (this.isError) return
    if (!this.mouse) return

    const viewport = this.getViewport();
    const w = 4

    const mouseBaseViewport = {
      x: (viewport.width / w) * this.mouse.lerpMouse.x,
      y: (viewport.height / w) * this.mouse.lerpMouse.y
    };


    const elapsedTime = time * 0.001; // ミリ秒から秒に変換

    // GPUの計算を更新
    this.positionVariable.material.uniforms['time'].value = elapsedTime;
    this.velocityVariable.material.uniforms['time'].value = elapsedTime;
    this.sizeVariable.material.uniforms['time'].value = elapsedTime;

    this.positionVariable.material.uniforms['imageTexture'].value = this.imageTexture;
    this.velocityVariable.material.uniforms['imageTexture'].value = this.imageTexture;
    this.sizeVariable.material.uniforms['imageTexture'].value = this.imageTexture;

    this.positionVariable.material.uniforms['imageTextureResolution'].value = new THREE.Vector2(this.imageTexture?.image.width, this.imageTexture?.image.height);
    this.velocityVariable.material.uniforms['imageTextureResolution'].value = new THREE.Vector2(this.imageTexture?.image.width, this.imageTexture?.image.height);
    this.sizeVariable.material.uniforms['imageTextureResolution'].value = new THREE.Vector2(this.imageTexture?.image.width, this.imageTexture?.image.height);

    this.positionVariable.material.uniforms['imageTexture2'].value = this.imageTexture2;
    this.velocityVariable.material.uniforms['imageTexture2'].value = this.imageTexture2;
    this.sizeVariable.material.uniforms['imageTexture2'].value = this.imageTexture2;

    this.positionVariable.material.uniforms['imageTexture2Resolution'].value = new THREE.Vector2(this.imageTexture2?.image.width, this.imageTexture2?.image.height);
    this.velocityVariable.material.uniforms['imageTexture2Resolution'].value = new THREE.Vector2(this.imageTexture2?.image.width, this.imageTexture2?.image.height);
    this.sizeVariable.material.uniforms['imageTexture2Resolution'].value = new THREE.Vector2(this.imageTexture2?.image.width, this.imageTexture2?.image.height);

    const uMouse = new THREE.Vector2(
      mouseBaseViewport.x,
      -mouseBaseViewport.y
    );

    this.positionVariable.material.uniforms['uMouse'].value = uMouse;
    this.velocityVariable.material.uniforms['uMouse'].value = uMouse;
    this.sizeVariable.material.uniforms['uMouse'].value = uMouse;


    this.particleUniforms['imageTexture'].value = this.imageTexture;
    this.particleUniforms['imageTextureResolution'].value = new THREE.Vector2(this.imageTexture?.image.width, this.imageTexture?.image.height);
    this.particleUniforms['imageTexture2'].value = this.imageTexture2;
    this.particleUniforms['imageTexture2Resolution'].value = new THREE.Vector2(this.imageTexture2?.image.width, this.imageTexture2?.image.height);


    this.gpuCompute.compute();
    console.log('this.positionVariable.material.uniforms[:', this.positionVariable.material.uniforms['uParticleSizeContrust']);
    // パーティクルマテリアルのユニフォームを更新
    this.particleUniforms['texturePosition'].value = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
    this.particleUniforms['textureSize'].value = this.gpuCompute.getCurrentRenderTarget(this.sizeVariable).texture;
    this.particleUniforms['time'].value = elapsedTime;
    this.particleUniforms['uMouse'].value = uMouse
    this.particleUniforms['resolution'].value = new THREE.Vector2(TEXTURE_SIZE, TEXTURE_SIZE);

    this.render(time);
    this.stats.update();

    this.camera.position.x = !this.cameraMove ? 0 : this.mouse.lerpMouse.x * 0.5;
    this.camera.position.y = !this.cameraMove ? 0 : -this.mouse.lerpMouse.y * 0.5;
    this.camera.lookAt(0, 0, 0);
    requestAnimationFrame(this.animate);
  }

  private render(_time: number): void {
    this.renderer.render(this.scene!, this.camera);
  }

  animStart = (myObject: any) => {
    const to = {
      value: myObject.uParticleRate
    }
    gsap.to(
      to
      , {
        value: 0,
        delay: 3.8,
        duration: 2.5,
        ease: "power4.out",
        onUpdate: () => {
          this.positionVariable.material.uniforms['uParticleRate'].value = to.value;
          this.velocityVariable.material.uniforms['uParticleRate'].value = to.value;
          this.sizeVariable.material.uniforms['uParticleRate'].value = to.value;
          this.particleUniforms['uParticleRate'].value = to.value;
        }
      })

    const to2 = {
      value: myObject.uRandomRate
    }

    gsap.to(
      to2
      , {
        value: 0,
        duration: 2,
        delay: 1,
        onUpdate: () => {
          this.positionVariable.material.uniforms['uRandomRate'].value = to2.value;
          this.velocityVariable.material.uniforms['uRandomRate'].value = to2.value;
          this.sizeVariable.material.uniforms['uRandomRate'].value = to2.value;

        }
      })

    const to3 = {
      value: myObject.uSpread
    }
    gsap.to(
      to3
      , {
        value: 2,
        duration: 1,
        delay: 2.5,
        ease: "power2.inOut",
        onComplete: () => {
          gsap.to(
            to3
            , {
              value: 0,
              duration: 1,
              delay: 0,
              ease: "power2.inOut",
              onComplete: () => {
              },
              onUpdate: () => {
                this.positionVariable.material.uniforms["uSpread"].value = to3.value;
                this.velocityVariable.material.uniforms["uSpread"].value = to3.value;
                this.sizeVariable.material.uniforms["uSpread"].value = to3.value;
              }
            })
        },
        onUpdate: () => {
          this.positionVariable.material.uniforms["uSpread"].value = to3.value;
          this.velocityVariable.material.uniforms["uSpread"].value = to3.value;
          this.sizeVariable.material.uniforms["uSpread"].value = to3.value;

        }
      })


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