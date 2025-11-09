import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { getVh, lerp } from '../Common/utils';
import * as CANNON from 'cannon-es';

export class BoxBlock {
  viewport
    : {
      x: number
      y: number
    } = {
      x: 0,
      y: 0
    }


  controls!: OrbitControls;
  scene: THREE.Scene

  boxMeshes: THREE.Mesh[] = [];
  meshes!: THREE.Mesh[];
  bodies!: CANNON.Body[];

  camera: THREE.OrthographicCamera;
  world: CANNON.World;
  constructor(
    {
      camera, world, scene
    }: {
      camera: THREE.OrthographicCamera,
      world: CANNON.World,
      scene: THREE.Scene
    }
  ) {

    this.camera = camera
    this.world = world
    this.scene = scene

    this.initPhysics();
    this.addObject();
  }


  initPhysics() {
    this.meshes = [];
    this.bodies = [];
  }


  addObject = () => {
    this.createBoxes();
  }
  ballBody!: CANNON.Body;

  initialBoxes: { [key: string]: { x: number; y: number; z: number; prevX: number } } = {}

  getWindowRate() {
    return (window.innerHeight / (this.camera.top * 2))
  }
  createBoxes() {
    const boxSize = 0.2;

    const boxCord = new THREE.Vector3(
      boxSize * 10, boxSize, boxSize
    );
    const boxGeometry = new THREE.BoxGeometry(
      boxCord.x, boxCord.y, boxCord.z
    );

    for (let x = -3; x <= 3; x += 2) {
      for (let z = -10; z <= 10; z += 2) {
        const hue = Math.random();
        const color = new THREE.Color().setHSL(hue, 0, 0);

        const boxMaterial = new THREE.MeshBasicMaterial({ color });
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        const posY = 2
        boxMesh.position.set(x, posY, z);

        //boxMesh.castShadow = true;
        this.scene!.add(boxMesh);


        const story = document.querySelector('.kura-story')
        const body = document.body
        const storyTop = story!.getBoundingClientRect().top - body.getBoundingClientRect().top


        const boxShape = new CANNON.Box(new CANNON.Vec3(
          boxCord.x / 2,
          boxCord.y / 2,
          boxCord.z / 2
        ));
        const boxBody = new CANNON.Body({
          mass: 100,
          shape: boxShape,
          position: new CANNON.Vec3(
            x * 1.2, 
            posY, 
            z * 0.4 + (storyTop - window.innerHeight / 2) / this.getWindowRate())
        });
        this.initialBoxes[boxMesh.uuid] = {
          x: boxBody.position.x,
          y: boxBody.position.y,
          z: boxBody.position.z,
          prevX: -1
        }
        boxBody.linearDamping = 0.85;
        boxBody.angularDamping = 0.85;

        const euler = new CANNON.Vec3();
        boxBody.quaternion.toEuler(euler);
        euler.x = 0;
        euler.y = 0;
        //euler.y = -Math.PI * x / 20;
        euler.z = 0;
        boxBody.quaternion.setFromEuler(euler.x, euler.y, euler.z);


        this.world.addBody(boxBody);

        this.meshes.push(boxMesh);
        this.boxMeshes.push(boxMesh);
        this.bodies.push(boxBody);
      }
    }
  }
  mouseBallMesh!: THREE.Mesh;

  mouseBallBody!: CANNON.Body;


  // touchIds
  touchIds: number[] = [];
  time = 0
  prevX = []
  updatePhysics(deltaTime: number) {

    this.time += deltaTime;


    const boxIds = this.boxMeshes.map(box => box.id);

    for (let i = 0; i < this.bodies.length; i++) {


      const body = this.bodies[i]
      const euler = new CANNON.Vec3();
      body.quaternion.toEuler(euler);
      euler.x = 0;
      euler.z = 0;
      //euler.y = Math.sin((this.time - this.bodies[i].position.x) * 0.2) * 0.32;
      body.quaternion.setFromEuler(euler.x, euler.y, euler.z);
      this.bodies[i].position.y = 0.4

      if (boxIds.includes(this.meshes[i].id) && !this.touchIds.includes(this.meshes[i].id)) {

        // 物理worldによる影響があったかどうかを判定
        if (this.initialBoxes[this.meshes[i].uuid].prevX !== -1 && this.initialBoxes[this.meshes[i].uuid].prevX !== this.bodies[i].position.x) {
          this.touchIds.push(this.meshes[i].id);
        }

        this.initialBoxes[this.meshes[i].uuid].prevX = this.bodies[i].position.x

      }

      this.meshes[i].position.copy(this.bodies[i].position);
      this.meshes[i].quaternion.copy(this.bodies[i].quaternion);

    }
  }


  getViewport() {
    const x = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z;
    const y = 2 * Math.tan(75 / 2 * Math.PI / 180) * this.camera.position.z;
    return {
      x, y
    }
  }
  canvasSize = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  getCanvasSize = () => {
    const height = getVh(100)
    const width = window.innerWidth
    return {
      height
      , width
    }
  }
  clock = new THREE.Clock();


  animate = (time: number): void => {

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    // 物理シミュレーションを更新
    console.log('1:', 1);
    this.updatePhysics(deltaTime);

  }


}

