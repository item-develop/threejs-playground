import Common from "./Common";;

import * as THREE from "three";

interface IShaderPassProps {
    material: any;
    output: any;
}

export default class ShaderPass {
    props: any;
    uniforms: any;
    scene!: THREE.Scene;
    camera!: THREE.Camera;
    material!: THREE.RawShaderMaterial;
    geometry!: any;
    plane!: THREE.Mesh<any, any, THREE.Object3DEventMap>;
    constructor(props: IShaderPassProps) {
        this.props = props;
        this.uniforms = this.props.material?.uniforms;
    }

    init(_simProps?: any) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();

        if (this.uniforms) {
            this.material = new THREE.RawShaderMaterial(this.props.material);
            this.geometry = new THREE.PlaneGeometry(2.0, 2.0);
            this.plane = new THREE.Mesh(this.geometry, this.material);
            this.scene.add(this.plane);
        }

    }

    update(_props?: any) {
        Common.renderer.setRenderTarget(this.props.output);
        Common.renderer.render(this.scene, this.camera);
        Common.renderer.setRenderTarget(null);
    }
}