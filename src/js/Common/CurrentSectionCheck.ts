export interface SectionData {
  id: string;
  rate?: number;
}

export const currentSectionCheck = (sectionData: SectionData[]) => {
  const overs = sectionData.filter((el) => {
    let dom = document.querySelector(`#${el.id}`);
    if (window.innerWidth <= 767) {
      const target = document.querySelector(`[data-target="${el.id}"]`);
      if (target) {
        dom = target;
      }
    }
    if (dom) {
      const rate = window.innerWidth <= 767 ? 0.75 : el.rate ?? 0.5;
      return dom.getBoundingClientRect().top <= window.innerHeight * rate;
    }
    return false;
  });

  const activeIndex = overs.length - 1;
  return Math.max(activeIndex, 0);
};
export const currentSkeltonCheck = (sectionData: SectionData[]) => {
  const overs = sectionData.findIndex((el) => {
    const dom = document.querySelector(`[data-target="${el.id}"]`);

    if (dom) {
      //const rate = window.innerWidth <= 767 ? 1 : el.rate ?? 0.5;
      return (
        dom.getBoundingClientRect().top <= window.innerHeight &&
        dom.getBoundingClientRect().top + dom.clientHeight > window.innerHeight
      );
    }
    return false;
  });

  return overs;
};
