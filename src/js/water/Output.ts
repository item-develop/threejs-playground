import Common from "./Common";
import * as THREE from "three";

import Simulation from "./Simulation";
import face_vert from "./glsl/sim/face.vert";
import color_frag from "./glsl/sim/color.frag?raw";
import { clamp } from "three/src/math/MathUtils.js";


export default class Output {
    simulation!: Simulation;
    scene!: THREE.Scene;
    camera!: THREE.Camera;
    output!: THREE.Mesh<any, THREE.RawShaderMaterial, THREE.Object3DEventMap>;
    constructor() {
        this.init();
    }

    init() {
        this.simulation = new Simulation();

        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        const txt = new THREE.TextureLoader().load("/img/pic.jpg")
        const txt2 = new THREE.TextureLoader().load("/img/pic2.jpg")
        txt.colorSpace = "display-p3-linear";
        txt2.colorSpace = "display-p3-linear";

        this.output = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.RawShaderMaterial({
                vertexShader: face_vert,
                fragmentShader: color_frag,
                uniforms: {
                    velocity: {
                        value: this.simulation.fbos.vel_0!.texture
                    },
                    boundarySpace: {
                        value: new THREE.Vector2()
                    },
                    uPic: {
                        value: txt
                    },
                    uPic2: {
                        value: txt2
                    },
                    uImageChange: {
                        value: 0
                    },
                    resolution: {
                        value: new THREE.Vector2(window.innerWidth, window.outerHeight)
                    },
                    textureSize: {
                        value: new THREE.Vector2(1734, 1029)
                    }
                },
            })
        );

        this.scene.add(this.output);
    }
    addScene(mesh: any) {
        this.scene.add(mesh);
    }

    resize() {
        this.simulation.resize();
    }

    render() {
        this.output.material.uniforms.uImageChange.value = clamp((document.querySelector('.fv')!.getBoundingClientRect().top as any) * -1 / (window.innerHeight / 1.5), 0, 1.5);
        this.output.material.uniforms.resolution.value.set(window.innerWidth, window.outerHeight);

        Common.renderer.setRenderTarget(null);
        Common.renderer.render(this.scene, this.camera);
    }

    update() {
        this.simulation.update();
        this.render();
    }
}