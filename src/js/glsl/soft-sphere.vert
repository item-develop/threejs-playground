// Vertex Shader

uniform float time;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vEyeDirection;


float rand(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
	vec2 ip = floor(p);
	vec2 u = fract(p);
	u = u*u*(3.0-2.0*u);
	
	float res = mix(
		mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
		mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
	return res*res;
}

float fbm(vec2 x, int numOctaves) {
	float v = 0.0;
	float a = 0.5;
	vec2 shift = vec2(100);
	// Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
	for (int i = 0; i < numOctaves; ++i) {
		v += a * noise(x);
		x = rot * x * 2.0 + shift;
		a *= 0.5;
	}
	return v;
}

// PI
#define PI 3.14159265359
void main() {
  vUv = uv;

vNormal = normal;
float disp= fbm(
  	  vUv*.5 + time*.4 , 4
  	) ;
    float disp2 = fbm(
  	  vec2(vUv.y/3., vUv.x*4.) *.20 + time*.4 + 1.0 , 4
    );

  vec3 pos = position;
  // 法線方向への拡大
  //pos += normal * (smoothstep(0.0, 1., disp) * .4);
  pos.x*=1. + (disp-0.5)*0.3;
  pos.y*=1. + (disp-0.5)*0.3;
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vPos = worldPosition.xyz;
  vec3 cameraPosition = vec3(0., 0., 3.);

  vEyeDirection = normalize(cameraPosition - worldPosition.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}