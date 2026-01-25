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

    window.scrollTo(0, 0)
    setTimeout(() => {
      window.scrollTo(0, 0)
    }, 1000);

  })
  const top = new Top();
  top.init();




});
