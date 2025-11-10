import * as THREE from 'three'
import { snoise } from './const'

const vertexShader = [
  '',
  THREE.ShaderChunk.logdepthbuf_pars_vertex,
  THREE.ShaderChunk.fog_pars_vertex,
  '',
  'attribute vec3 previous;',
  'attribute vec3 next;',
  'attribute float side;',
  'attribute float width;',
  'attribute float counters;',
  '',
  'uniform vec2 resolution;',
  'uniform float lineWidth;',
  'uniform vec3 color;',
  'uniform float opacity;',
  'uniform float uTime;',
  'uniform float sizeAttenuation;',
  `

  uniform float dashOffset;
  `,

  '',
  'varying vec2 vUV;',
  'varying vec4 vColor;',
  'varying float vCounters;',
  'varying vec3 vPosition;',
  '',
  `${snoise}`,
  'vec2 fix( vec4 i, float aspect ) {',
  '',
  '    vec2 res = i.xy / i.w;',
  '    res.x *= aspect;',
  '	 vCounters = counters;',
  '    return res;',
  '',
  '}',
  '',
  `
  vec3 convertPositions(vec3 pos) {
  float diff = dashOffset-1.;
  pos.z +=(diff*0.2 + 0.0)  * snoise(vec3(uTime*0.1,counters+pos.y*0.1,counters+pos.x*0.1));
  return pos;
}
  `,
  'void main() {',
  '',
  '    float aspect = resolution.x / resolution.y;',
  '',
  '    vColor = vec4( color, opacity );',
  '    vUV = uv;',
  '',
  '    mat4 m = projectionMatrix * modelViewMatrix;',
  `
  
  `,
  `

  vec3 pos = position;
  vec3 nextpos = next;
  vec3 previouspos = previous;
  pos = convertPositions(pos);
  nextpos = convertPositions(nextpos);
  previouspos = convertPositions(previouspos);

  `,
  '    vec4 finalPosition = m * vec4( pos, 1.0 );',
  '    vec4 prevPos = m * vec4( previouspos, 1.0 );',
  '    vec4 nextPos = m * vec4( nextpos, 1.0 );',
  '',
  'vPosition = pos.xyz;',
  `
  
  `,
  '    vec2 currentP = fix( finalPosition, aspect );',
  '    vec2 prevP = fix( prevPos, aspect );',
  '    vec2 nextP = fix( nextPos, aspect );',
  '',
  '    float w = lineWidth * width;',
  '',
  '    vec2 dir;',
  '    if( nextP == currentP ) dir = normalize( currentP - prevP );',
  '    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
  '    else {',
  '        vec2 dir1 = normalize( currentP - prevP );',
  '        vec2 dir2 = normalize( nextP - currentP );',
  '        dir = normalize( dir1 + dir2 );',
  '',
  '        vec2 perp = vec2( -dir1.y, dir1.x );',
  '        vec2 miter = vec2( -dir.y, dir.x );',
  '        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
  '',
  '    }',
  '',
  '    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
  '    vec4 normal = vec4( -dir.y, dir.x, 0., 1. );',
  '    normal.xy *= .5 * w;',
  '    normal *= projectionMatrix;',
  '    if( sizeAttenuation == 0. ) {',
  '        normal.xy *= finalPosition.w;',
  '        normal.xy /= ( vec4( resolution, 0., 1. ) * projectionMatrix ).xy;',
  '    }',
  '',
  '    finalPosition.xy += normal.xy * side;',
  '   ',
  '',
  '    gl_Position = finalPosition;',

  THREE.ShaderChunk.logdepthbuf_vertex,
  THREE.ShaderChunk.fog_vertex && '    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
  THREE.ShaderChunk.fog_vertex,
  '}',
].join('\n')

const version = /* @__PURE__ */ (() => parseInt(THREE.REVISION.replace(/\D+/g, '')))()
const colorspace_fragment = version >= 154 ? 'colorspace_fragment' : 'encodings_fragment'

