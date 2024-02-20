import ScrollController from "./ScrollController";
import YouTubeEmbed from "./YouTubeEmbed";

export default class MovieModal {
  ytEmbed: any;
  innerEl: HTMLElement;
  btnElm: HTMLElement;
  openFlg: any;
  el: any;
  scrollY: number;
  scrollController: ScrollController
  constructor(scrollController: ScrollController) {
    // class
    this.scrollController = scrollController;
    this.ytEmbed = new YouTubeEmbed("movie");
    this.scrollY = 0;
    // elements
    this.el = document.getElementById("movieModal");
    this.innerEl = this.el.querySelector(".movie-modal__inner");
    this.btnElm = document.querySelector(".btn-click") as HTMLElement;

    // flags
    this.openFlg = false;
  }

  init = () => {
    this.ytEmbed.init();
    this.addEvent();
  };

  addEvent = () => {
    this.innerEl.addEventListener("click", this.closeModal);
    if (this.btnElm) {
      this.btnElm.addEventListener("click", () => this.openModal("Iwh4Q7cN4Ik"));
    }
  };

  openModal = (youTubeId: string) => {
    if (this.openFlg) return;
    console.log('111:', 111);
    this.openFlg = true;
    this.ytEmbed.create(youTubeId);
    this.el.style.display = "block";
  };

  closeModal = () => {
    if (!this.openFlg) return;

    console.log('222:', 222);
    this.openFlg = false;
    this.ytEmbed.pause();
    this.el.style.display = "none";
  };
  lockBodyScroll = () => {
    this.scrollController.lockBodyScroll();
  };

  releaseBodyScroll = () => {
    this.scrollController.releaseBodyScroll();
  };
}
