export default class IntersectionObserverClass {
  targetClass: any;
  options: any;
  targets: NodeListOf<Element>;
  constructor(targetClass: any, options: any, cb?: any) {
    this.targetClass = targetClass;
    this.options = options;
    this.targets = document.querySelectorAll(`.${this.targetClass}`);
    this.initObserver(cb);
  }

  initObserver(cb: any) {
    const callback = (entries: any) => {
      entries.forEach((entry: any) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("inview");
          if (cb) {
            cb();
          }
        } else {
        }
      });
    };

    const observer = new IntersectionObserver(callback, this.options);

    this.targets.forEach((target) => {
      observer.observe(target);
    });
  }
}
