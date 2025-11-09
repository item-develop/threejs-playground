import Common from "./Common";
import * as THREE from "three";

import Simulation from "./Simulation";
import face_vert from "./glsl/sim/face.vert";
import color_frag from "./glsl/sim/color.frag?raw";
import { GPUComputationRenderer } from "three/examples/jsm/Addons.js";
import Mouse from "./Mouse";

export default class Output {
    simulation!: Simulation;
    scene!: THREE.Scene;

    output!: THREE.Mesh<any, THREE.RawShaderMaterial, THREE.Object3DEventMap>;
    private WIDTH = 5;
    private PARTICLES = this.WIDTH * this.WIDTH;


    private gpuCompute!: GPUComputationRenderer;
    private velocityVariable: any;
    private positionVariable: any;
    private particleUniforms!: { [uniform: string]: THREE.IUniform };

    getViewport() {
        const x = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z * this.camera.aspect;
        const y = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z;
        return {
            x, y
        }
    }
    viewport
        : {
            x: number
            y: number
        } = {
            x: 0,
            y: 0
        }


    constructor() {
        this.init();
    }
    camera!: THREE.PerspectiveCamera;

    init() {

        this.simulation = new Simulation();
        this.canvasSize = {
            width: window.innerWidth,
            height: window.innerHeight
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;
        this.camera.lookAt(0, 0, 0);

        console.log('this.getViewport():', this.getViewport());
        this.viewport = this.getViewport();
        this.initComputeRenderer();
        this.initParticles();

        this.output = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.RawShaderMaterial({
                vertexShader: face_vert,
                fragmentShader: color_frag,
                transparent: true,
                uniforms: {
                    velocity: {
                        value: this.simulation.fbos.vel_0!.texture
                    },
                    boundarySpace: {
                        value: new THREE.Vector2()
                    },
                    uImageChange: {
                        value: 0
                    },
                    resolution: {
                        value: new THREE.Vector2(window.innerWidth, window.outerHeight)
                    },
                    textureSize: {
                        value: new THREE.Vector2(1734, 1029)
                    },
                    uTime: {
                        value: 0
                    },
                    uMouseString: {
                        value: 0
                    },
                    uMouse: {
                        value: new THREE.Vector2(0, 0)
                    }
                },
            })
        );
        //        this.output.visible = false;

        this.scene.add(this.output);
    }
    canvasSize = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    private getCameraConstant(camera: THREE.PerspectiveCamera): number {
        return this.canvasSize.height / (Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
    }


    geometry!: THREE.BufferGeometry
    private initComputeRenderer(): void {
        this.gpuCompute = new GPUComputationRenderer(this.WIDTH, this.WIDTH, Common.renderer);

        const dtPosition = this.gpuCompute.createTexture();
        const dtVelocity = this.gpuCompute.createTexture();

        this.fillTextures(dtPosition, dtVelocity);

        this.velocityVariable = this.gpuCompute.addVariable("textureVelocity", this.computeShaderVelocity(), dtVelocity);
        this.velocityVariable.material.uniforms['viewport'] = {
            value: new THREE.Vector2(this.viewport.x, this.viewport.y)
        }
        this.velocityVariable.material.uniforms['velocity'] = {
            value: this.simulation.fbos.vel_0!.texture
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
            radius: { value: 1 },
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
        this.scene.add(this.particles);


    }

    particles!: THREE.Points



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
    uniform vec2 uMouse;
uniform sampler2D waterVelocity;

            void main() {
       vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 tmpPos = texture2D( texturePosition, uv );
      vec3 pos = tmpPos.xyz;
      vec4 tmpVel = texture2D( textureVelocity, uv );
      vec3 vel = tmpVel.xyz;


      vec2 posToUv = (pos.xy / viewport) + 0.5;
    vec2 waterVel = texture2D(waterVelocity, 
    (posToUv)
    ).xy *10.;



      // Check boundaries and reflect velocity
      if (abs(pos.x) > viewport.x/2.) {
        bool isXPositive = pos.x > 0.0;
        vel.x = isXPositive ? -abs(vel.x) : abs(vel.x); 
        waterVel.x = isXPositive ? -abs(waterVel.x) : abs(waterVel.x); 
      }
      if (abs(pos.y) > viewport.y/2.) {
        bool isYPositive = pos.y > 0.0;
        vel.y = isYPositive ? -abs(vel.y) : abs(vel.y);
        waterVel.y = isYPositive ? -abs(waterVel.y) : abs(waterVel.y);
      }
      // You can add additional velocity updates here if needed


      float particleRadius = .5;  // Should match the value in uniforms


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
            impulseMagnitude /= 2.; // Assuming equal mass for both particles
            
            // Apply impulse
            vel += impulseMagnitude * collisionNormal;
          }
        }
      }

  }
  }


        vec2 fromMouse =  normalize(uMouse-posToUv);
        float mouseDist = max(0., 0.1 - length(uMouse - posToUv));
        float mouseDist2 = length(uMouse - posToUv);

        vec2 currentVelDirection = normalize(vel.xy);


        float velDist = length(vel.xy);

        vec2 mixDist = mix(currentVelDirection, fromMouse, mouseDist );

        vec2 lastVel = mixDist * (velDist+(mouseDist2<0.1?mouseDist2 :mouseDist2<0.2?-mouseDist2: 0. )) ;

  float waterLen = length(waterVel);

  vec2 mixVelo = mix(vel.xy, waterVel.xy, waterLen*0.1 );



      gl_FragColor = vec4( vel.xy , 0., 1.0 );
      gl_FragColor = vec4( lastVel.xy , 0., 1.0 );

      //gl_FragColor = vec4( mixVelo.xy,0., 1.0 );
