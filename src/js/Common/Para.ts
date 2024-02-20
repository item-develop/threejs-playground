import gsap from "gsap";
import { isSP } from "./utils";

const lerp = (start: number, end: number, amt: number) => {
  return (1 - amt) * start + amt * end;
};

const clamp = (num: number, min: number, max: number) => {
  return num <= min ? min : num >= max ? max : num;
};

interface ParaProps {
  target: HTMLElement;
  isFv?: boolean;
  sizeAdjust?: number;
  isReverse?: boolean;
}

export default class Para {
  target: HTMLElement;
  prevTime = 0;
  initY = 0;
  prevY = 0;
  sizeAdjust = 1;
  isInview = false;
  isFv = false;
  isReverse = false;

  vh: number;

  constructor({ target, isFv, sizeAdjust, isReverse }: ParaProps) {
    this.target = target;
    this.init();
    this.vh = window.innerHeight / 100;
    this.isFv = isFv ?? false;
    this.isReverse = isReverse ?? false;

    const elmAdjust = target.getAttribute("data-adjust") ?? "1";
    this.sizeAdjust =
      (sizeAdjust ?? 1) * Number(elmAdjust) * (isSP() ? 0.3 : 1);
  }

  observeCallback = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        this.isInview = true;
      } else {
        this.isInview = true;
      }
    });
  };
  init = () => {
    this.vh = window.innerHeight / 100;
    const observer = new IntersectionObserver(this.observeCallback, {
      root: null,
      rootMargin: "100px 100px 100px 100px",
      threshold: 0,
    });
    observer.observe(this.target);
    requestAnimationFrame(this.animate);
    window.addEventListener("load", () => {
      this.setValue();
    });
    window.addEventListener("resize", () => {
      this.setValue();
    });

    window.addEventListener("visibilitychange", () => {
      this.initY =
        this.target.parentElement!.getBoundingClientRect().top! +
        window.scrollY;

      const clampTop = clamp(
        this.target.parentElement!.getBoundingClientRect().top!,
        this.vh * -120,
        this.vh * 120
      );
      const top = !this.isFv
        ? clamp(this.vh * 50 - clampTop, -this.vh * 50, this.vh * 50)
        : clamp(
          this.initY - clampTop,
          0,
          this.initY + this.target.clientHeight
        );
      const plusMinus = this.isReverse ? -1 : 1;
      const moveTo = top * plusMinus * 0.06 * this.sizeAdjust;
      gsap.set(this.target, {
        y: moveTo,
        delay: 0.5,
      });
      this.prevY = moveTo;
    });
  };

  setValue = () => {
    this.vh = window.innerHeight / 100;
    this.initY =
      this.target.parentElement!.getBoundingClientRect().top! + window.scrollY;
  };

  animate = (t: number) => {
    if (!this.isInview) {
      requestAnimationFrame(this.animate);
      return;
    }
    this.initY =
      this.target.parentElement!.getBoundingClientRect().top! + window.scrollY;

    const clampTop = clamp(
      this.target.parentElement!.getBoundingClientRect().top!,
      this.vh * -120,
      this.vh * 120
    );

    const top = !this.isFv
      ? clamp(this.vh * 50 - clampTop, -this.vh * 100, this.vh * 100)
      : clamp(this.initY - clampTop, 0, this.initY + this.target.clientHeight);
    const plusMinus = this.isReverse ? -1 : 1;
    const moveTo = top * plusMinus * 0.06 * this.sizeAdjust;
    const move = lerp(this.prevY, moveTo, isSP() ? 0.2 : 1);

    gsap.set(this.target, {
      y: move,
    });
    this.prevY = move;
    this.prevTime = t;
    requestAnimationFrame(this.animate);
  };
}
