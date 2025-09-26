
export const colorBoxFrag = `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        uniform float uTime;
        uniform vec3 uBoxSize;
        uniform float uFlat;
        uniform float uBox;
        uniform bool uIsFront;

        uniform sampler2D tGrad1;
        uniform sampler2D tGrad2;
        uniform sampler2D tGrad3;
        uniform sampler2D tGrad4;
        uniform sampler2D tGrad5;
        uniform sampler2D tGrad6;
        

        vec3 lerp(vec3 start, vec3 end, float t) {
  return start + t * (end - start);
}
float lerp(float start, float end, float t) {
  return start + t * (end - start);
}




vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
    

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

// HSVからRGBへの変換関数（オプション2で使用）
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
  float fbm(vec3 x, int octaves) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100);
    
    for (int i = 0; i < octaves; ++i) {
        v += a * snoise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

float aastep(float threshold, float value) {
  #ifdef GL_OES_standard_derivatives
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
  #else
    return step(threshold, value);
  #endif  
}




vec4 sampleGrad (
          vec3 randValue,
          float noiseBase,
          vec3 position, sampler2D tGrad) {
          // ノイズ値を使ってUV座標を計算

          float noiseBase2 = snoise( position * 0.1 + uTime*0.12);


          vec2 randomUv = vec2(
            0.1 + 0.9 * (position.x +1.5), 
            0.1 + 0.9 * (position.z +1.5) 
          );
              vec4 gradColor = texture2D(tGrad, randomUv);
          return gradColor;
          
}


        vec4 getFaceColor(vec3 position, vec3 normal, float time) {
          // 面ごとに異なる色を設定
          vec3 absNormal = abs(normal);
          
          vec3 color = vec3(0.0);
          vec3 randValue = vec3(0.0);
          vec2 faceUv = vec2(0.0);
          float faceIndex = 0.0;
          
          if(normal.z > 0.9) {
            color = vec3(1.0, 0.0, 0.0); // 赤
            randValue = vec3(-9.0, 6.0, 2.0);
            faceIndex = .0;
            faceUv = vec2(
             -0.3 - 0.9 * (-position.x + 1.5), 
             -0.1 - 0.9 * (-position.y + 1.5)
            );
          }
          if(normal.z < -0.9) {
            color = vec3(0.0, 1.0, 0.0); // 緑
            randValue = vec3(7.0, -1.0, 2.0);
            faceIndex = 3.0;
            faceUv = vec2(
              0.1 + 0.9 * (-position.x + 1.5), 
              0.1 + 0.9 * (position.y + 1.5)
            );
          }
          if(normal.x > 0.9) {
            color = vec3(0.0, 0.0, 1.0); // 青
            randValue = vec3(2.0, 5.0, -8.0);
            faceIndex = 5.0;
            faceUv = vec2(
              0.1 + 0.9 * (position.z + 1.5), 
              0.1 + 0.9 * (-position.y + 1.5)
            );

          }
          if(normal.x < -0.9) {
            color = vec3(1.0, 1.0, 0.0); // 黄
            randValue = vec3(7.0, 8.0, -1.0);
            faceIndex = 2.0;
            faceUv = vec2(
              0.2 + 0.9 * (-position.y + 1.5), 
              0.5 + 0.9 * (position.z + 1.5)
            );
          }
          if(normal.y > 0.9) {
            color = vec3(0.0, 1.0, 1.0); // シアン
            randValue = vec3(-1.0, 7.0, 2.0);
            faceIndex = 1.0;
            faceUv = vec2(
              -0.1 - 0.9 * (position.z + 1.5), 
             -0.2 - 0.9 * (position.x + 1.5)
            );
            }
            if(normal.y < -0.9) {
            color = vec3(1.0, 0.0, 1.0); // マゼンタ
            randValue = vec3(8.0,-7.0, 8.0);
            faceIndex = 4.0;
            faceUv = vec2(
              0.5 + 0.7 * (position.z + 1.5), 
              0.5 + 0.7 * (position.x + 1.5)
            );
          }

          float noiseBase = fbm(randValue + position * 0.1 + time*0.01, 3);
          
          if(uIsFront) {
            // return vec4(color, 0.9);
            if(faceIndex == 0.0){
            return texture2D(tGrad1,faceUv);
            }
          
            if(faceIndex == 1.0){
            return texture2D(tGrad2,faceUv);
            }

            if(faceIndex == 2.0){
              return texture2D(tGrad1,faceUv);
            }
            if(faceIndex == 3.0){
            return texture2D(tGrad2,faceUv);
            }
          
            if(faceIndex == 4.0){
            return texture2D(tGrad3,faceUv);
            }

            if(faceIndex == 5.0){
              return texture2D(tGrad3,faceUv);
            }

          }

          if(!uIsFront) {
            // return vec4(color, 0.9);
            if(mod(faceIndex, 3.0) == 0.0){
            return texture2D(tGrad4,faceUv);
            }
          
            if(mod(faceIndex, 3.0) == 1.0){
            return texture2D(tGrad6,faceUv);
            }

            if(mod(faceIndex, 3.0) == 2.0){
              return texture2D(tGrad5,faceUv);
            }

          }



          float hue = (noiseBase) * 1.5; // ノイズ値から色相を計算

          // HSVからRGBへの変換
          vec3 hsv = vec3(noiseBase + 0.5, 1., 1.); // 彩度と明度は固定
          vec3 rgb = hsv2rgb(hsv);
          color = rgb;

       

          // 位置情報も組み込む
          return vec4(color, 0.9);
        }
        
        void main() {
          // 通常の表面の色を計算
          vec4 color = getFaceColor(vPosition, normalize(vNormal), uTime);
          // 表面のポジションと法線情報を出力
          gl_FragColor = vec4(color.rgb, 1.0);
        }




      `
