import gsap from 'gsap';
import p5 from 'p5';
import { clamp, smoothstep } from 'three/src/math/MathUtils.js';
import { drawDistortedCircle } from './utils';


const roundNumber = (num: number, decimalPlaces: number): number => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(num * factor) / factor;
}
export class Circle3 {
  private p5Instance: p5 | null = null;
  path: {
    x: number
    y: number
  }[] = []
  constructor() {
    this.p5Instance = new p5(this.sketch);
  }

  private sketch = (p: p5) => {
    const dotSize = 20

    let centerX: number;
    let centerY: number;

    const largeCirclesRadius = [
      { radius: 0, to: 290 },
      { radius: 0, to: 270 },
      { radius: 0, to: 250 },
      { radius: 0, to: 230 },
    ]


    for (let j = 0; j < largeCirclesRadius.length; j++) {
      const val = { val: 0 }
      gsap.to(val, {
        val: largeCirclesRadius[j].to,
        duration: 1 + 0.2 * j,
        ease: "power1.out",
        delay: j * 0.2,
        onUpdate: () => {
          largeCirclesRadius[j].radius = roundNumber(val.val, 0);
        }
      });
    }




    p.setup = () => {
      p.createCanvas(800, 800);
      centerX = p.width
        / 2;
      centerY = p.height
        / 2;

      const pathSvg = document.querySelector('#path path') as SVGPathElement;
      const path = pathSvg.getAttribute('d') as string;
      console.log('pathSvg:', pathSvg);
      const pathLength = pathSvg.getTotalLength();
      const w = pathSvg.getAttributeNodeNS(null, 'width');
      console.log('w:', w);
      for (let i = 0; i < 1000; i++) {
        const point = pathSvg.getPointAtLength(i / 1000 * pathLength);
        this.path.push({
          x: point.x,
          y: point.y
        });
      }
    };

    p.draw = () => {

      p.background(
        255
      );
      p.noStroke();

      const time = p.millis() * 0.001;
      p.fill(255, 150, 7);

      const mod = (num: number, modulus: number) => {
        return ((num % modulus) + modulus) % modulus;
      }

      const numPerLargeCircle = 20
      for (let j = 0; j < largeCirclesRadius.length; j++) {
        const isLast = j === largeCirclesRadius.length - 1;
        for (let i = 0; i < (isLast ? 1 : numPerLargeCircle); i++) {

          const angle = time * 2 - 0.1 * i + (j) * 0.2;

          const rate = ((angle + 10) % 10) / 10


          const pointFromPath = this.path[Math.floor(rate * this.path.length)];

          const x = pointFromPath.x + (isLast ? 15 * (j - 1) : 15 * j)
          const y = pointFromPath.y + (isLast ? 15 * (j - 1) : 15 * j)
          if (!x || !y) {
            console.log('x:', x);
          };
          const circleSize = dotSize - i * 0.7 - 0.9 * j + (isLast ? 40 : 0);
          //p.circle(x, y, dotSize - (i) * 0.7 - 0.9 * j + (isLast ? 40 : 0));
          // p.circle(x, y, circleSize); // 元のコード
          drawDistortedCircle(p, x, y, circleSize, 0.2); // 歪んだ円
        }
      }
    };
  };
}