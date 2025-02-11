precision highp float;
uniform sampler2D velocity;
uniform sampler2D uPic;
uniform sampler2D uPic2;
uniform float uImageChange;
varying vec2 uv;
uniform vec2 resolution;  // 画面解像度
uniform vec2 textureSize; // テクスチャのサイズ
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

vec2 getCoverUV(vec2 uv) {
    vec2 scale = resolution / textureSize;
    float scaleMax = max(scale.x, scale.y);
    vec2 scaledTextureSize = textureSize * scaleMax;
    vec2 offset = (resolution - scaledTextureSize) / 2.0;
    return (uv * resolution - offset) / scaledTextureSize;
}


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

void main(){
    vec2 vel = texture2D(velocity, uv).xy;
    float len = length(vel);
    float lenUv = clamp(pow(len, 2.)*0.2,0.,1.);

    vec2 pic2Uv = getCoverUV(uv);

    pic2Uv.y = pic2Uv.y +lenUv* 0.2*snoise(pic2Uv*300.) +lenUv*0.1;
    pic2Uv.x = pic2Uv.x +lenUv* 0.2*snoise(pic2Uv*300.) +lenUv*0.1;

    vec4 pic = texture2D(uPic, pic2Uv);
    vec4 pic2 = texture2D(uPic2, pic2Uv);


    vec2 suv = uv;
    float sn= snoise(suv*1.);

float border=uImageChange*1. + (1. - suv.y - (sn+1.)/2.*0.2);
float centerDis = 0.02/abs(border - 0.95);
    float mask = smoothstep(0.9, 1., border );
float maskClamped = clamp(mask, 0., 1.);
    vec4 finalPic = mix(pic, pic2, 
    maskClamped
    );

    vel = vel * 0.5 + 0.5;
    
    vec3 color = vec3(0., 0.595098, 0.5764705882);

    //color = mix(color, vec3(1.0),  10.*pow(len, 4.));

 vec3 blendedColor = mix(
        finalPic.rgb,
        finalPic.rgb * color,
        clamp(0.5-10.*pow(len, 4.) - centerDis, 0.,1.) 
    );
    gl_FragColor = vec4(blendedColor,  1.0);
    
    //vec4 pic2 = texture2D(uPic, uv);
    //gl_FragColor = pic2;

}
