const secIds = ["tt-fv", "tt-prd-teri", "tt-prd-taru", "tt-oshi", "tt-season"];
//const prdStatus = ["double", "teri", "taru", "double", "double"];

const getCurrentSection = (secIds: string[]) => {
  const overs = secIds.filter((el) => {
    const dom = document.querySelector(`#${el}`);
    if (dom) {
      const rect = dom.getBoundingClientRect();
      const top = rect.top;
      const threshold = window.innerHeight * 0.5;
      if (top < threshold) {
        return true;
      }
    }
    return false;
  });
  return overs[overs.length - 1];
};

export default class PcBg {
  activeId: string;
  activeIndex: number;
  activePictureIndex: number;
  teriInview: boolean;
  LBState: string;
  taruInview: boolean;
  teriSecInview: boolean;
  taruSecInview: boolean;
  pcBg: HTMLElement;
  pcBgPics: NodeListOf<Element>;

  constructor() {
    this.init();
    this.activeIndex = 0;
    this.activePictureIndex = -1;
    this.activeId = "tt-fv";
    this.teriInview = false;
    this.taruInview = false;
    this.teriSecInview = false;
    this.taruSecInview = false;
    this.LBState = "double";
    this.pcBg = document.getElementById("pc-bg") as HTMLElement;
    this.pcBgPics = document.querySelectorAll(".pc-bg-over__item");
  }

  init = () => {
    this.addEvent();
    this.initObserver("prd-teri-video");
    this.initObserver("prd-taru-video");
    this.initObserver("tt-prd-teri", true);
    this.initObserver("tt-prd-taru", true);
  };
  initObserver(id: string, op = false) {
    const callback = (entries: any) => {
      entries.forEach((entry: any) => {
        console.log("entry.isIntersecting:", entry.isIntersecting);
        console.log("id:", id);
        if (id === "prd-teri-video") {
          this.teriInview = entry.isIntersecting;
        }
        if (id === "prd-taru-video") {
          this.taruInview = entry.isIntersecting;
        }
        if (id === "tt-prd-teri") {
          this.teriSecInview = entry.isIntersecting;
        }
        if (id === "tt-prd-taru") {
          this.taruSecInview = entry.isIntersecting;
        }
      });
    };
    const observer = new IntersectionObserver(callback, {
      root: null,
      rootMargin: op ? window.innerHeight + "px" : "0px",
      threshold: op ? 0.1 : 0.2,
    });

    observer.observe(document.querySelector(`#${id}`)!);
  }

  onScroll = () => {
    this.activeId = getCurrentSection(secIds);
    this.activeIndex = secIds.indexOf(this.activeId);
    this.onChangeActive();
  };
  addEvent = () => {
    window.addEventListener("scroll", () => this.onScroll());
    window.addEventListener("load", () => this.onScroll());
    document.querySelectorAll(".prd__desc__pic").forEach((el, i) => {
      console.log("el:", el);
      if (el) {
        el.addEventListener("mouseover", () => this.mouseover(i));
        el.addEventListener("mouseleave", this.mouseleave);
      }
    });
  };
  onChangeActive = () => {
    const teriSec = document.getElementById("tt-prd-teri");
    const teriSecTop = teriSec!.getBoundingClientRect().top;
    const secInviewTeri =
      teriSecTop + teriSec!.clientHeight > window.innerHeight &&
      teriSecTop + teriSec!.clientHeight / 4 < 0;
    const taruSec = document.getElementById("tt-prd-taru");
    const taruSecTop = taruSec!.getBoundingClientRect().top;

    const secInviewTaru =
      taruSecTop + taruSec!.clientHeight > window.innerHeight &&
      taruSecTop + taruSec!.clientHeight / 4 < 0;

    let next = "";

    if (this.teriInview || secInviewTeri) {
      next = "teri";
    } else if (this.taruInview || secInviewTaru) {
      next = "taru";
    } else {
      next = "double";
    }

    if (this.teriInview) {
      document.querySelector("#pc-bg-teri")?.classList.add("active");
      document.querySelector("#pc-bg-menu")?.classList.remove("active");
      document.querySelector("#pc-bg-taru")?.classList.remove("active");
    } else if (this.taruInview) {
      document.querySelector("#pc-bg-taru")?.classList.add("active");
      document.querySelector("#pc-bg-menu")?.classList.remove("active");
      document.querySelector("#pc-bg-teri")?.classList.remove("active");
    } else {
      document.querySelector("#pc-bg-menu")?.classList.add("active");
      document.querySelector("#pc-bg-teri")?.classList.remove("active");
      document.querySelector("#pc-bg-taru")?.classList.remove("active");
    }
    if (this.LBState !== next) {
      document
        .querySelector(".pc-bg__left-bottom")
        ?.classList.remove(this.LBState);
      this.LBState = next;
      if (this.LBState === "teri") {
        document.querySelector(".pc-bg__left-bottom")?.classList.add("teri");
      } else if (this.LBState === "taru") {
        document.querySelector(".pc-bg__left-bottom")?.classList.add("taru");
      } else {
        document.querySelector(".pc-bg__left-bottom")?.classList.add("double");
      }
    }

    this.pcBg.classList.remove("is-over");
  };
  onChangePicture = () => {
    if (this.activePictureIndex === -1) {
      this.pcBg.classList.remove("is-over");
      this.pcBgPics.forEach((el) => {
        el.classList.remove("is-active");
      });
    } else {
      console.log("this.pcBg:", this.pcBg);
      this.pcBg.classList.add("is-over");
      this.pcBgPics.forEach((el) => {
        el.classList.remove("is-active");
      });
      this.pcBgPics[this.activePictureIndex].classList.add("is-active");
    }
  };
  mouseover = (index: number) => {
    this.activePictureIndex = index;
    console.log("this.activePictureIndex:", this.activePictureIndex);
    this.onChangePicture();
  };
  mouseleave = () => {
    this.activePictureIndex = -1;
    this.onChangePicture();
  };
}
