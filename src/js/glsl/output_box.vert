uniform mat4 shadowP;
uniform mat4 shadowV;
uniform vec3 uDirLightPos;

uniform vec3 uEyePosition;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogStart;
uniform float uTime;
uniform float uFogEnd;

uniform float uOffsetHeight;

varying vec3 vNormal;

varying vec4 vShadowCoord;

const float PI = 3.1415926;

const mat4 biasMatrix = mat4(
  0.5, 0.0, 0.0, 0.0,
  0.0, 0.5, 0.0, 0.0,
  0.0, 0.0, 0.5, 0.0,
  0.5, 0.5, 0.5, 1.0
);

varying vec2 vUv;

vec3 rotateY(vec3 v, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  mat3 m = mat3(
    c, 0, s,
    0, 1, 0,
    -s, 0, c
  );
  return m * v;
}
vec3 rotateZ  (vec3 v, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  mat3 m = mat3(
    c, -s, 0,
    s, c, 0,
    0, 0, 1
  );
  return m * v;
}

// 0~
uniform float uSpread;
uniform float uBentBase;
uniform float uPosZ;
uniform float uPosX;
uniform float uBentSize;

// 高さを調整可能な版
float parabolaWithHeight(float x, float height) {
    return height * -4.0 * x * (x - 1.0);
}

// 原点(0,0)を通り、上に凸で開き具合を調整できる二次関数
float originFixedParabola(float x, float a) {
    // y = ax(x-1) の形
    // a: 負の値。絶対値が大きいほど急な曲線になる
    return a * x * (x - 1.0);
}
float configurableParabola(float x, float vx, float vy, float a) {
    // y = a(x - vx)^2 + vy の形
    // a: 負の値で上に凸。値が大きいほど急な曲線になる
    // (vx, vy): 頂点の座標
    return a * (x - vx) * (x - vx) + vy;
}


uniform float uTextProgress;
void main(){
  vec3 pos = position;

  vUv = uv;

  // -1~1
  float timeTheta= (sin(uTime*PI));

  // 絶対値分広がりを制御したい

  
  float posY = (pos.x + uBentBase) * (1.-uSpread);

  pos = rotateY(pos,uBentSize* PI/2. * posY );
  pos.z+=uPosZ;
  pos.x+=uPosX;
  pos = rotateZ(pos,  PI*0.05  - PI*0.1*uTextProgress);

  /* if(uTextProgress<1.){
  pos.y-=0.4*sin(uTextProgress*PI*1.5);
  }else{
  pos.y-=0.4*sin(1.*PI*1.5) - (uTextProgress*uTextProgress-1.)*3.;

  } */

  float chotenX=.5;
  float chotenY=originFixedParabola(chotenX, 1.);
  if(uTextProgress < chotenX){
    pos.y+=originFixedParabola(uTextProgress, 1.);
  }else{
    pos.y-=configurableParabola(uTextProgress,
    chotenX, -chotenY, -5.);
  }
  
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition; 

  vNormal = normal;
  

  // vDotDiffuse = dot(normal, uDirLightPos) * 0.5 + 0.5;
  vShadowCoord =  shadowP * shadowV * worldPosition;
}