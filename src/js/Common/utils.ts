import * as THREE from 'three';
export const clamp = (value: number, min = 0, max = 1) => {

  return Math.min(Math.max(value, min), max);
};
export const getContentHeight = () => {
  return document.querySelector(".about-section")!.clientHeight;
};

export const isSP = () => {
  return window.innerWidth < 768;
};
export const getHeaderheight = () => {
  return isSP() ? 50 : 70;
};
// SP margin 7.7
// navW= 100 - 7.7-7.7 = 84.6
export const getTopMarginRate = () => {
  return !isSP() ? 0.95 : 0.923;
};
export const getNavLeftMarginRate = () => {
  return !isSP() ? 0.05 : 0.06;
};
export const rateConvert = (rate: number, start: number, end: number, noClamp = false) => {
  return !noClamp ? clamp((rate - start) / (end - start)) : (rate - start) / (end - start);
};
export const rateClip = (_rate: number, start: number, end: number) => {
  const rate = clamp(_rate, 0, 1);
  // 0の時 start
  // 1の時 end
  return start + (end - start) * rate;
};
export const getClientTop = (elm: HTMLElement | SVGElement) => {
  return elm.getBoundingClientRect().top;
};
export const clientBottom = (elm: HTMLElement | SVGElement) => {
  return elm.getBoundingClientRect().bottom;
};
export const getClientLeft = (elm: HTMLElement | SVGElement) => {
  return elm.getBoundingClientRect().left;
};
export const getVh = (num: number) => {
  //const stVh = document.documentElement.style.getPropertyValue("--vh").replace("px", "");
  const vh = document.querySelector('.h-100svh-skel')!.clientHeight
  return (vh / 100) * num;
};

export const lerp = (start: number, end: number, amt: number) => {
  return (1 - amt) * start + amt * end;
};

