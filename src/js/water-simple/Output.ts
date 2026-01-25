import Common from "./Common";
import * as THREE from "three";

import Simulation from "./Simulation";
import face_vert from "./glsl/sim/face.vert";
import color_frag from "./glsl/sim/color.frag?raw";


export default class Output {
    simulation!: Simulation;
    scene!: THREE.Scene;
    output!: THREE.Mesh<any, THREE.RawShaderMaterial, THREE.Object3DEventMap>;

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


        this.viewport = this.getViewport();

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





    addScene(mesh: any) {
        this.scene.add(mesh);
    }

    resize() {
        this.simulation.resize();
    }


    currentTime = 0;
    prevDiff = 0
    render(t: number) {
        
        this.output.material.uniforms.resolution.value.set(window.innerWidth, window.outerHeight);
        this.output.material.uniforms.uTime.value = t / 1000.

        Common.renderer.render(this.scene, this.camera);
        this.currentTime = t;
    }

    update(t: number) {
        this.simulation.update();
        this.render(t);
    }
}
