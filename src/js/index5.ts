import Common from "./Common";
import ScrollController from "./Common/ScrollController";
import SmoothScroll from "./Common/SmoothScroll";
import Top from "./Top";
import ItemLogoStage from "./ItemLogoStage";

export const LOADING_HIDDEN = false;
window.addEventListener("DOMContentLoaded", () => {
  new ScrollController();
  const smoothScroll = new SmoothScroll();
  smoothScroll.init();
  new Common();
  window.addEventListener('load', () => {
    new ItemLogoStage()
  })
  const top = new Top();
  top.init();

});
