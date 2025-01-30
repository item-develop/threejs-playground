// Fragment Shader

uniform float time;

varying vec2 vUv;
varying vec3 vNormal;

varying vec3 vEyeDirection;

varying vec3 vPos;


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

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;
    
    if (hsl.y == 0.0) {
        rgb = vec3(hsl.z); // Luminance
    } else {
        float f2;
        
        if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
        else
            f2 = hsl.z + hsl.y - hsl.y * hsl.z;
            
        float f1 = 2.0 * hsl.z - f2;
        
        rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
        rgb.g = hue2rgb(f1, f2, hsl.x);
        rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
    }   
    return rgb;
}

vec3 hsl2rgb(float h, float s, float l) {
    return hsl2rgb(vec3(h, s, l));
}

float length2(vec2 p) {
  return sqrt(dot(p, p));
}

void main() {
   float disp= fbm(
    vUv*2000. + time*1., 4
  );
  vec3 gradient = hsl2rgb (fract(0.08+disp*0.04), .77,.55);


  vec3 directionalLightPosition= vec3( 0.0, .0, 5.0 );
  vec3 directionalLightColor= vec3( 1.0, 1.0, 1.0 );
  vec3 ambientLightColor= vec3( 0.2, 0.2, 0.2 );
  vec3 directionalVector= normalize( directionalLightPosition );
  vec3 transformedNormal= normalize( vNormal );
  float directional= max( dot( transformedNormal, directionalVector ), 0.0 );
  vec3 vLighting= ambientLightColor + ( directionalLightColor * directional );
 
 // vLighting が 0~0.1の場合極端に大きく
 float outlineLight = pow(length2(vPos.xy), 3.) * .14;
 float centerLight = max(0.,pow(2.1 - length2(vPos.xy - vec2(1., 0.) ),10.));



  gl_FragColor = vec4(gradient * vLighting + outlineLight + centerLight*0.0005, 1.0);
}