const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  #include <clipping_planes_pars_fragment>
  
  uniform sampler2D map;
  uniform sampler2D alphaMap;
  uniform float useGradient;
  uniform float useMap;
  uniform float useAlphaMap;
  uniform float useDash;
  uniform float dashArray;
  uniform float dashOffset;
  uniform float uRandomWidth;
  uniform float dashRatio;
  uniform float visibility;
  uniform float alphaTest;
  uniform vec2 repeat;
  uniform vec3 gradient[2];
  
  // 重なりrepeat用の新しいユニフォーム
  uniform float useOverlapRepeat;
  uniform vec2 overlapRepeat1;
  uniform vec2 overlapRepeat2;
  uniform vec2 overlapOffset1;
  uniform vec2 resolution;
  uniform vec2 overlapOffset2;
  uniform float overlapOpacity1;
  uniform float uDistortRate;
  uniform float uNoise;
  uniform float uLeftCut;
  uniform float uFooterX;
  uniform float uTime;
  uniform float uTotalLength;
  uniform float overlapOpacity2;
  uniform float overlapBlendMode; // 0: mix, 1: multiply, 2: add, 3: screen
  
  varying vec2 vUV;
  varying vec4 vColor;
  varying float vCounters;
  varying vec3 vPosition;

  ${snoise}




  vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;
    
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c * 0.5;
    
    vec3 rgb;
    if (h < 1.0 / 6.0) {
        rgb = vec3(c, x, 0.0);
    } else if (h < 2.0 / 6.0) {
        rgb = vec3(x, c, 0.0);
    } else if (h < 3.0 / 6.0) {
        rgb = vec3(0.0, c, x);
    } else if (h < 4.0 / 6.0) {
        rgb = vec3(0.0, x, c);
    } else if (h < 5.0 / 6.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }
    
    return rgb + vec3(m);
}

// RGB to HSL conversion function (utility function)
vec3 rgb2hsl(vec3 rgb) {
    float maxVal = max(max(rgb.r, rgb.g), rgb.b);
    float minVal = min(min(rgb.r, rgb.g), rgb.b);
    float delta = maxVal - minVal;
    
    vec3 hsl;
    hsl.z = (maxVal + minVal) * 0.5; // Lightness
    
    if (delta == 0.0) {
        hsl.x = 0.0; // Hue
        hsl.y = 0.0; // Saturation
    } else {
        // Saturation
        if (hsl.z < 0.5) {
            hsl.y = delta / (maxVal + minVal);
        } else {
            hsl.y = delta / (2.0 - maxVal - minVal);
        }
        
        // Hue
        if (rgb.r == maxVal) {
            hsl.x = ((rgb.g - rgb.b) / delta + (rgb.g < rgb.b ? 6.0 : 0.0)) / 6.0;
        } else if (rgb.g == maxVal) {
            hsl.x = ((rgb.b - rgb.r) / delta + 2.0) / 6.0;
        } else {
            hsl.x = ((rgb.r - rgb.g) / delta + 4.0) / 6.0;
        }
    }
    
    return hsl;
}

// Main color generation function based on the reference image
vec3 genColor(float random) {
    // 色相範囲: 青緑(180°) から 黄緑(90°) 
    // HSLでは 0.5 (シアン) から 0.25 (黄緑) の範囲
    float hueStart = 0.5;   // シアン (180°)
    float hueEnd = 0.25;    // 黄緑 (90°)
    
    // randomが0→1で、hueStart→hueEndに変化
    float hue = mix(hueStart, hueEnd, random);
    
    // 彩度: 高めに設定（画像の鮮やかさを再現）
    float saturation = 0.85 + random * 0.15; // 0.85 ~ 1.0
    
    // 明度: 中間値を基準に若干の変化
    float lightness = 0.5 + sin(random * 3.14159) * 0.15; // 0.35 ~ 0.65
    
    vec3 hsl = vec3(hue, saturation, lightness);
    return hsl2rgb(hsl);
}

