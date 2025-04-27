import Common from "./Common";
import * as THREE from "three";

import Simulation from "./Simulation";
import face_vert from "./glsl/sim/face.vert";
import color_frag from "./glsl/sim/color.frag?raw";
import { clamp } from "three/src/math/MathUtils.js";
import Mouse from "./Mouse";


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

        this.scene.add(this.output);
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
        this.output.material.uniforms.uImageChange.value = clamp((document.querySelector('.fv')!.getBoundingClientRect().top as any) * -1 / (window.innerHeight / 1.5), 0, 1.5);
        this.output.material.uniforms.resolution.value.set(window.innerWidth, window.outerHeight);
        this.output.material.uniforms.uTime.value = t / 1000.
        //console.log('Mouse.coords.x:', Mouse.coords.x);

        const toCords = {
            x: (Mouse.coords.x*0.75 + 1) / 2,
            y: (Mouse.coords.y*0.75 + 1) / 2
        }

        this.lerpMouse.x = lerp(
            this.lerpMouse.x,
            toCords.x,
            0.01,
            (t - this.currentTime) / 10
        );
        this.lerpMouse.y = lerp(
            this.lerpMouse.y,
            toCords.y,
            0.01,
            (t - this.currentTime) / 10
        );

        this.output.material.uniforms.uMouse.value = new THREE.Vector2(
            this.lerpMouse.x,
            this.lerpMouse.y
        )
        this.output.material.uniforms.uMouseString.value = Mouse.diff.length();


        console.log('this.output.material.uniforms.uMouseString.value:', this.output.material.uniforms.uMouseString.value);

        Common.renderer.setRenderTarget(null);
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
