precision highp float;
uniform sampler2D velocity;
uniform float uTime;
varying vec2 uv;
uniform vec2 resolution; 
uniform vec2 textureSize;
uniform vec2 uMouse;

void main(){
    vec2 vel = texture2D(velocity, uv).xy;
    float len = length(vel);

    gl_FragColor = vec4(vec3(
        floor(len*200.) / 200. ,
        floor(len*200.) / 200. ,
        floor(len*200.) / 200. 
    ),  0.7);
    
    //vec4 pic2 = texture2D(uPic, uv);
    //gl_FragColor = pic2;

}
