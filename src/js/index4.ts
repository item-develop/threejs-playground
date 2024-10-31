import Common from "./Common";
import ScrollController from "./Common/ScrollController";
import SmoothScroll from "./Common/SmoothScroll";
import Top from "./Top";
import BoundDot from "./BoundDot";

export const LOADING_HIDDEN = false;
window.addEventListener("DOMContentLoaded", () => {
  new ScrollController();
  const smoothScroll = new SmoothScroll();
  smoothScroll.init();
  new Common();
  window.addEventListener('load', () => {
    new BoundDot()
  })
  const top = new Top();
  top.init();
});
