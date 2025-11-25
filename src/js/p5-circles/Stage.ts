import gsap from 'gsap';
import p5 from 'p5';
import { clamp, smoothstep } from 'three/src/math/MathUtils.js';
import { drawDistortedCircle } from './utils';


const roundNumber = (num: number, decimalPlaces: number): number => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(num * factor) / factor;
}
export class Stage {
  private p5Instance: p5 | null = null;

  constructor() {
    this.p5Instance = new p5(this.sketch);
  }

  private sketch = (p: p5) => {
    const dotSize = 7;
    const initRate = {
      rate: 0
    }
    const initScale = {
      rate: 0
    }
    const numPerLargeCircle = 100;
    const largeCirclesRadius = [
      { radius: 0, to: 250 },
      { radius: 0, to: 275 },
      { radius: 0, to: 300 }
    ]
    let centerX: number;
    let centerY: number;



    p.setup = () => {
      p.createCanvas(800, 800);
      centerX = p.width
        / 2;
      centerY = p.height
        / 2;

      gsap.to(initRate, {
        rate: 250,
        duration: 3,
        ease: "power3.inOut",
      });
      gsap.to(initScale, {
        rate: 1,
        duration: 2,
        ease: "power3.out",
      });

      for (let j = 0; j < largeCirclesRadius.length; j++) {
        const val = { val: 0 }
        gsap.to(val, {
          val: largeCirclesRadius[j].to,
          duration: 1 + 0.2 * j,
          ease: "power1.out",
          delay: (2 - j) * 0.2,
          onUpdate: () => {
            largeCirclesRadius[j].radius = roundNumber(val.val, 0);
          }
        });
      }
    };

    p.draw = () => {
      p.background(
        255
      );
      p.fill(244, 150, 7);
      p.noStroke();

      const time = p.millis() * 0.001;

      for (let j = 0; j < largeCirclesRadius.length; j++) {
        for (let i = 0; i < numPerLargeCircle; i++) {
          const angle = p.TWO_PI / numPerLargeCircle * i + time * 0.1 * (j === 1 ? -1 : 1) + initScale.rate * 3;
          const scale = 0.4 + 0.3 * (p.sin(time * 1.2 * (j === 1 ? -1 : 1) + i * 0.3 + j * 40) + 1);

          const scale2 = 1 + 0.3 * (p.sin(time * 4 - j * 1) + 1);
          //const initScale = clamp(((initRate.rate - i * 1.2)), 0, 1);
          //const rateScale = smoothstep(((initRate.rate - i * 2)), -100, 20);
          const rateScale = 1



          const radius = largeCirclesRadius[j].radius - (rateScale - 1) * 10 + 1 * Math.sin(3 * time + j) * 5;

          const radius2 = largeCirclesRadius[j].to / 200;

          const _x = centerX + radius * p.cos(angle);
          const x = _x
          const y = centerY + radius * p.sin(angle);

          // p.circle(x, y, dotSize * scale * radius2 * rateScale * scale2);

          drawDistortedCircle(p, x, y, dotSize * scale * radius2 * rateScale * scale2, 0.5); // 歪んだ円

        }
      }
    };
  };
}