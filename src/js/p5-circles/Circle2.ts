import gsap from 'gsap';
import p5 from 'p5';
import { clamp, smoothstep } from 'three/src/math/MathUtils.js';
import { drawDistortedCircle } from './utils';


const roundNumber = (num: number, decimalPlaces: number): number => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(num * factor) / factor;
}
export class Circle2 {
  private p5Instance: p5 | null = null;

  constructor() {
    this.p5Instance = new p5(this.sketch);
  }

  private sketch = (p: p5) => {
    const dotSize = 7;

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


    };

    p.draw = () => {
      p.background(
        255
      );
      p.fill(244, 150, 7);
      p.noStroke();

      const time = p.millis() * 0.001;

      const numPerLargeCircle = 80
      for (let j = 0; j < largeCirclesRadius.length; j++) {
        for (let i = 0; i < numPerLargeCircle; i++) {

          const angle = p.TWO_PI / numPerLargeCircle * i;
          const scaleBaseAngle = (p.TWO_PI * time) % p.TWO_PI;


          const isLast = j === largeCirclesRadius.length - 1;
          const delay = (time * (20) - j * 4) % numPerLargeCircle
          const dasd = Math.floor((i - delay) / (numPerLargeCircle / 2))
          const _i = dasd >= 0 ? i : i + numPerLargeCircle;

          const scale = isLast ? Math.max(0, ((_i - delay) % (numPerLargeCircle)) * 0.03 - 1.3) : Math.max(0, ((_i - delay) % (numPerLargeCircle / 2)) * 0.07 - 0.7);

          const scale2 = largeCirclesRadius[j].radius / 220

          const rateScale = 1

          const radius = largeCirclesRadius[j].radius - (rateScale - 1) * 10;
          const x = centerX + radius * p.cos(angle);
          const y = centerY + radius * p.sin(angle);

          //p.circle(x, y, dotSize * scale * scale2);

          drawDistortedCircle(p, x, y, dotSize * scale * scale2, 0.2); // 歪んだ円

        }
      }
    };
  };
}