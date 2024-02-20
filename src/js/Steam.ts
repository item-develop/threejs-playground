import gsap from "gsap";

// Assuming gsap and lib are available globally
function getRandom(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class Steam {
  private readonly path: string = "/assets/menu/kaki/images/";
  private bt: number;
  private num: number;
  private speed: number;
  private size: number;
  private timer: any;
  private bs: { w: number; h: number } = { w: 0, h: 0 };
  private smork: Array<{
    t: HTMLElement;
    y: number;
    s: number;
    a: number;
    l: number;
    wait: number;
  }> = [];
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.bt = Number(this.container.dataset.n1);
    this.num = Number(this.container.dataset.n2) + 2;
    this.speed = Number(this.container.dataset.speed) || 1;
    this.size = Number(this.container.dataset.size) || 1;

    const observer = new IntersectionObserver((a) => this.observeCallback(a), {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0,
    });
    observer.observe(this.container);
    this.init();
  }

  private observeCallback(entries: IntersectionObserverEntry[]): void {
    if (entries[0].isIntersecting) {
      this.play();
    } else {
      this.stop();
    }
  }

  private init(): void {
    window.addEventListener("resize", () => this.resize());
    this.resize();

    for (let i = 0; i < this.num; i++) {
      this.add();
    }

    this.play();
    /*     //入ってきたら再生
    lib.visEvent.add(
      this.container,
      (isVisible: boolean) => {
        if (isVisible) {
        } else {
          this.stop();
        }
      },
      1,
      0
    ); */
  }

  private resize(): void {
    this.bs = {
      w: this.container.offsetWidth,
      h: this.container.offsetHeight,
    };
  }

  private add(): void {
    const n = Math.random() > 0.5 ? "1" : "2";
    const img = document.createElement("img");
    img.src = `${this.path}steam_0${n}.webp`;
    img.alt = "";
    this.container.appendChild(img);

    const isSP = window.innerWidth < 768;
    const w =
      getRandom(15, 40) * 0.02 * this.bs.w * (isSP ? 1.3 : 1.3) * this.size;
    const smorkObject = {
      t: img,
      y: getRandom(0, this.bs.h * this.bt) - w * 0.2,
      s: 1,
      a: 0,
      wait: 0,
      l: getRandom(40, 150),
    };
    this.smork.push(smorkObject);
    gsap.set(img, {
      scale: smorkObject.s,
      width: w,
      y: smorkObject.y,
      x: getRandom(0, this.bs.w - w),
      opacity: 0,
    });
  }

  private loop(): void {
    this.bs = {
      w: this.container.offsetWidth,
      h: this.container.offsetHeight,
    };
    for (let i = this.smork.length - 1; i >= 0; i--) {
      if (this.smork[i].wait < 1) {
        this.smork[i].wait += 2 / 33;
      } else {
        const RATE = 3.4;
        const smork = this.smork[i];
        smork.s += (this.speed < 0.4 ? 0.005 : 0.005) * RATE;
        smork.y -= 0.2 * RATE * this.speed;
        smork.l -= 1 * RATE;
        if (smork.a < 0.6 && smork.l > 0) {
          smork.a += 0.01 * RATE;
        } else if (smork.l <= 0) {
          smork.a -= 0.01 * RATE;
        }
        gsap.set(smork.t, { scale: smork.s, y: smork.y, opacity: smork.a });
        if (smork.a <= 0) {
          smork.t.remove();
          this.smork.splice(i, 1);
          this.add();
        }
      }
    }
  }

  public play(): void {
    this.stop();
    this.timer = setInterval(() => {
      this.loop();
    }, 33);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

// Usage
// const steam = new Steam(document.getElementById('your-container-element-id'));
