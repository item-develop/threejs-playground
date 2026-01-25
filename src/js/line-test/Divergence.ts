import face_vert from "./glsl/sim/face.vert";
import divergence_frag from "./glsl/sim/divergence.frag?raw";

import ShaderPass from "./ShaderPass";

interface ISimProps {
    boundarySpace: any;
    src: any;
    dst_: any;
    dst: any;
    dt: any;
    cellScale: any;
}

export default class Divergence extends ShaderPass {
    constructor(simProps: ISimProps) {
        super({
            material: {
                vertexShader: face_vert,
                fragmentShader: divergence_frag,
                uniforms: {
                    boundarySpace: {
                        value: simProps.boundarySpace
                    },
                    velocity: {
                        value: simProps.src.texture
                    },
                    px: {
                        value: simProps.cellScale
                    },
                    dt: {
                        value: simProps.dt
                    }
                }
            },
            output: simProps.dst
        })

        this.init();
    }

    update({ vel }: any) {
        this.uniforms.velocity.value = vel.texture;
        super.update();
    }
}