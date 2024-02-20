import SweetScroll from "sweet-scroll";

export default class SmoothScroll {
  links: any;
  targetDoms: any;
  offset: number;
  duration: number;

  constructor() {
    this.links = document.querySelectorAll('a[href^="#"]');

    this.offset = 80;
    this.duration = 800;
  }

  init() {
    this.addEventListeners();
  }

  addEventListeners() {
    this.links.forEach((link: HTMLElement) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = link.getAttribute("href")?.substring(1);
        const offset = -80;
        console.log("target:", target);
        if (!target) return;
        setTimeout(() => {
          const scroller = new SweetScroll({
            /* some options */
            duration: 700, // Specifies animation duration in integer
            easing: "easeOutQuint",
            offset: offset,
          });
          if (!target) return;
          const targetElm = document.getElementById(target);
          console.log("targetElm:", targetElm);
          scroller.toElement(targetElm!);
        }, 10);
      });
    });
  }

  scrollTo(target: string, offset: number) {
    const element = document.getElementById(target);
    console.log("element:", element);
    if (!element) return;
    const elementPosition = element.getBoundingClientRect().top;
    const startingPosition = window.pageYOffset;
    const distance =
      elementPosition - (offset === undefined ? this.offset : offset);
    let start = null as null | number;

    const ease = (t: number, b: number, c: number, d: number) => {
      t /= d / 2;
      if (t < 1) return (c / 2) * t * t + b;
      t--;
      return (-c / 2) * (t * (t - 2) - 1) + b;
    };
    const animation = (currentTime: number) => {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const run = ease(timeElapsed, startingPosition, distance, this.duration);
      window.scrollTo(0, run);
      if (timeElapsed < this.duration) requestAnimationFrame(animation);
    };

    requestAnimationFrame(animation);
  }
}
