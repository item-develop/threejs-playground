uniform vec2 resolution;
uniform sampler2D tDiffuse;
uniform sampler2D tPrev;
varying vec2 vUv;
uniform float time;


vec3 bgColor = vec3(1.,1.,1.);

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    vec4 prev = texture2D(tPrev, vUv);
    gl_FragColor = color+prev*0.96;


//          gl_FragColor= vec4 (disp,0.,1.);

    }