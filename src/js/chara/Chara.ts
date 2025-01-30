import * as THREE from 'three';
export class Chara {
  mesh !: THREE.Mesh
  getViewport !: () => {
    x: number,
    y: number
  }
  getWindow !: () => {
    width: number,
    height: number
  }

  size: {
    width: number
    left?: number
    right?: number
    top: number
  }
  geometry !: THREE.PlaneGeometry
  material !: THREE.ShaderMaterial
  texture: THREE.Texture

  constructor(
    texture: THREE.Texture,
    size: {
      width: number,
      left?: number,
      right?: number,
      top: number

    },
    getViewport: () => {
      x: number,
      y: number
    },
    getWindow: () => {
      width: number,
      height: number
    }
  ) {

    this.size = size
    this.getViewport = getViewport
    this.getWindow = getWindow
    this.texture = texture
    this.initObject()
  }



  getW = () => {
    const w = (this.size.width / this.getWindow().width) * this.getViewport().x
    return w
  }




  initObject = () => {


    const txtAspect = this.texture.image.width / this.texture.image.height
    const w = this.getW()

    this.geometry = new THREE.PlaneGeometry(
      w,
      (w) / txtAspect
    )
    this.material = new THREE.ShaderMaterial({
      vertexShader: `
      // Vertex Shader

uniform float time;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
      `,
      fragmentShader: `
      
      // Fragment Shader

uniform sampler2D uTexture;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uTexture, vUv);
  //gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}

      `,
      uniforms: {
        uTexture: {
          value: this.texture
        }
      }
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
  }

  setPosition = () => {
    const w = this.getW()

    if (this.size.left !== undefined) {
      const baseLeft = w / 2 - this.getViewport().x / 2
      this.mesh.position.x = baseLeft + (this.size.left / this.getWindow().width) * this.getViewport().x
    }

    if (this.size.right !== undefined) {
      const baseRight = -(w / 2 - this.getViewport().x / 2)
      this.mesh.position.x = baseRight - (this.size.right / this.getWindow().width) * this.getViewport().x
    }

    const baseTop = this.getViewport().y / 2 - w / 2
    this.mesh.position.y = baseTop - (this.size.top / this.getWindow().height) * this.getViewport().y

  }
}