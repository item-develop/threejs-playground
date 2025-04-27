
const lerp = (a: number, b: number, t: number) => {
  return a + (b - a) * t;
}

export default class MouseMove {

  mouse = {
    x: 0, y: 0
  }

  lerpMouse = {
    x: 0, y: 0
  }

  mouseSpeed = {
    x: 0, y: 0
  }

  mouseSpeedLerp = {
    x: 0, y: 0
  }

  prevTime = 0;

  constructor() {
    window.addEventListener('mousemove', this.mousemoeve);

    requestAnimationFrame(this.animate);
  }

  mousemoeve = (e: MouseEvent) => {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }

  mouseSpeedAbs = () => {
    return Math.sqrt(this.mouseSpeed.x * this.mouseSpeed.x + this.mouseSpeed.y * this.mouseSpeed.y);
  }
  mouseSpeedAbsLepr = () => {
    return Math.sqrt(this.mouseSpeedLerp.x * this.mouseSpeedLerp.x + this.mouseSpeedLerp.y * this.mouseSpeedLerp.y);
  }

  animate = (t: number) => {
    this.lerpMouse.x = lerp(this.lerpMouse.x, this.mouse.x, 0.1);
    this.lerpMouse.y = lerp(this.lerpMouse.y, this.mouse.y, 0.1);
    const delta = t - this.prevTime;
    this.mouseSpeed.x = Math.abs(this.mouse.x - this.lerpMouse.x) / delta;
    this.mouseSpeed.y = Math.abs(this.mouse.y - this.lerpMouse.y) / delta;
    this.mouseSpeedLerp.x = lerp(this.mouseSpeedLerp.x, this.mouseSpeed.x, 0.1);
    this.mouseSpeedLerp.y = lerp(this.mouseSpeedLerp.y, this.mouseSpeed.y, 0.1);


    this.prevTime = t;
    requestAnimationFrame(this.animate);

  }

}
