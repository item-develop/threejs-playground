import IntersectionObserverClass from "./Common/IntersectionObserverClass";
import Para from "./Common/Para";
import { textLineSplit, textWordSplit } from "./Common/textLineSplit";



export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default class Common {
  loaded: boolean;
  timer: any = 0
  prevSct = 0
  constructor() {
    this.loaded = false;
    this.init();
  }

  init = () => {

    document.querySelectorAll(".double-text-hover").forEach((el) => {
      const text = el.innerHTML;
      el.innerHTML = `<span class="text">${text}</span><span class="text">${text}</span>`;
    });
    this.addEvent();
    window.addEventListener("load", this.onPageLoad);
    window.addEventListener("resize", this.resize);
    document.querySelectorAll(".js-para").forEach((el) => {
      new Para({
        target: el as HTMLElement,
        isFv: el.getAttribute("data-fv") === "true",
        isReverse: el.getAttribute("data-reverse") === "true",
        sizeAdjust: (el.clientWidth / (window.innerWidth * 0.1)),
      });
    });

  };
  prevSize = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  resize = () => {
    const event = new Event('originalResize');
    const isiOS = isIOS()
    if (this.prevSize.width !== window.innerWidth || !isiOS) {
      window.dispatchEvent(event);
    }
    this.prevSize = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--rvh", `${vh}px`);
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      document.querySelectorAll('.text-line-split').forEach(el => {
        textLineSplit(el as HTMLElement)
      })
    }, 100)
  }



  scroll = () => {
    const sct = window.scrollY

    this.prevSct = sct
  };
  addEvent = () => {
    window.addEventListener('scroll', this.scroll)
  };


  onPageLoad = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
    document.documentElement.style.setProperty("--rvh", `${vh}px`);
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const vh = window.innerHeight * 0.01;

        document.documentElement.style.setProperty("--vh", `${vh}px`);
        document.documentElement.style.setProperty("--rvh", `${vh}px`);
      }, i * 300);
    }

    this.loaded = true;
    document.querySelectorAll('.text-line-split').forEach(el => {
      textLineSplit(el as HTMLElement)
    })
    document.querySelectorAll('.text-w-split').forEach(el => {
      textWordSplit(el as HTMLElement)
    })
    const body = document.body
    const pageName = body.getAttribute('data-page');
    document.body.classList.add('loaded')
    setTimeout(() => {
      const options = {
        root: null,
        rootMargin: "0px 0px 0px 0px",
        threshold: 0.5,
      };
      new IntersectionObserverClass("js-watch", options);
      const optionsFast = {
        root: null,
        rootMargin: "0px 0px 200px 0px",
        threshold: 1,
      };
      new IntersectionObserverClass("js-watch-fast", optionsFast);
    }, pageName === 'top' ? 140 : 140);
  };
}


