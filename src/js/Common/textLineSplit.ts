export const textWordSplit = (elm: HTMLElement) => {
  const txt = elm?.innerHTML.trim();
  let addElm = "";
  txt?.split("").forEach((t) => {
    addElm += `<span class="wrap">${t === " " ? "&nbsp;" : t}</span>`;
  });
  elm.innerHTML = addElm;
};

export const textLineSplit = (targetElm: HTMLElement) => {
  const about = targetElm;

  if (about?.innerHTML.indexOf("span") !== -1) {
    about.innerHTML = Array.from(about.querySelectorAll(".line-inner")).map(
      (cur) => {
        return cur.innerHTML;
      }
    ).join("<br/>");
  }

  // replace all
  let _txt = about?.innerHTML.replace(/&amp;/g, "&")
  let addContent = "";
  _txt.split("<br>").forEach((txt) => {
    console.log('txt:', txt);
    if (txt.indexOf("span") !== -1) {
      txt = Array.from(about.querySelectorAll(".line-inner")).reduce(
        (acc, cur) => {
          acc += cur.innerHTML;
          return acc;
        },
        ""
      );
      about.innerHTML = txt;
    }
    let addElm = "";
    txt?.split("").forEach((t) => {
      addElm += `<span class="wrap">${t}</span>`;
    });
    about.innerHTML = addElm;
    const heights = Array.from(targetElm.querySelectorAll(".wrap")).reduce<
      number[]
    >((acc, el) => {
      const top = el.getBoundingClientRect().top;
      if (!acc.includes(top)) {
        acc.push(top);
      }
      return acc;
    }, []);
    const doms = heights.map((h) => {
      return Array.from(targetElm.querySelectorAll(".wrap")).filter(
        (el) => el.getBoundingClientRect().top === h
      );
    });

    let content = "";
    doms.forEach((dom) => {
      let line = "";
      dom.forEach((d) => {
        line += d.innerHTML;
      });
      //改行コードを<br>に変換

      content += `<div class="line"><span class="line-inner">${line}</span></div>`;
    });

    addContent += content;

  })

  about.innerHTML = addContent;
};