export const easingF = {
  /** default */
  default: function (t: number, b = 0, c = 1, d = 1) {
    return (c * t) / d + b;
  },
  /** linear */
  linear: function (t: number, b = 0, c = 1, d = 1) {
    return (c * t) / d + b;
  },
  /** swing */
  swing: function (t: number, b = 0, c = 1, d = 1) {
    return -c * (t /= d) * (t - 2) + b;
  },
  /** easeInQuad */
  easeInQuad: function (t: number, b = 0, c = 1, d = 1) {
    return c * (t /= d) * t + b;
  },
  /** easeOutQuad */
  easeOutQuad: function (t: number, b = 0, c = 1, d = 1) {
    return -c * (t /= d) * (t - 2) + b;
  },
  /** easeInOutQuad */
  easeInOutQuad: function (t: number, b = 0, c = 1, d = 1) {
    if ((t /= d / 2) < 1) return (c / 2) * t * t + b;
    return (-c / 2) * (--t * (t - 2) - 1) + b;
  },
  /** defeInCubic */
  easeInCubic: function (t: number, b = 0, c = 1, d = 1) {
    return c * (t /= d) * t * t + b;
  },
  /** easeOutCubic */
  easeOutCubic: function (t: number, b = 0, c = 1, d = 1) {
    return c * ((t = t / d - 1) * t * t + 1) + b;
  },
  /** easeInOutCubic */
  easeInOutCubic: function (t: number, b = 0, c = 1, d = 1) {
    if ((t /= d / 2) < 1) return (c / 2) * t * t * t + b;
    return (c / 2) * ((t -= 2) * t * t + 2) + b;
  },
  /** easeOutInCubic */
  easeOutInCubic: function (t: number, b = 0, c = 1, d = 1) {
    if (t < d / 2) return easingF.easeOutCubic(t * 2, b, c / 2, d);
    return easingF.easeInCubic(t * 2 - d, b + c / 2, c / 2, d);
  },
  /** easeInQuart */
  easeInQuart: function (t: number, b = 0, c = 1, d = 1) {
    return c * (t /= d) * t * t * t + b;
  },
  /** easeOutQuart */
  easeOutQuart: function (t: number, b = 0, c = 1, d = 1) {
    return -c * ((t = t / d - 1) * t * t * t - 1) + b;
  },
  /** easeInOutQuart */
  easeInOutQuart: function (t: number, b = 0, c = 1, d = 1) {
    if ((t /= d / 2) < 1) return (c / 2) * t * t * t * t + b;
    return (-c / 2) * ((t -= 2) * t * t * t - 2) + b;
  },
  /** easeOutInQuart */
  easeOutInQuart: function (t: number, b = 0, c = 1, d = 1) {
    if (t < d / 2) return easingF.easeOutQuart(t * 2, b, c / 2, d);
    return easingF.easeInQuart(t * 2 - d, b + c / 2, c / 2, d);
  },
  /** easeInQuint */
  easeInQuint: function (t: number, b = 0, c = 1, d = 1) {
    return c * (t /= d) * t * t * t * t + b;
  },
  /** easeOutQuint */
  easeOutQuint: function (t: number, b = 0, c = 1, d = 1) {
    return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
  },
  /** easeInOutQuint */
  easeInOutQuint: function (t: number, b = 0, c = 1, d = 1) {
    if ((t /= d / 2) < 1) return (c / 2) * t * t * t * t * t + b;
    return (c / 2) * ((t -= 2) * t * t * t * t + 2) + b;
  },
  /** easeOutInQuint */
  easeOutInQuint: function (t: number, b = 0, c = 1, d = 1) {
    if (t < d / 2) return easingF.easeOutQuint(t * 2, b, c / 2, d);
    return easingF.easeInQuint(t * 2 - d, b + c / 2, c / 2, d);
  },
  /** easeInSine */
  easeInSine: function (t: number, b = 0, c = 1, d = 1) {
    return -c * Math.cos((t / d) * (Math.PI / 2)) + c + b;
  },
  /** easeOutSine */
  easeOutSine: function (t: number, b = 0, c = 1, d = 1) {
    return c * Math.sin((t / d) * (Math.PI / 2)) + b;
  },
  /** easeInOutSine */
  easeInOutSine: function (t: number, b = 0, c = 1, d = 1) {
    return (-c / 2) * (Math.cos((Math.PI * t) / d) - 1) + b;
  },
  /** easeOutInSine */
  easeOutInSine: function (t: number, b = 0, c = 1, d = 1) {
    if (t < d / 2) return easingF.easeOutSine(t * 2, b, c / 2, d);
    return easingF.easeInSine(t * 2 - d, b + c / 2, c / 2, d);
  },
  /** easeInExpo */
  easeInExpo: function (t: number, b = 0, c = 1, d = 1) {
    return t == 0 ? b : c * Math.pow(2, 10 * (t / d - 1)) + b - c * 0.001;
  },
  /** easeOutExpo */
  easeOutExpo: function (t: number, b = 0, c = 1, d = 1) {
    return t == d ? b + c : c * 1.001 * (-Math.pow(2, (-10 * t) / d) + 1) + b;
  },
  /** easeInOutExpo */
  easeInOutExpo: function (t: number, b = 0, c = 1, d = 1) {
    if (t == 0) return b;
    if (t == d) return b + c;
    if ((t /= d / 2) < 1)
      return (c / 2) * Math.pow(2, 10 * (t - 1)) + b - c * 0.0005;
    return (c / 2) * 1.0005 * (-Math.pow(2, -10 * --t) + 2) + b;
  },
  /** easeOutInExpo */
  easeOutInExpo: function (t: number, b = 0, c = 1, d = 1) {
    if (t < d / 2) return easingF.easeOutExpo(t * 2, b, c / 2, d);
    return easingF.easeInExpo(t * 2 - d, b + c / 2, c / 2, d);
  },
  /** easeInCirc */
  easeInCirc: function (t: number, b = 0, c = 1, d = 1) {
    return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
  },
  /** easeOutCirc */
  easeOutCirc: function (t: number, b = 0, c = 1, d = 1) {
    return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
  },
  /** easeInOutCirc */
  easeInOutCirc: function (t: number, b = 0, c = 1, d = 1) {
    if ((t /= d / 2) < 1) return (-c / 2) * (Math.sqrt(1 - t * t) - 1) + b;
    return (c / 2) * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
  },
  /** easeOutInCirc */
  easeOutInCirc: function (t: number, b = 0, c = 1, d = 1) {
    if (t < d / 2) return easingF.easeOutCirc(t * 2, b, c / 2, d);
    return easingF.easeInCirc(t * 2 - d, b + c / 2, c / 2, d);
  },

  /** easeInBounce */
  easeInBounce: function (t: number, b = 0, c = 1, d = 1) {
    return c - easingF.easeOutBounce(d - t, 0, c, d) + b;
  },
  /** easeOutBounce */
  easeOutBounce: function (t: number, b = 0, c = 1, d = 1) {
    if ((t /= d) < 1 / 2.75) {
      return c * (7.5625 * t * t) + b;
    } else if (t < 2 / 2.75) {
      return c * (7.5625 * (t -= 1.5 / 2.75) * t + 0.75) + b;
    } else if (t < 2.5 / 2.75) {
      return c * (7.5625 * (t -= 2.25 / 2.75) * t + 0.9375) + b;
    } else {
      return c * (7.5625 * (t -= 2.625 / 2.75) * t + 0.984375) + b;
    }
  },
  /** easeInOutBounce */
  easeInOutBounce: function (t: number, b = 0, c = 1, d = 1) {
    if (t < d / 2) return easingF.easeInBounce(t * 2, 0, c, d) * 0.5 + b;
    else return easingF.easeOutBounce(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
  },
  /** easeOutInBounce */
  easeOutInBounce: function (t: number, b = 0, c = 1, d = 1) {
    if (t < d / 2) return easingF.easeOutBounce(t * 2, b, c / 2, d);
    return easingF.easeInBounce(t * 2 - d, b + c / 2, c / 2, d);
  },
};

export const isNotAnim = () => {
  // query notAnim=== "true"
  const location = window.location.href;
  const url = new URL(location);
  const notAnimParam = url.searchParams.get("notAnim");

  const hash = window.location.hash;
  const current = hash.replace("#", "");

  return notAnimParam === "true" || secIds.includes(current);
};

export const secIds = [
  "pickup",
  "about",
  "look",
  "collection",
  "store",
  "archive",
  "info",
];

export function isOutsideElement(
  element: HTMLElement,
  mouseX: number,
  mouseY: number
) {
  const rect = element.getBoundingClientRect();
  return (
    mouseX < rect.left ||
    mouseY < rect.top ||
    mouseX > rect.right ||
    mouseY > rect.bottom
  );
}

export const numToArray = (num: number) => new Array(num).fill(0).map((_, i) => i);


// ローレンツ方程式を解く関数
export const solveLorenz = (a: number = 10, b: number = 28, c: number = 8 / 3, i = 0): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];

  // 初期条件
  //let x = 0.1 + i * 0.01 * Math.random();
  const getRandom = () => {
    return (Math.random() - 0.5) * 10
  }
  /* let x = getRandom() - 0
  let y = getRandom() - 30;
  let z = 20; */
  /* let x = getRandom() + 30;
  let y = getRandom() + 15;
  let z = getRandom() + 30; */
  let x = getRandom() - 3;
  let y = getRandom() + 5;
  let z = getRandom() + 30;


  // 時間刻み幅と計算ステップ数
  const dt = 0.02;
  const steps = 1000;

  // ルンゲ・クッタ法（4次）で数値積分
  for (let i = 0; i < steps; i++) {

    // k1
    const k1x = a * (y - x);
    const k1y = x * (b - z) - y;
    const k1z = x * y - c * z;

    // k2
    const x2 = x + k1x * dt / 2;
    const y2 = y + k1y * dt / 2;
    const z2 = z + k1z * dt / 2;
    const k2x = a * (y2 - x2);
    const k2y = x2 * (b - z2) - y2;
    const k2z = x2 * y2 - c * z2;

    // k3
    const x3 = x + k2x * dt / 2;
    const y3 = y + k2y * dt / 2;
    const z3 = z + k2z * dt / 2;
    const k3x = a * (y3 - x3);
    const k3y = x3 * (b - z3) - y3;
    const k3z = x3 * y3 - c * z3;

    // k4
    const x4 = x + k3x * dt;
    const y4 = y + k3y * dt;
    const z4 = z + k3z * dt;
    const k4x = a * (y4 - x4);
    const k4y = x4 * (b - z4) - y4;
    const k4z = x4 * y4 - c * z4;

    // 更新
    x += (k1x + 2 * k2x + 2 * k3x + k4x) * dt / 6;
    y += (k1y + 2 * k2y + 2 * k3y + k4y) * dt / 6;
    z += (k1z + 2 * k2z + 2 * k3z + k4z) * dt / 6;

    // スケーリングして3D空間に配置（見やすいサイズに調整）

    const scale = 0.067;
    const pos = new THREE.Vector3(y * scale - 0.5, x * - scale + -0.1, -z * scale + 1.9)
    // 
    // X軸のベクトル
    const axis = new THREE.Vector3(1, 0, 0);
    const angle = Math.PI / 2; // 45度
    pos.applyAxisAngle(axis, angle);
    const axis2 = new THREE.Vector3(0, 1, 0);
    const angle2 = Math.PI / 1.16; // 45度
    pos.applyAxisAngle(axis2, angle2);
    //pos.x += pos.x > 0 ? pos.x * 0.5 : 0;
    //pos.z += pos.x > 0 ? pos.x * 0.2 : 0;
    points.push(pos);
  }

  //console.log('points[0].length:', points[0].length());
  return points;
}