export default class GlobalMenu {
  humbMenu: HTMLElement | null;
  menuModal: HTMLElement | null;

  menuModalBg: HTMLElement | null;
  isOpen: boolean;
  scrollY: number;
  toggleDoms: string[];

  constructor() {
    this.humbMenu = document.querySelector(".app-header__humb");
    this.menuModal = document.querySelector(".menu-modal");
    this.menuModalBg = document.querySelector(".menu-modal__bg");
    this.toggleDoms = [".invest-page-bg", "#page-top", "#page-invest"];
    this.scrollY = 0;

    this.isOpen = false;
    this.init();
  }

  init() {
    this.humbMenu?.addEventListener("click", this.toggle);
    this.menuModalBg?.addEventListener("click", this.toggle);
  }
  toggle = () => {
    if (this.isOpen) {
      this.menuClose();
    } else {
      this.menuOpen();
    }
  };
  menuOpen = () => {
    this.isOpen = true;
    this.menuModal?.classList.add("open");
    this.humbMenu?.classList.add("open");

    this.toggleDoms.forEach((dom) => {
      const el = document.querySelector(dom);
      el?.classList.add("open");
    });

    this.lockBodyScroll();
  };
  menuClose = () => {
    if (this.isOpen) {
      this.isOpen = false;
      this.menuModal?.classList.remove("open");
      this.humbMenu?.classList.remove("open");
      this.toggleDoms.forEach((dom) => {
        const el = document.querySelector(dom);
        el?.classList.remove("open");
      });
      this.releaseBodyScroll();
    }
  };

  lockBodyScroll = () => {
    this.scrollY = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${this.scrollY}px`;
    document.body.style.width = "100%";
  };

  releaseBodyScroll = () => {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, this.scrollY);
  };
}
