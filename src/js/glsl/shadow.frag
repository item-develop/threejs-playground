precision highp float;


void main() {
   gl_FragColor = packDepthToRGBA(gl_FragCoord.z);
}