vec3 genColorRgb(float random) {
    vec3 holePos = vec3(-0.7 ,0.,0.);
    float dist = distance(vPosition, holePos);
    vec3 holePos2 = vec3(0.7 ,0.,0.);
    float dist2 = distance(vPosition, holePos2);
    float distTarget = vPosition.x < 0. ? dist : dist2;

    float PI = 3.14159;
    float AnglefromHole = atan(  vPosition.x - holePos.x, vPosition.y - holePos.y) ;
    
    float noise = snoise(vec2(vCounters*20.,3.));
    float noiseTime = snoise(vec2(1., uTotalLength * -vCounters*0.06 + uTime*0.3  ));
    
    float noise2 = snoise(vec2(vCounters*0.1,-3.));
    float noise3 = snoise(vec2(vCounters*10.,10.));
    float posNoise = snoise(vPosition/2. - 8.);

    


    float holeShadow =noise2 *  smoothstep(1. , 0.0, dist)  * 2.7  * smoothstep(1.2, PI, abs(AnglefromHole) );



    
    float diffX = abs(vPosition.x - holePos2.x);

    float holeShadow2 = noise2 * smoothstep(1. , 0.0, dist2 )  * 4.5 * smoothstep(-PI, PI, abs(AnglefromHole) );
    
    float holeShadow3 =  smoothstep(0.8 , 0.0,  diffX)  * 0.2 * abs(max(0., -vPosition.y));



    float lightVal2 =
    (vPosition.y) * 0.2 * (noise3*0.5 +0.5)
    
    + 0.35
    
    - max(0.,holeShadow)   
    - max(0.,holeShadow2)   
    - max(0.,holeShadow3);

    float colorVal = mix(
    0.24 - vPosition.y*0.12 + vPosition.x*0.05,
    0.58 - vPosition.y * (vPosition.y<0.?-0.1: -0.2) ,
    (noiseTime*0.5 + 0.5) );


    vec3 yellow = vec3(0.17, 0.5 ,0.7);


    vec3 hsl =  vec3(
    colorVal,
    1. - colorVal*0.2, 
    clamp(lightVal2 + smoothstep(0.3, 0.7,colorVal)*0.5, 0.04, 0.99) );


    return hsl2rgb(

    mix(hsl, yellow, smoothstep(0.3, 0.2, colorVal) )
    
    
    );

}



  void main() {
    #include <logdepthbuf_fragment>
    vec4 diffuseColor = vec4(1.);

    diffuseColor.rgb = genColorRgb(
    snoise(vec3(vCounters, vPosition.x, vPosition.y))
    );
    
    if (useGradient == 1.) diffuseColor = vec4(mix(gradient[0], gradient[1], vCounters), 1.0);
    
    if (useMap == 1.) {
      if (useOverlapRepeat == 1.) {

      } else {
        // 通常のrepeat
        diffuseColor *= texture2D(map, vUV * repeat);
      }
    }
    vec2 noiseCoord = vec2(vCounters * 15.0, vUV.x * 8.0);
    float edgeNoise=0.;

    if (useAlphaMap == 1.) diffuseColor.a *= texture2D(alphaMap, vUV * repeat).a;
    if (diffuseColor.a < alphaTest) discard;

    diffuseColor.a = 1.;

  if (useDash == 1.) {
 
      diffuseColor.a *= ceil(mod(vCounters + dashOffset-edgeNoise*0.05, dashArray) - (dashArray * dashRatio));
  };

  //diffuseColor.a *= min(1., vCounters*100.);
  //diffuseColor.a *= clamp(100. - vCounters*100. , 0., 1.) ;
 //diffuseColor.rgb = vec3(vCounters * 1.,0.,0.);
//diffuseColor.a=1.;
    gl_FragColor = diffuseColor;
    
  }
