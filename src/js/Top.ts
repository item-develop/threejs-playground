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

    setTimeout(() => {
      const options = {
        root: null,
        rootMargin: "0px",
        threshold: 0.5,
      };
      new IntersectionObserverClass("js-watch", options);
      const optionsFast = {
        root: null,
        rootMargin: "0px",
        threshold: 0.2,
      };
      new IntersectionObserverClass("js-watch-fast", optionsFast);
    }, 0);
  };
}
