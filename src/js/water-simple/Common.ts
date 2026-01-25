import * as THREE from "three";

class Common {
    width: number;
    height: number;
    aspect: number;
    isMobile: boolean;
    breakpoint: number;
    fboWidth: null;
    fboHeight: null;
    resizeFunc: () => void;
    time: number;
    delta: number;
    pixelRatio!: number;
    renderer!: THREE.WebGLRenderer;
    clock!: THREE.Clock;

    constructor() {
        this.width = 0;
        this.height = 0;
        this.aspect = this.width / this.height;
        this.isMobile = false;
        this.breakpoint = 768;

        this.fboWidth = null;
        this.fboHeight = null;

        this.resizeFunc = this.resize.bind(this);

        this.time = 0;
        this.delta = 0;

    }

    init() {
        this.pixelRatio = window.devicePixelRatio;

        this.resize();

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });

        this.renderer.autoClear = false;

        this.renderer.setSize(this.width, this.height);

        this.renderer.setClearColor(0x000000);

        this.renderer.setPixelRatio(this.pixelRatio);

        this.clock = new THREE.Clock();
        this.clock.start();
    }

    resize() {
        this.width = window.innerWidth; // document.body.clientWidth;
        this.height = window.outerHeight;
        this.aspect = this.width / this.height;

        if (this.renderer) this.renderer.setSize(this.width, this.height);
    }

    update() {
        this.delta = this.clock.getDelta(); // Math.min(0.01, this.clock.getDelta());
        this.time += this.delta;
    }
}

export default new Common();