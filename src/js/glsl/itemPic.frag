precision mediump float;
       uniform float time;
       varying vec2 vUv;
        varying float vIndex;
        uniform float uXNum;
        uniform float uYNum;
        uniform sampler2D uTexture;


      
       void main() {
           // インデックスが偶数かどうかをチェック

           float offsetXRate=mod(vIndex, uXNum)*(1./uXNum);
           float offsetYRate=1. -ceil((vIndex+1.)/uXNum)*(1./uYNum);

    // UVスケーリングの適用
    vec2 uv = vUv;
    
    // UVを分割数でスケーリング
    uv *= vec2(1.0/uXNum, 1.0/uYNum);
    
    // オフセットの適用
    uv.x += offsetXRate;
    uv.y += offsetYRate;
    

            vec4 tex = texture2D(uTexture, uv);
          vec3 color = vec3(tex.rgb); 
          gl_FragColor = vec4(color, 1.);
       }
       