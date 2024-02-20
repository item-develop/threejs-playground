import { gsap } from "gsap";

export const fvAnim = () => {
  gsap.to(".fv__copy", {
    duration: 1.6,
    delay: 0,
    opacity: 1,
  });
  gsap.to(".fv__take", {
    duration: 1,
    delay: 3.1,
    opacity: 1,
  });
  gsap.to(".tt-bnr", {
    duration: 1,
    delay: 3.6,
    opacity: 1,
  });
  gsap.to(".fv__new", {
    duration: 1,
    delay: 0.5,
    opacity: 1,
  });
  fogAnimation(".fv__new .fog", 0.2);

  gsap.to(".fv__teri-name", {
    duration: 1,
    delay: 1.3,
    opacity: 1,
  });
  fogAnimation(".fv__teri-name .fog", 1);
  gsap.to(".fv__teri-price", {
    duration: 1,
    delay: 1.5,
    opacity: 1,
  });

  stampRevAnimation(".fv__teri-stamp", 0.8);
  stampRevAnimation(".fv__taru-stamp", 1.8);

  gsap.to(".fv__taru-name", {
    duration: 1,
    delay: 2.3,
    opacity: 1,
  });
  fogAnimation(".fv__taru-name .fog", 2);

  gsap.to(".fv__taru-price", {
    duration: 1,
    delay: 2.5,
    opacity: 1,
  });
};

export const fogAnimation = (query: string, delay: number) => {
  let myElement = document.querySelector(`${query}`); // アニメーションを適用したい要素を選択

  // 新しいタイムラインを作成します
  let tl = gsap.timeline({
    defaults: { duration: 0.75, ease: "power1.inOut" },
    delay: delay, // 0.2秒の遅延を追加
  });

  tl.fromTo(
    myElement,
    {
      autoAlpha: 0,
      scale: 1,
    },
    {
      autoAlpha: 1,
      scale: 1.2,
    }
  ).to(myElement, {
    autoAlpha: 0,
    scale: 1,
  });
};

/* 

  from {
    opacity: 0;
    transform: rotate(10deg) translate(-30px, -30px) scale(1.1);
  }
  40% {
    opacity: 1;
    transform: rotate(0deg) translate(-30px, -30px) scale(1.2);
  }
  to {
    transform: none;
    opacity: 1;
  }
  */
export const stampRevAnimation = (query: string, delay: number) => {
  let myElement = document.querySelector(`${query}`); // アニメーションを適用したい要素を選択

  // 新しいタイムラインを作成します
  let tl = gsap.timeline({
    defaults: { duration: 0.4, ease: "power4.inOut" },
    delay: delay, // 0.2秒の遅延を追加
  });

  tl.fromTo(
    myElement,
    {
      autoAlpha: 0,
      scale: 1.1,
      rotate: 10,
      x: -30,
      y: -30,
    },
    {
      autoAlpha: 1,
      scale: 1.2,
      rotate: 0,
      x: -30,
      y: -30,
    }
  ).to(myElement, {
    autoAlpha: 1,
    scale: 1,
    rotate: 0,
    x: 0,
    y: 0,
  });
};
