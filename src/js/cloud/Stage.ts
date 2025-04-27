import * as THREE from 'three';
import { DotScreenPass, EffectComposer, OrbitControls, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh } from '../Common/utils';
import baseFrag from '../glsl/cloud.frag?raw'
import baseVert from '../glsl/base.vert?raw'
import { GUI } from 'lil-gui'
import gsap from 'gsap';


const startText = (target: HTMLElement, between = 0.05, isLast = false) => {
  const dataText = target.getAttribute('data-text')
  const count = {
    count: 0
  }
  const setText = () => {
    gsap.set(count, {
      count: "+=1",
      delay: !isLast ? between :
        count.count === 4 ? 0.3 : between,
      onComplete: () => {
        target.textContent = dataText?.slice(0, count.count) ?? ""
        console.log('count.count:', count.count);
        if (count.count < dataText!.length) {
          setText()
        }
      }
    })
  }
  setText()
}

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



    this.gui = new GUI()

  }
  gui: GUI | null = null
  effectComposer: EffectComposer | null = null;
  material: THREE.ShaderMaterial | null = null;
  addObject = () => {
    const geometory = new THREE.PlaneGeometry(CANVAS_WIDTH, CANVAS_WIDTH / this.getCanvasSize().aspect);
    const texture = new THREE.TextureLoader().load('/cloud.png');

    this.material = new THREE.ShaderMaterial({
      vertexShader: baseVert,
      fragmentShader: baseFrag,
      uniforms: {
        uTexture: {
          value: texture
        },
        uTime: { value: 0.0 },
        uLightPosition: {
          value:
            new THREE.Vector2(0.3, 0.3)
        },

        uLightIntensity: { value: 0 },
        uUp: { value: 0 },
        uLightLeakIntensity: { value: 0.2 },
        uLensFlareIntensity: { value: 1 },
        uGradProgress: { value: 0 },
        uLightColor: {
          value:
            new THREE.Vector3(1, 1, 1)
        },

        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        imageResolution: {
          value: new THREE.Vector2(3863, 2362)
        }
      }
    })


    this.effectComposer = new EffectComposer(this.renderer);
    this.scene!.add(new THREE.Mesh(geometory, this.material));

    const renderPass = new RenderPass(this.scene!, this.camera)
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
    horizontalBlurPass.uniforms.blurSize.value = 4;

    const verticalBlurPass = new ShaderPass(VerticalBlurShader);
    verticalBlurPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    verticalBlurPass.uniforms.blurSize.value = 4;

    // 水平方向と垂直方向のパスを順番に追加
    this.effectComposer.addPass(horizontalBlurPass);
    this.effectComposer.addPass(verticalBlurPass);





    // Chainable methods
    const myObject = {
      uLensFlareIntensity: this.material!.uniforms.uLensFlareIntensity.value,
      uGradProgress: this.material!.uniforms.uGradProgress.value,
      uUp: this.material!.uniforms.uUp.value,
    };

    this.gui!.add(myObject, 'uLensFlareIntensity')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        console.log('value:', value);
        this.material!.uniforms.uLensFlareIntensity.value = value
      });

    this.gui!.add(myObject, 'uGradProgress')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.material!.uniforms.uGradProgress.value = value
      });
    this.gui!.add(myObject, 'uUp')
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        this.material!.uniforms.uUp.value = value
      });



    setTimeout(() => {
      gsap.to([horizontalBlurPass.uniforms.blurSize, verticalBlurPass.uniforms.blurSize], {
        value: 0,
        duration: 3,
        delay: 0
      })

      gsap.to(this.material!.uniforms.uLensFlareIntensity, {
        value: 0,
        duration: 3,
        delay: 0,
        ease: 'power2.inOut',
      })

      gsap.to(this.material!.uniforms.uGradProgress, {
        value: 1,
        duration: 3,
        ease: 'power2.inOut',
      })
      gsap.to(this.material!.uniforms.uUp, {
        value: 1,
        duration: 5,
        ease: 'power2.out',
      })
      gsap.fromTo(".words-block-area", {
        y: -800
      },
        {
          value: 1,
          y: 0,
          duration: 4,
          ease: 'power3.out',
        })


      document.querySelectorAll('.words-block').forEach((el) => {

        /*  gsap.fromTo(el, {
           y: -500 - Math.random() * 500
         },
           {
             value: 1,
             y: 0,
             duration: 3 + Math.random() * 2,
             ease: 'power3.out',
           }) */

        const target = el.querySelector('.words-block__head .line-wrap:nth-child(1) .line') as HTMLElement
        const target2 = el.querySelector('.words-block__head .line-wrap:nth-child(2) .line') as HTMLElement
        const name = el.querySelector('.words-block__name .line') as HTMLElement

        const delay = Number((el as HTMLElement).dataset.delay || "0")

        setTimeout(() => {
          startText(target)
          setTimeout(() => {
            startText(target2)
            setTimeout(() => {
              startText(name)
            }, target2.getAttribute('data-text')!.length * 50);
          }, target.getAttribute('data-text')!.length * 50);
        }, delay * 1000 + 1000);

      })

      setTimeout(() => {
        const target = document.querySelector('.logo-block .line') as HTMLElement
        startText(target, 0.1, true)
        gsap.fromTo('.logo-block__logo', {
          opacity: 0
        },
          {
            opacity: 1,
            duration: 1,
            ease: 'power1.inOut',
            delay: 1.5
          })

      }, 3800);




    }, 1000);

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
    this.material!.uniforms.uTime.value = time / 100;

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