`

export interface MeshLineMaterialParameters {
  lineWidth?: number
  uTime?: number
  map?: THREE.Texture
  useMap?: number
  alphaMap?: THREE.Texture
  useAlphaMap?: number
  color?: string | THREE.Color | number
  gradient?: string[] | THREE.Color[] | number[]
  opacity?: number
  resolution: THREE.Vector2 // required
  sizeAttenuation?: number
  dashArray?: number
  dashOffset?: number
  dashRatio?: number
  useDash?: number
  useGradient?: number
  visibility?: number
  alphaTest?: number
  repeat?: THREE.Vector2
}

export class MeshLineMaterial extends THREE.ShaderMaterial implements MeshLineMaterialParameters {
  lineWidth!: number
  uTime!: number
  map!: THREE.Texture
  useMap!: number
  alphaMap!: THREE.Texture
  useAlphaMap!: number
  color!: THREE.Color
  gradient!: THREE.Color[]
  resolution!: THREE.Vector2
  sizeAttenuation!: number
  dashArray!: number
  dashOffset!: number
  dashRatio!: number
  useDash!: number
  uLeftCut!: number
  uFooterX!: number
  uRandomWidth!: number
  useGradient!: number
  uDistortRate!: number
  uTotalLength!: number
  visibility!: number
  repeat!: THREE.Vector2

  constructor(parameters: MeshLineMaterialParameters) {
    super({
      uniforms: {
        ...THREE.UniformsLib.fog,
        lineWidth: { value: 1 },
        map: { value: null },
        useMap: { value: 0 },
        alphaMap: { value: null },
        useAlphaMap: { value: 0 },
        color: { value: new THREE.Color(0xffffff) },
        gradient: { value: [new THREE.Color(0xff0000), new THREE.Color(0x00ff00)] },
        opacity: { value: 1 },
        resolution: { value: new THREE.Vector2(1, 1) },
        sizeAttenuation: { value: 1 },
        dashArray: { value: 0 },
        dashOffset: { value: 0 },
        uTime: { value: 0 },
        dashRatio: { value: 0.5 },
        useDash: { value: 1 },
        useGradient: { value: 0 },
        visibility: { value: 1 },
        alphaTest: { value: 0 },
        repeat: { value: new THREE.Vector2(1, 1) },

        // 新しいユニフォーム
        useOverlapRepeat: { value: 0 },
        overlapRepeat1: { value: new THREE.Vector2(2, 2) },
        overlapRepeat2: { value: new THREE.Vector2(1.5, 1.5) },
        overlapOffset1: { value: new THREE.Vector2(0.25, 0.25) },
        overlapOffset2: { value: new THREE.Vector2(0.75, 0.75) },
        overlapOpacity1: { value: 0.5 },
        overlapOpacity2: { value: 0.3 },
        overlapBlendMode: { value: 1 }, // multiply
        uDistortRate: { value: 0 }, // multiply
        uNoise: { value: 0 }, // multiply
        uLeftCut: { value: 0 }, // multiply
        uFooterX: { value: 0 }, // multiply
        uRandomWidth: { value: 0 }, // multiply
        uTotalLength: { value: 0 }, // multiply
      },
      vertexShader,
      fragmentShader,
    })

    //this.type = 'MeshLineMaterial'
    Object.defineProperties(this, {
      lineWidth: {
        enumerable: true,
        get() {
          return this.uniforms.lineWidth.value
        },
        set(value) {
          this.uniforms.lineWidth.value = value
        },
      },
      uTime: {
        enumerable: true,
        get() {
          return this.uniforms.uTime.value
        },
        set(value) {
          this.uniforms.uTime.value = value
        },
      },
      map: {
        enumerable: true,
        get() {
          return this.uniforms.map.value
        },
        set(value) {
          this.uniforms.map.value = value
        },
      },
      useMap: {
        enumerable: true,
        get() {
          return this.uniforms.useMap.value
        },
        set(value) {
          this.uniforms.useMap.value = value
        },
      },
      alphaMap: {
        enumerable: true,
        get() {
          return this.uniforms.alphaMap.value
        },
        set(value) {
          this.uniforms.alphaMap.value = value
        },
      },
      useAlphaMap: {
        enumerable: true,
        get() {
          return this.uniforms.useAlphaMap.value
        },
        set(value) {
          this.uniforms.useAlphaMap.value = value
        },
      },
      color: {
        enumerable: true,
        get() {
          return this.uniforms.color.value
        },
        set(value) {
          this.uniforms.color.value = value
        },
      },
      gradient: {
        enumerable: true,
        get() {
          return this.uniforms.gradient.value
        },
        set(value) {
          this.uniforms.gradient.value = value
        },
      },
      opacity: {
        enumerable: true,
        get() {
          return this.uniforms.opacity.value
        },
        set(value) {
          this.uniforms.opacity.value = value
        },
      },
      resolution: {
        enumerable: true,
        get() {
          return this.uniforms.resolution.value
        },
        set(value) {
          this.uniforms.resolution.value.copy(value)
        },
      },
      sizeAttenuation: {
        enumerable: true,
        get() {
          return this.uniforms.sizeAttenuation.value
        },
        set(value) {
          this.uniforms.sizeAttenuation.value = value
        },
      },
      dashArray: {
        enumerable: true,
        get() {
          return this.uniforms.dashArray.value
        },
        set(value) {
          this.uniforms.dashArray.value = value
          this.useDash = value !== 0 ? 1 : 0
        },
      },
      dashOffset: {
        enumerable: true,
        get() {
          return this.uniforms.dashOffset.value
        },
        set(value) {
          this.uniforms.dashOffset.value = value
        },
      },
      dashRatio: {
        enumerable: true,
        get() {
          return this.uniforms.dashRatio.value
        },
        set(value) {
          this.uniforms.dashRatio.value = value
        },
      },
      useDash: {
        enumerable: true,
        get() {
          return this.uniforms.useDash.value
        },
        set(value) {
          this.uniforms.useDash.value = value
        },
      },
      useGradient: {
        enumerable: true,
        get() {
          return this.uniforms.useGradient.value
        },
        set(value) {
          this.uniforms.useGradient.value = value
        },
      },
      visibility: {
        enumerable: true,
        get() {
          return this.uniforms.visibility.value
        },
        set(value) {
          this.uniforms.visibility.value = value
        },
      },
      alphaTest: {
        enumerable: true,
        get() {
          return this.uniforms.alphaTest.value
        },
        set(value) {
          this.uniforms.alphaTest.value = value
        },
      },
      repeat: {
        enumerable: true,
        get() {
          return this.uniforms.repeat.value
        },
        set(value) {
          this.uniforms.repeat.value.copy(value)
        },
      },

      useOverlapRepeat: {
        enumerable: true,
        get() {
          return this.uniforms.useOverlapRepeat.value
        },
        set(value) {
          this.uniforms.useOverlapRepeat.value = value
        },
      },
      overlapRepeat1: {
        enumerable: true,
        get() {
          return this.uniforms.overlapRepeat1.value
        },
        set(value) {
          this.uniforms.overlapRepeat1.value.copy(value)
        },
      },
      overlapRepeat2: {
        enumerable: true,
        get() {
          return this.uniforms.overlapRepeat2.value
        },
        set(value) {
          this.uniforms.overlapRepeat2.value.copy(value)
        },
      },
      overlapOffset1: {
        enumerable: true,
        get() {
          return this.uniforms.overlapOffset1.value
        },
        set(value) {
          this.uniforms.overlapOffset1.value.copy(value)
        },
      },
      overlapOffset2: {
        enumerable: true,
        get() {
          return this.uniforms.overlapOffset2.value
        },
        set(value) {
          this.uniforms.overlapOffset2.value.copy(value)
        },
      },
      overlapOpacity1: {
        enumerable: true,
        get() {
          return this.uniforms.overlapOpacity1.value
        },
        set(value) {
          this.uniforms.overlapOpacity1.value = value
        },
      },
      overlapOpacity2: {
        enumerable: true,
        get() {
          return this.uniforms.overlapOpacity2.value
        },
        set(value) {
          this.uniforms.overlapOpacity2.value = value
        },
      },
      overlapBlendMode: {
        enumerable: true,
        get() {
          return this.uniforms.overlapBlendMode.value
        },
        set(value) {
          this.uniforms.overlapBlendMode.value = value
        },
      },
      uDistortRate: {
        enumerable: true,
        get() {
          return this.uniforms.uDistortRate.value
        },
        set(value) {
          this.uniforms.uDistortRate.value = value
        },
      },
      uNoise: {
        enumerable: true,
        get() {
          return this.uniforms.uNoise.value
        },
        set(value) {
          this.uniforms.uNoise.value = value
        },
      },
      uLeftCut: {
        enumerable: true,
        get() {
          return this.uniforms.uLeftCut.value
        },
        set(value) {
          this.uniforms.uLeftCut.value = value
        },
      },
      uFooterX: {
        enumerable: true,
        get() {
          return this.uniforms.uFooterX.value
        },
        set(value) {
          this.uniforms.uFooterX.value = value
        },
      },
      uTotalLength: {
        enumerable: true,
        get() {
          return this.uniforms.uTotalLength.value
        },
        set(value) {
          this.uniforms.uTotalLength.value = value
        },
      },
      uRandomWidth: {
        enumerable: true,
        get() {
          return this.uniforms.uRandomWidth.value
        },
        set(value) {
          this.uniforms.uRandomWidth.value = value
        },
      },
    })
    this.setValues(parameters)
  }

  copy(source: MeshLineMaterial): this {
    super.copy(source)
    this.lineWidth = source.lineWidth
    this.map = source.map
    this.useMap = source.useMap
    this.alphaMap = source.alphaMap
    this.useAlphaMap = source.useAlphaMap
    this.color.copy(source.color)
    this.gradient = source.gradient
    this.uTime = source.uTime
    this.opacity = source.opacity
    this.resolution.copy(source.resolution)
    this.sizeAttenuation = source.sizeAttenuation
    this.dashArray = source.dashArray
    this.dashOffset = source.dashOffset
    this.uRandomWidth = source.uRandomWidth
    this.dashRatio = source.dashRatio
    this.useDash = source.useDash
    this.useGradient = source.useGradient
    this.visibility = source.visibility
    this.alphaTest = source.alphaTest
    this.repeat.copy(source.repeat)
    return this
  }
}
