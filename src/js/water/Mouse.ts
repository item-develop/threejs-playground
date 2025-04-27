import * as THREE from "three";
import Common from "./Common";

class Mouse {
    diff: THREE.Vector2;
    coords: any;
    mouseMoved: boolean;
    coords_old: THREE.Vector2;
    timer: any;
    count: number;
    constructor() {
        this.mouseMoved = false;
        this.coords = new THREE.Vector2();
        this.coords_old = new THREE.Vector2();
        this.diff = new THREE.Vector2();
        this.timer = null;
        this.count = 0;
    }

    init() {
        document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false);
        document.addEventListener('touchstart', this.onDocumentTouchStart.bind(this), false);
        document.addEventListener('touchmove', this.onDocumentTouchMove.bind(this), false);
    }

    setCoords(x: number, y: number) {
        if (this.timer) clearTimeout(this.timer);
        this.coords.set((x / Common.width) * 2 - 1, - (y / Common.height) * 2 + 1);
        this.mouseMoved = true;
        this.timer = setTimeout(() => {
            this.mouseMoved = false;
        }, 100);

    }
    onDocumentMouseMove(event: MouseEvent) {
        this.setCoords(event.clientX, event.clientY);
    }
    onDocumentTouchStart(event: TouchEvent) {
        if (event.touches.length === 1) {
            // event.preventDefault();
            this.setCoords(event.touches[0].clientX, event.touches[0].clientY);
        }
    }
    onDocumentTouchMove(event: TouchEvent) {
        if (event.touches.length === 1) {
            // event.preventDefault();

            this.setCoords(event.touches[0].clientX, event.touches[0].clientY);
        }
    }

    update() {
        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);

        if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
    }
}

export default new Mouse();

