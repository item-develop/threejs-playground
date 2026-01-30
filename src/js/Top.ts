import "@splidejs/splide/css";
import "@splidejs/splide/css/skyblue";
import "@splidejs/splide/css/sea-green";
import "@splidejs/splide/css/core";
import IntersectionObserverClass from "./Common/IntersectionObserverClass";

export default class Top {
  loaded: boolean;
  active = 0;
  pcActive = 0;
  anchorClick = 0;
  pcPrevActive = -1;
  constructor() {
    this.loaded = false;
  }

  init = () => {
    window.addEventListener("load", this.onPageLoad);

  };

  onPageLoad = () => {
    this.loaded = true;
  };
}
