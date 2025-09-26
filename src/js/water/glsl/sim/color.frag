precision highp float;
uniform sampler2D velocity;
uniform sampler2D uPic;
uniform sampler2D uPic2;
uniform float uImageChange;
uniform float uTime;
uniform float uMouseString;
varying vec2 uv;
uniform vec2 resolution; 
uniform vec2 textureSize;
uniform vec2 uMouse;

void main(){
    vec2 vel = texture2D(velocity, uv).xy;
    float len = length(vel);

    gl_FragColor = vec4(vec3(
        len*1.0,
        len*1.0,
        len*1.0
    ),  1.0);
    
    //vec4 pic2 = texture2D(uPic, uv);
    //gl_FragColor = pic2;

}
