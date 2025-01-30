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


// 0~
uniform float uSpread;
uniform float uBentBase;
uniform float uPosZ;
uniform float uPosX;
uniform float uBentSize;

void main(){
  vec3 pos = position;

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vUv = uv;

  // -1~1
  float timeTheta= (sin(uTime*PI));

  // 絶対値分広がりを制御したい

  
  float posY = (worldPosition.x + uBentBase) * (1.-uSpread);

  worldPosition.xyz = rotateY(worldPosition.xyz,uBentSize* PI/2. * -posY );

  worldPosition.z+=uPosZ;
  worldPosition.x+=uPosX;
  worldPosition.x+=0.1;
  worldPosition.y-=0.1;
  
  //worldPosition.xyz = rotateY(worldPosition.xyz,  PI*1.);
  //worldPosition.z+=5.;
  
  gl_Position = projectionMatrix * viewMatrix * worldPosition; 

  vNormal = normal;
  

  // vDotDiffuse = dot(normal, uDirLightPos) * 0.5 + 0.5;
  vShadowCoord =  shadowP * shadowV * worldPosition;
}