import face_vert from "./glsl/sim/face.vert";
import viscous_frag from "./glsl/sim/viscous.frag?raw";

import ShaderPass from "./ShaderPass";
import * as THREE from "three";

interface ISimProps {
    boundarySpace: THREE.Vector2;
    src: any;
    dst_: any;
    dst: any;
    viscous: number;
    cellScale: THREE.Vector2;
    dt: number;
}

export default class Viscous extends ShaderPass {
    constructor(simProps: ISimProps) {
        super({
            material: {
                vertexShader: face_vert,
                fragmentShader: viscous_frag,
                uniforms: {
                    boundarySpace: {
                        value: simProps.boundarySpace
                    },
                    velocity: {
                        value: simProps.src.texture
                    },
                    velocity_new: {
                        value: simProps.dst_.texture
                    },
                    v: {
                        value: simProps.viscous,
                    },
                    px: {
                        value: simProps.cellScale
                    },
                    dt: {
                        value: simProps.dt
                    }
                }
            },

            output: simProps.dst,

            output0: simProps.dst_,
            output1: simProps.dst
        } as any)

        this.init();
    }

    update({ iterations, dt }: any) {
        let fbo_in, fbo_out;
        //        this.uniforms.v.value = viscous;
        for (var i = 0; i < iterations; i++) {
            if (i % 2 == 0) {
                fbo_in = this.props.output0;
                fbo_out = this.props.output1;
            } else {
                fbo_in = this.props.output1;
                fbo_out = this.props.output0;
            }

            this.uniforms.velocity_new.value = fbo_in.texture;
            this.props.output = fbo_out;
            this.uniforms.dt.value = dt;

            super.update();
        }

        return fbo_out;
    }
}
