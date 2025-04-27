// import * as THREE from "three";
import Common from "./Common";
import Output from "./Output";
import Mouse from "./Mouse";

interface IWebglProps {
  $wrapper: HTMLElement;
}

export default class Webgl {
  props: IWebglProps;
  output!: Output;

  constructor(props: IWebglProps) {
    this.props = props;
    Common.init();
    Mouse.init();

    this.init();
    requestAnimationFrame(this.loop.bind(this));

    window.addEventListener("resize", this.resize.bind(this));
  }

  init() {
    this.props.$wrapper.prepend(Common.renderer.domElement);
    this.output = new Output();
  }

  resize() {
    Common.resize();
    this.output.resize();
  }

  render(t: number) {
    Mouse.update();
    Common.update();
    this.output.update(t);
  }

  loop(t: number) {
    this.render(t);
    requestAnimationFrame(this.loop.bind(this));
  }
}