import { currentSectionCheck } from "./Common/CurrentSectionCheck";


export default class Invest {
  activeSectionIndex: number;
  sectionData: {
    id: string;
  }[];
  constructor(sectionData: { id: string }[]) {
    this.activeSectionIndex = 0;
    this.sectionData = sectionData;
    this.init();
  }

  init() {
    window.addEventListener("scroll", this.onScroll);
    this.onScroll();
  }
  onScroll = () => {
    const active = currentSectionCheck(this.sectionData);
    this.changeSection(active);
  };
  changeSection = (active: number) => {
    this.activeSectionIndex = active;
    this.updateDisplayInfo();
  };

  addRemoveClass = (el: HTMLElement | Element) => {
    el.classList.remove(
      "active-1",
      "active-2",
      "active-3",
      "active-4",
      "active-5"
    );
    el.classList.add(`active-${this.activeSectionIndex + 1}`);
  };

  updateDisplayInfo = () => {
    const activeSection = document.querySelector(
      `.fix-content__item[data-index="${this.activeSectionIndex}"]`
    );
    if (activeSection?.classList.contains("active")) return;
    const sections = document.querySelectorAll(`.fix-content__item`);
    sections.forEach((section) => {
      section.classList.remove("active");
      this.addRemoveClass(section);
    });
    activeSection?.classList.add("active");

    const secs = document.querySelectorAll(".page-sec");
    secs.forEach((el) => {
      el && this.addRemoveClass(el);
    });

    const comPageContent = document.querySelector(".invest-page-content");
    comPageContent && this.addRemoveClass(comPageContent);

    const comPageBg = document.querySelector(".invest-page-bg");
    comPageBg && this.addRemoveClass(comPageBg);
  };
}
