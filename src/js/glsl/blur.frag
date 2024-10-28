 precision mediump float;
        uniform sampler2D uDiffuse;
        uniform float     weight[10];
        uniform bool      horizontal;
        uniform vec2      uResolution;
        uniform vec2      uStep;
        uniform bool      uIsSlip;
        varying vec2      vTexCoord;


        void main(void){
            
        vec4  destColor = vec4(0.0);
        vec2  fc;
        vec2 tFrag = 1./ uResolution;
        if(horizontal){
            fc = vec2(gl_FragCoord.s,!uIsSlip?gl_FragCoord.t: (uResolution.y - gl_FragCoord.t));
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2(-9.0, 0.0)) * tFrag) * weight[9];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2(-8.0, 0.0)) * tFrag) * weight[8];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2(-7.0, 0.0)) * tFrag) * weight[7];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2(-6.0, 0.0)) * tFrag) * weight[6];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2(-5.0, 0.0)) * tFrag) * weight[5];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2(-4.0, 0.0)) * tFrag) * weight[4];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2(-3.0, 0.0)) * tFrag) * weight[3];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2(-2.0, 0.0)) * tFrag) * weight[2];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2(-1.0, 0.0)) * tFrag) * weight[1];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 0.0, 0.0)) * tFrag) * weight[0];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 1.0, 0.0)) * tFrag) * weight[1];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 2.0, 0.0)) * tFrag) * weight[2];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 3.0, 0.0)) * tFrag) * weight[3];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 4.0, 0.0)) * tFrag) * weight[4];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 5.0, 0.0)) * tFrag) * weight[5];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 6.0, 0.0)) * tFrag) * weight[6];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 7.0, 0.0)) * tFrag) * weight[7];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 8.0, 0.0)) * tFrag) * weight[8];
            destColor += texture2D(uDiffuse, (fc + uStep.x * vec2( 9.0, 0.0)) * tFrag) * weight[9];
//            destColor = texture2D(uDiffuse, vTexCoord);

        }else{
            fc = gl_FragCoord.st;
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0, -9.0)) * tFrag) * weight[9];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0, -8.0)) * tFrag) * weight[8];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0, -7.0)) * tFrag) * weight[7];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0, -6.0)) * tFrag) * weight[6];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0, -5.0)) * tFrag) * weight[5];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0, -4.0)) * tFrag) * weight[4];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0, -3.0)) * tFrag) * weight[3];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0, -2.0)) * tFrag) * weight[2];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0, -1.0)) * tFrag) * weight[1];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  0.0)) * tFrag) * weight[0];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  1.0)) * tFrag) * weight[1];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  2.0)) * tFrag) * weight[2];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  3.0)) * tFrag) * weight[3];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  4.0)) * tFrag) * weight[4];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  5.0)) * tFrag) * weight[5];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  6.0)) * tFrag) * weight[6];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  7.0)) * tFrag) * weight[7];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  8.0)) * tFrag) * weight[8];
            destColor += texture2D(uDiffuse, (fc + uStep.y * vec2(0.0,  9.0)) * tFrag) * weight[9];
            //destColor = texture2D(uDiffuse, (fc * tFrag));
        }
  
            gl_FragColor = destColor;
        }