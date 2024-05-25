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

}
