import mouse_vert from "./glsl/sim/mouse.vert";
import externalForce_frag from "./glsl/sim/externalForce.frag?raw";
import ShaderPass from "./ShaderPass";
import Mouse from "./Mouse";

import * as THREE from "three";
import gsap from "gsap";

interface ISimProps {
    cellScale: THREE.Vector2;
    dst: any;
    mouse_force: number;
    cursor_size: number;
}

export default class ExternalForce extends ShaderPass {
    mouse!: THREE.Mesh<any, THREE.RawShaderMaterial, THREE.Object3DEventMap>;

    autoForce = 0
    autoMouse = new THREE.Vector2(0, 0)
    constructor(simProps: ISimProps) {
        super({
            output: simProps.dst,
            material: undefined
        });

        this.init(simProps);

        document.body.addEventListener('click', () => {
            this.autoForce = 1
            const progress = { val: 0 }
            gsap.to(progress, {
                val: 1,
                duration: 3,
                onUpdate: () => {
                    this.autoMouse.set(
                        Math.sin(progress.val * Math.PI * 2) * 0.5,
                        Math.cos(progress.val * Math.PI * 2) * 0.5
                    )
                    const x = progress.val;
                    this.autoForce =( -4.0 * (x - 0.5) * (x - 0.5) + 1.0)*0.4;
                },
                onComplete: () => {
                    //this.autoForce = 0
                }
            })
        })
    }

    init(simProps: any) {
        super.init();
        const mouseG = new THREE.PlaneGeometry(
            1, 1
        );

        const mouseM = new THREE.RawShaderMaterial({
            vertexShader: mouse_vert,
            fragmentShader: externalForce_frag,
            blending: THREE.AdditiveBlending,
            uniforms: {
                px: {
                    value: simProps.cellScale
                },
                force: {
                    value: new THREE.Vector2(0.0, 0.0)
                },
                center: {
                    value: new THREE.Vector2(0.0, 0.0)
                },
                scale: {
                    value: new THREE.Vector2(simProps.cursor_size, simProps.cursor_size)
                }
            },
        })

        this.mouse = new THREE.Mesh(mouseG, mouseM);
        this.scene.add(this.mouse);
    }

    update(props: any) {
        
        const forceX = Mouse.diff.x / 2 * props.mouse_force;
        const forceY = Mouse.diff.y / 2 * props.mouse_force;

        const cursorSizeX = props.cursor_size * props.cellScale.x;
        const cursorSizeY = props.cursor_size * props.cellScale.y;

        
        const centerX = this.autoForce * this.autoMouse.x + Math.min(Math.max(Mouse.coords.x, -1 + cursorSizeX + props.cellScale.x * 2), 1 - cursorSizeX - props.cellScale.x * 2);
        const centerY = this.autoForce * this.autoMouse.y + Math.min(Math.max(Mouse.coords.y, -1 + cursorSizeY + props.cellScale.y * 2), 1 - cursorSizeY - props.cellScale.y * 2);

        const uniforms = this.mouse.material.uniforms;

        uniforms.force.value.set(forceX, forceY);
        //        console.log('centerX:', centerX);
        uniforms.center.value.set(centerX, centerY);
        uniforms.scale.value.set(props.cursor_size, props.cursor_size);

        super.update();
    }

}