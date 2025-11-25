import Common from "../Common";
import ScrollController from "../Common/ScrollController";
import SmoothScroll from "../Common/SmoothScroll";
import Top from "../Top";
import { Circle2 } from "./Circle2";
import { Circle3 } from "./Circle3";
import { Stage } from "./Stage";

window.addEventListener("DOMContentLoaded", () => {
  new ScrollController();
  const smoothScroll = new SmoothScroll();
  smoothScroll.init();
  new Common();
  window.addEventListener('load', () => {
    new Stage()
    new Circle2()
    new Circle3()
  })
  const top = new Top();
  top.init();
});
