uniform mat4 shadowP;
uniform mat4 shadowV;
uniform vec3 uDirLightPos;

uniform vec3 uEyePosition;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogStart;
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

void main(){
  vec3 pos = position;
  
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition; 

  vNormal = normal;
  

  // vDotDiffuse = dot(normal, uDirLightPos) * 0.5 + 0.5;
  vShadowCoord =  shadowP * shadowV * worldPosition;
}