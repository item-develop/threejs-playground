/* function isOverlapping(x: number, y: number, posArray: Uint8Array | Uint8ClampedArray, currentIndex: number, radius: number): boolean {
  for (let i = 0; i < currentIndex; i += 4) {
    const dx = x - posArray[i];
    const dy = y - posArray[i + 1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 2 * radius) {
      return true;
    }
  }
  return false;
} */

import * as THREE from 'three';
import { GPUComputationRenderer, } from 'three/examples/jsm/Addons.js';

export class Particles {
  private WIDTH = 10;
  private PARTICLES = this.WIDTH * this.WIDTH;
  getCanvasSize: () => {
    width: number
    height: number
  }
  viewport
    : {
      x: number
      y: number
    } = {
      x: 0,
      y: 0
    }

  private camera!: THREE.PerspectiveCamera;
  private geometry!: THREE.BufferGeometry;



  private gpuCompute!: GPUComputationRenderer;
  private velocityVariable: any;
  private positionVariable: any;
  private particleUniforms!: { [uniform: string]: THREE.IUniform };


  renderer = new THREE.WebGLRenderer();
  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    getCanvasSize: () => {
      width: number
      height: number
    }
  ) {
    this.getCanvasSize = getCanvasSize
    this.camera = camera
    this.renderer = renderer
    this.init();
    this.animate();
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

  private init(): void {
    this.canvasSize = this.getCanvasSize()
    this.viewport = this.getViewport();
    this.initComputeRenderer();
    this.initParticles();
  }

  private initComputeRenderer(): void {
    this.gpuCompute = new GPUComputationRenderer(this.WIDTH, this.WIDTH, this.renderer);

    const dtPosition = this.gpuCompute.createTexture();
    const dtVelocity = this.gpuCompute.createTexture();

    this.fillTextures(dtPosition, dtVelocity);

    this.velocityVariable = this.gpuCompute.addVariable("textureVelocity", this.computeShaderVelocity(), dtVelocity);
    this.velocityVariable.material.uniforms['viewport'] = {
      value: new THREE.Vector2(this.viewport.x, this.viewport.y)
    }

    this.positionVariable = this.gpuCompute.addVariable("texturePosition", this.computeShaderPosition(), dtPosition);

    this.gpuCompute.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable]);
    this.gpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable]);

    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error(error);
    }
  }

  private initParticles(): void {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.PARTICLES * 3);
    let p = 0;
    for (let i = 0; i < this.PARTICLES; i++) {
      positions[p++] = 0;
      positions[p++] = 0;
      positions[p++] = 0;
    }

    const uvs = new Float32Array(this.PARTICLES * 2);
    p = 0;
    for (let j = 0; j < this.WIDTH; j++) {
      for (let i = 0; i < this.WIDTH; i++) {
        uvs[p++] = i / (this.WIDTH - 1);
        uvs[p++] = j / (this.WIDTH - 1);
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    this.particleUniforms = {
      texturePosition: { value: null },
      textureVelocity: { value: null },
      cameraConstant: { value: this.getCameraConstant(this.camera) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.particleUniforms,
      vertexShader: this.particleVertexShader(),
      fragmentShader: this.particleFragmentShader()
    });

    this.particles = new THREE.Points(this.geometry, material);
    this.particles.matrixAutoUpdate = false;
    this.particles.updateMatrix();

  }

  particles!: THREE.Points
  private fillTextures(texturePosition: THREE.DataTexture, textureVelocity: THREE.DataTexture): void {
    const posArray = texturePosition.image.data;
    const velArray = textureVelocity.image.data;

    //    const particleRadius = 5.0; // Should match the value in uniforms

    for (let k = 0, kl = posArray.length; k < kl; k += 4) {
      let x, y;
      /* do {
      } while (isOverlapping(x, y, posArray, k, particleRadius)); */
      x = 0;
      y = 0;

      posArray[k + 0] = x;
      posArray[k + 1] = y;
      posArray[k + 2] = 0;
      posArray[k + 3] = 1;

      velArray[k + 0] = (Math.random() - 0.5) * 8;
      velArray[k + 1] = (Math.random() - 0.5) * 8;
      velArray[k + 2] = 0;
      velArray[k + 3] = 1;
    }

    console.log('velArray:', velArray);
  }

  private getCameraConstant(camera: THREE.PerspectiveCamera): number {
    return this.canvasSize.height / (Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
  }


  onWindowResize(): void {
    this.canvasSize = this.getCanvasSize()
    this.camera.aspect = this.canvasSize.width / this.canvasSize.height;
    this.camera.updateProjectionMatrix();

    this.particleUniforms.cameraConstant.value = this.getCameraConstant(this.camera);
    this.viewport = this.getViewport();
    this.velocityVariable.material.uniforms['viewport'] = {
      value: new THREE.Vector2(this.viewport.x, this.viewport.y)
    }

  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.render();
  }

  private render(): void {
    this.gpuCompute.compute();
    this.particleUniforms.texturePosition.value = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
    this.particleUniforms.textureVelocity.value = this.gpuCompute.getCurrentRenderTarget(this.velocityVariable).texture;
  }

  private computeShaderPosition(): string {
    return `
            #define delta ( 1.0 / 60.0 )
            void main() {
vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 tmpPos = texture2D( texturePosition, uv );
      vec3 pos = tmpPos.xyz;
      vec4 tmpVel = texture2D( textureVelocity, uv );
      vec3 vel = tmpVel.xyz;

      // Update position
      pos += vel * delta;
      gl_FragColor = vec4( pos, 1.0 );
            }
        `;
  }

  private computeShaderVelocity(): string {
    return `
    uniform vec2 viewport;

            void main() {
       vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 tmpPos = texture2D( texturePosition, uv );
      vec3 pos = tmpPos.xyz;
      vec4 tmpVel = texture2D( textureVelocity, uv );
      vec3 vel = tmpVel.xyz;


      // Check boundaries and reflect velocity
      if (abs(pos.x) > viewport.x/4.-0.2) {
        bool isXPositive = pos.x > 0.0;
        vel.x = isXPositive ? -abs(vel.x) : abs(vel.x); 
      }
      if (abs(pos.y) > viewport.y/2.-0.2) {
        bool isYPositive = pos.y > 0.0;
        vel.y = isYPositive ? -abs(vel.y) : abs(vel.y);
      }
      // You can add additional velocity updates here if needed


      float particleRadius = 0.2;  // Should match the value in uniforms


            for (float y = 0.0; y < 1.0; y += 1.0 / resolution.y) {

    for (float x = 0.0; x < 1.0; x += 1.0 / resolution.x) {
      vec2 otherUV = vec2(x, y);
      if (otherUV != uv) {
        vec3 otherPos = texture2D(texturePosition, otherUV).xyz;
        vec3 otherVel = texture2D(textureVelocity, otherUV).xyz;
        vec3 diff = pos - otherPos;
        float distance = length(diff);
        
        if (distance < 2.0 * particleRadius && distance > 0.0) {
          vec3 collisionNormal = normalize(diff);
          
          // Check if particles are moving towards each other
          float relativeVelocityAlongNormal = dot(vel - otherVel, collisionNormal);
          
          if (relativeVelocityAlongNormal < 0.0) {
             // Calculate improved impulse
            float restitution = 1.; // Coefficient of restitution
            float impulseMagnitude = -(1.0 + restitution) * relativeVelocityAlongNormal;
            impulseMagnitude /= 2.0; // Assuming equal mass for both particles
            
            // Apply impulse
            vel += impulseMagnitude * collisionNormal;
          }
        }
      }

  }
  }






      gl_FragColor = vec4( vel.xyz, 1.0 );
            }
        `;
  }

  private particleVertexShader(): string {
    return `
            uniform sampler2D texturePosition;
            uniform float cameraConstant;
            varying vec4 vColor;
            varying vec2 vUv;
            uniform float radius;

            void main() {
                vec4 posTemp = texture2D( texturePosition, uv );
                vec3 pos = posTemp.xyz;
                vColor = vec4( .0, 0., .0, 1.0 );

                vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
                gl_PointSize = 1. * cameraConstant / ( - mvPosition.z );

                vUv = uv;


                gl_Position = projectionMatrix * mvPosition;
            }
        `;
  }

  private particleFragmentShader(): string {
    return `
            varying vec4 vColor;
            void main() {
                float f = length( gl_PointCoord - vec2( 0.5, 0.5 ) );
                if ( f > 0.1 ) {
                    discard;
                }

                gl_FragColor = vColor;
            }
        `;
  }
}

