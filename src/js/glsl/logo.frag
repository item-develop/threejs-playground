
       uniform float time;
       varying vec2 vUv;
        varying float vIndex;

        // vIndex = 0 表示しない
        // vIndex = 1 四角形
        // vIndex = 2 円形


       void main() {
           // インデックスが偶数かどうかをチェック

          vec3 color = vec3(0.);

           if(vIndex == 0.0) {
            discard;
           }

           if(vIndex == 1.0) {
              gl_FragColor = vec4(color, 1.0);
            }

          if(vIndex == 2.0) {
              vec2 center = vec2(0.5, 0.5);
              // 円形マスクの半径（0.5でUV座標の半分）
              float dist = length(vUv - center)*1.;
              float radius = 0.5;
              float alpha = 1.0;
              // スムーズな端を作成
              float smoothEdge = 0.01;
              alpha = 1.0 - smoothstep(radius - smoothEdge, radius, dist);
              gl_FragColor = vec4(color, alpha);
            }

       }
       