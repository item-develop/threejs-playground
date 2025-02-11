import gsap from "gsap";
import Common from "../Common";
import ScrollController from "../Common/ScrollController";
import SmoothScroll from "../Common/SmoothScroll";
import Top from "../Top";
import WebGL from "./WebGL";

window.addEventListener("DOMContentLoaded", () => {
  const scc = new ScrollController();
  scc.lockBodyScroll();
  const smoothScroll = new SmoothScroll();
  smoothScroll.init();
  new Common();
  window.addEventListener('load', () => {
    new WebGL({
      $wrapper: document.body as HTMLElement
    });


    const logoSvg = document.querySelector('.water-logo svg') as HTMLElement;
    const logoW = logoSvg.clientWidth;
    console.log('logoW:', logoW);
    const rate = (number: number) => {
      return number * (900) + "px";
    }
    window.scrollTo(0, 0)
    setTimeout(() => {
      window.scrollTo(0, 0)
    }, 1000);

    const tl = gsap.timeline({
      delay: 0.5
    })

    tl.fromTo(logoSvg, {
      opacity: 0,
    }, {
      opacity: 1,
      duration: .5,
      ease: 'power2.inOut',
    })
    tl.fromTo(logoSvg.querySelector('.center-logo'), {
      opacity: 0,
      //y: '10px',
      //scale: 1.1,
    }, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 1,
      ease: 'power2.inOut',
    })


    console.log('rate(0.127):', rate(0.127));
    tl.fromTo([logoSvg.querySelector('.left-arm'),], {
      x: rate(0.12),
    }, {
      x: 0,
      duration: 1,
      ease: 'power4.inOut',
    }, '<')

    tl.fromTo([logoSvg.querySelector('.right-arm')], {
      x: rate(-0.12)
    }, {
      x: 0,
      duration: 1,
      ease: 'power4.inOut',
    }, '<')

    tl.to([logoSvg.querySelector('.left-mask'), logoSvg.querySelector('.right-mask')], {
      opacity: 0
    })

    tl.fromTo(document.querySelector('.water-logo-wrap'), {
    }, {
      backgroundColor: 'rgba(255,255,255,0)',
    })
    tl.fromTo([document.querySelectorAll('.cls-2'), document.querySelectorAll('.cls-3')], {
    }, {
      fill: "white",
      onComplete: () => {
        scc.releaseBodyScroll();
      }
    }, '<')


  })
  const top = new Top();
  top.init();




});
