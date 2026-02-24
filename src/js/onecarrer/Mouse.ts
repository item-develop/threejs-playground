import { clamp } from "three/src/math/MathUtils.js";

const lerp = (start: number, end: number, amt: number, delta: number) => {
  const calc = (1 - amt * delta) * start + amt * delta * end;
  return calc;
};

export class Mouse {
  mouse:
    {
      x: number
      y: number
    } = {
      x: 0,
      y: 0
    }

  lerpMouse:
    {
      x: number
      y: number
    } = {
      x: 0,
      y: 0
    }
  constructor() {
    window.addEventListener('mousemove', this.onMouseMove, false);
    window.requestAnimationFrame(this.update);
  }
  onMouseMove = (event: MouseEvent) => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  currentTime = 0;
  update = (time: number) => {
    console.log('this.lerpMouse.x:', this.lerpMouse.x);
    this.lerpMouse.x = lerp(
      this.lerpMouse.x,
      this.mouse.x,
      0.005,
      (time - this.currentTime) / 10
    )
    this.lerpMouse.x = clamp(this.lerpMouse.x, -1, 1);
    this.lerpMouse.y = lerp(
      this.lerpMouse.y,
      this.mouse.y,
      0.005,
      (time - this.currentTime) / 10
    )
    this.lerpMouse.y = clamp(this.lerpMouse.y, -1, 1);
    this.currentTime = time;
    window.requestAnimationFrame(this.update);
  }
}