//      gl_FragColor = vec4( waterVel.xy,0., 1.0 );
     

      //gl_FragColor = vec4( vec3(0.), 1.0 );  
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
                //mvPosition = vec4( 0. ,0. ,0. , 1.0 );

                gl_PointSize = radius  * cameraConstant / ( - mvPosition.z );

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
                if ( f > 0.5 ) {
                    discard;
                }

                gl_FragColor = vColor;
            }
        `;
    }


    private fillTextures(texturePosition: THREE.DataTexture, textureVelocity: THREE.DataTexture): void {
        const posArray = texturePosition.image.data;
        const velArray = textureVelocity.image.data;

        //    const particleRadius = 5.0; // Should match the value in uniforms

        for (let k = 0, kl = posArray.length; k < kl; k += 4) {
            let x, y;
            /* do {
            } while (isOverlapping(x, y, posArray, k, particleRadius)); */
            x = (Math.random() - 0.5) * this.viewport.x;
            y = (Math.random() - 0.5) * this.viewport.x;

            posArray[k + 0] = x;
            posArray[k + 1] = y;
            posArray[k + 2] = 0;
            posArray[k + 3] = 1;

            velArray[k + 0] = (Math.random() - 0.5) * 1;
            velArray[k + 1] = (Math.random() - 0.5) * 1;
            velArray[k + 2] = 0;
            velArray[k + 3] = 1;
        }

        console.log('velArray:', velArray);
    }


    addScene(mesh: any) {
        this.scene.add(mesh);
    }

    resize() {
        this.simulation.resize();
    }

    lerpMouse = {
        x: 0,
        y: 0
    }
    currentTime = 0;
    prevDiff = 0
    render(t: number) {
        this.velocityVariable.material.uniforms['waterVelocity'] = {
            value: this.simulation.fbos.vel_0!.texture
        }
        console.log('Mouse.coords:', Mouse.coords);
        this.velocityVariable.material.uniforms['uMouse'] = {
            value: new THREE.Vector2((Mouse.coords.x + 1) / 2, (Mouse.coords.y + 1) / 2)
        }
        console.log('this.velocityVariable.material.uniforms[lue:', this.velocityVariable.material.uniforms['uMouse'].value);
        this.output.material.uniforms.resolution.value.set(window.innerWidth, window.outerHeight);
        this.output.material.uniforms.uTime.value = t / 1000.

        this.gpuCompute.compute();
        this.particleUniforms.texturePosition.value = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
        this.particleUniforms.textureVelocity.value = this.gpuCompute.getCurrentRenderTarget(this.velocityVariable).texture;
        this.particleUniforms.radius.value = 1;

        Common.renderer.render(this.scene, this.camera);
        this.currentTime = t;
    }

    update(t: number) {
        this.simulation.update();
        this.render(t);
    }
}
export const lerp = (start: number, end: number, amt: number, delta: number) => {
    const calc = (1 - amt * delta) * start + amt * delta * end;
    return calc;
};
