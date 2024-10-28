import Common from "./Common";
import ScrollController from "./Common/ScrollController";
import SmoothScroll from "./Common/SmoothScroll";
import Stage from "./VerticalLerp";
import Top from "./Top";
import BlurStage from "./BlurStage";

export const LOADING_HIDDEN = false;
window.addEventListener("DOMContentLoaded", () => {
  new ScrollController();
  const smoothScroll = new SmoothScroll();
  smoothScroll.init();
  new Common();
  window.addEventListener('load', () => {
    new BlurStage()
  })
  const top = new Top();
  top.init();
});
