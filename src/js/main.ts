import Common from "./Common";
import MovieModal from "./Common/MovieModal";
import ScrollController from "./Common/ScrollController";
import SmoothScroll from "./Common/SmoothScroll";
import Top from "./Top";

export const LOADING_HIDDEN = false;
window.addEventListener("DOMContentLoaded", () => {
  new ScrollController();


  const smoothScroll = new SmoothScroll();
  smoothScroll.init();
  new Common();
  const top = new Top();
  top.init();
});
