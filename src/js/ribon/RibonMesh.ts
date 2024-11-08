/* import norenV from './glsl/base.vert?raw'
import norenF from './glsl/base.frag?raw' */
import * as THREE from 'three';
import { EffectComposer, OrbitControls } from 'three/examples/jsm/Addons.js';
import { getVh } from '../Common/utils';


export default class RibonMesh {
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  composer: EffectComposer | null = null;
  planeGeometry = new THREE.SphereGeometry(1, 1, 1, 1);
  timer: any = 0;
  material!: THREE.MeshBasicMaterial | null;
  controls!: OrbitControls | null;

  constructor(
    frontTexture: THREE.Texture,
    backTexture: THREE.Texture
  ) {
    // ... (previous constructor code remains the same)
    this.scene = new THREE.Scene();

    this.planeGeometry = new THREE.SphereGeometry(1, 40, 40);
    this.material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true
    });

    let num = 7
    let curvePoints = []
    for (let i = 0; i < num; i++) {
      const theta = 2 * Math.PI * i / num
      curvePoints.push(
        new THREE.Vector3(
        ).setFromSphericalCoords(
          1, (Math.PI / 2) + 1 * (Math.random() - 0.5), theta
        )
      )
    }

    //this.scene.add(new THREE.Mesh(this.planeGeometry, this.material));

    const curve = new THREE.CatmullRomCurve3(curvePoints)
    curve.tension = 0.7
    curve.closed = true


    let number = 1000
    let frenetFrames = curve.computeFrenetFrames(number, true)
    let spacedPoints = curve.getSpacedPoints(number)

    let tempPlane = new THREE.PlaneGeometry(1, 1, number, 1)
    let dimensions = [
      -.2, 0.2
    ]

    let point = new THREE.Vector3()

    let finalPoints: any = []
    dimensions.forEach((d, i) => {
      for (var i = 0; i <= number; i++) {
        point = spacedPoints[i]
        let binormalShift = new THREE.Vector3()
        binormalShift.add(frenetFrames.binormals[i]).multiplyScalar(d)
        finalPoints.push(
          new THREE.Vector3().copy(point).add(binormalShift)
        )
      }
    })
    finalPoints[0].copy(finalPoints[number])
    finalPoints[number + 1].copy(finalPoints[2 * number + 1])



    let frontMaterial = new THREE.MeshStandardMaterial({
      map: frontTexture,
      side: THREE.BackSide,
      roughness: 0.4,
      metalness: 0.5,
      alphaTest: 1,
      flatShading: true,
      //wireframe: true
    })
    let backmaterial = new THREE.MeshStandardMaterial({
      map: backTexture,
      side: THREE.FrontSide,
      roughness: 0.4,
      metalness: 0.5,
      alphaTest: 1,
      flatShading: true,
      //wireframe: true
    })

    this.materials = [
      frontMaterial, backmaterial
    ]
    tempPlane.addGroup(0, 6000, 1)
    tempPlane.addGroup(0, 6000, 0)

    tempPlane.setFromPoints(finalPoints)

    let finalMesh = new THREE.Mesh(
      tempPlane, this.materials
    )

    this.scene.add(finalMesh)
    window.addEventListener('originalResize', this.resize);
    this.addLight();
    requestAnimationFrame(this.render);
  }

  materials: THREE.MeshStandardMaterial[] = []
  addLight = () => {
    this.scene!.add(new THREE.AmbientLight(0xffffff, 1.86));
    let dirLight = new THREE.DirectionalLight(0xffffff, 5.5);
    dirLight.position.set(0, 0, 200);
    this.scene!.add(dirLight);
  }

  resize = () => {
    const vh = getVh(100)
    this.renderer?.setSize(window.innerWidth, vh);
    /* this.ItemPic?.resize(aspect)
    this.scene!.children[0] = this.ItemPic?.instancedMesh! */

  }

  render = (time: number) => {
    this.materials.forEach((m, i) => {
      m.map?.offset.setX(0 + time / 5000)

      if (i === 1) {
        m.map?.offset.setX(0.18 - time / 5000)
      }
    })

  }
}