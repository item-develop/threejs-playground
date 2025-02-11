import face_vert from "./glsl/sim/face.vert";
import pressure_frag from "./glsl/sim/pressure.frag?raw";
import ShaderPass from "./ShaderPass";

interface ISimProps {
    boundarySpace: any;
    src_p: any;
    src_v: any;
    cellScale: any;
    dt: any;
    dst: any;
}

export default class Divergence extends ShaderPass {
    constructor(simProps: ISimProps) {
        super({
            material: {
                vertexShader: face_vert,
                fragmentShader: pressure_frag,
                uniforms: {
                    boundarySpace: {
                        value: simProps.boundarySpace
                    },
                    pressure: {
                        value: simProps.src_p.texture
                    },
                    velocity: {
                        value: simProps.src_v.texture
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
        });

        this.init();
    }

    update({ vel, pressure }: any) {
        this.uniforms.velocity.value = vel.texture;
        this.uniforms.pressure.value = pressure.texture;
        super.update();
    }

}