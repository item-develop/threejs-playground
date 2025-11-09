declare module 'three.meshline' {
  import * as THREE from 'three'
  import { BufferGeometry } from 'three/src/Three.Core'

  export interface MeshLineMaterialParameters {
    color?: THREE.Color | string | number
    lineWidth?: number
    resolution?: THREE.Vector2
    near?: number
    far?: number
    depthWrite?: boolean
    depthTest?: boolean
    transparent?: boolean
    opacity?: number
    alphaTest?: number
    side?: THREE.Side
    fog?: boolean
    map?: THREE.Texture
    useMap?: boolean
    alphaMap?: THREE.Texture
    useAlphaMap?: number
    repeat?: THREE.Vector2
    dashArray?: number
    dashOffset?: number
    dashRatio?: number
    useDash?: number
    visibility?: number
    sizeAttenuation?: number
    blending: THREE.Blending
  }

  export class MeshLineMaterial extends THREE.ShaderMaterial {
    constructor(parameters?: MeshLineMaterialParameters)
    color: THREE.Color
    lineWidth: number
    dashArray: number
    dashOffset: number
    resolution: THREE.Vector2
  }

  export class MeshLine extends BufferGeometry {
    constructor()
    setPoints(points: THREE.Vector3[] | Float32Array, widthCallback?: (p: number) => number): void
    setMatrixWorld(matrixWorld: THREE.Matrix4): void
    setGeometry(geometry: BufferGeometry, widthCallback?: (p: number) => number): void
    geometry: BufferGeometry
  }

  export function MeshLineRaycast(
    this: THREE.Mesh,
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[],
  ): void
}

declare module '@mux/mux-player-react'
