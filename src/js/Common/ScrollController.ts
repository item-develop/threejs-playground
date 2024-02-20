
import Lenis from '@studio-freight/lenis';
import { isSP } from './utils';

export default class ScrollController {
  lenis: Lenis
  scrollY = 0
  constructor() {
    this.lenis = new Lenis()
    this.init()
  }

  animate = (time: number) => {
    this.lenis.raf(time)
    requestAnimationFrame(this.animate)
  }
  resize = () => {
    this.lenis.destroy()
    console.log('isSP():', isSP());
    if (isSP()) {
      /*  this.lenis = new Lenis(
         {
           autoResize: true,
           syncTouch: true,
           syncTouchLerp: 0.7,
           lerp: 0.2,
 
         }
       ) */
    } else {
      this.lenis = new Lenis(
        {
          autoResize: true,
          syncTouchLerp: 1,
          lerp: 0.2
        }
      )
    }
  }

  init = () => {
    this.resize()
    requestAnimationFrame(this.animate)
    window.addEventListener('resize', this.resize)
  }

  lockBodyScroll = () => {
    if (!isSP()) {
      this.lenis.stop();
    } else {
      this.scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${this.scrollY}px`;
      document.body.style.width = "100%";
    }

  };

  releaseBodyScroll = () => {
    if (!isSP()) {
      this.lenis.start();
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, this.scrollY);
    }
  };

  scrollTo = (target: string, offset: number) => {
    const targetElm = document.getElementById(target);
    if (targetElm) {
      this.lenis.scrollTo(targetElm, {
        duration: 1, // Specifies animation duration in integer
        offset: offset,
      })
    }
  }
}
