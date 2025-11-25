import Common from "../Common";
import ScrollController from "../Common/ScrollController";
import SmoothScroll from "../Common/SmoothScroll";
import Top from "../Top";
import { Stage } from "./Stage";

window.addEventListener("DOMContentLoaded", () => {
  new ScrollController();
  const smoothScroll = new SmoothScroll();
  smoothScroll.init();
  new Common();
  /* window.addEventListener('load', () => {
    new Stage()
  }) */
  const top = new Top();
  top.init();
});
