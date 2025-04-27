        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vCameraPosition;
        varying vec2 vUv;
        
        uniform float uTime;
        uniform vec3 uBoxSize;
        
        // グラデーションの色を計算
        vec4 getFaceColor(vec3 position, vec3 normal, float time) {
          // 面ごとに異なるグラデーションを生成
          vec3 absNormal = abs(normal);
          
          // 各面がどの方向を向いているか特定
          bool isXFace = absNormal.x > 0.9;
          bool isYFace = absNormal.y > 0.9;
          bool isZFace = absNormal.z > 0.9;

          vec3 c1 = vec3(1.0, 0., 0.); // 黄系
          vec3 c2 = vec3(.0, 1., 0.); // 赤系
          vec3 c3 = vec3(0., 0., 1.0); // 青系
          vec3 c4 = vec3(1., 1.0, .0); // シアン系
          vec3 c5 = vec3(1.0, 0., 1.0); // 紫系
          vec3 c6 = vec3(0., 1.0, 1.); // 緑系
      
          c1= vec3(1.,1., 1.);
          c2= vec3(1.,1., 1.);
          c3= vec3(1.,1., 1.);
          c4= vec3(1.,1., 1.);
          c5= vec3(1.,1., 1.);
          c6= vec3(1.,1., 1.);

          vec3 color;
          float faceIndex = 0.0;

          if(normal.z>0.9) {
            color = c1;
            faceIndex = 0.0;
          }
          if(normal.z<-0.9) {
           
          color = c2;
            faceIndex = 1.0;
          }

          if(normal.x>0.9) {
            color = c3;
            faceIndex = 2.0;
          }
          if(normal.x<-0.9) {
            color = c4;
            faceIndex = 3.0;
          }
          if(normal.y>0.9) {
            color = c5;
            faceIndex = 4.0;
          }
          if(normal.y<-0.9) {
            color = c6;
            faceIndex = 5.0;
          }
          

          color = color + vec3(1.) 
          * vec3(
          sin(faceIndex + 1.+time*0.2 + position.x * 2.0), 
          sin(faceIndex + 5.+time*0.2 + position.y * 2.0), 
          sin(faceIndex + 8.+time*0.2 + position.z * 2.0)
          );

          return vec4(color, 1.); // アルファ値0.7で半透明に
        }
        
        // レイと直方体の交差判定
        vec2 rayBoxIntersection(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
          vec3 tMin = (boxMin - rayOrigin) / rayDir;
          vec3 tMax = (boxMax - rayOrigin) / rayDir;
          vec3 t1 = min(tMin, tMax);
          vec3 t2 = max(tMin, tMax);
          float tNear = max(max(t1.x, t1.y), t1.z);
          float tFar = min(min(t2.x, t2.y), t2.z);
          return vec2(tNear, tFar);
        }
        
        // 交点の法線を取得
        vec3 getNormalAtIntersection(vec3 point, vec3 boxMin, vec3 boxMax) {
          vec3 center = (boxMin + boxMax) * 0.5;
          vec3 halfSize = (boxMax - boxMin) * 0.5;
          vec3 distFromCenter = abs(point - center);
          
          // どの面に衝突したかを判定
          vec3 normal = vec3(0.0);
          
          if (abs(distFromCenter.x - halfSize.x) < 0.001) {
            normal.x = sign(point.x - center.x);
          } else if (abs(distFromCenter.y - halfSize.y) < 0.001) {
            normal.y = sign(point.y - center.y);
          } else if (abs(distFromCenter.z - halfSize.z) < 0.001) {
            normal.z = sign(point.z - center.z);
          }
          
          return normal;
        }
        
        void main() {
          // カメラから現在のフラグメントへのレイを計算
          vec3 rayOrigin = vCameraPosition;
          vec3 rayDir = normalize(vWorldPosition - vCameraPosition);
          
          // 直方体の境界を設定
          vec3 boxHalfSize = uBoxSize * 0.5;
          vec3 boxMin = -boxHalfSize;
          vec3 boxMax = boxHalfSize;
          
          // レイと直方体の交差判定
          vec2 intersections = rayBoxIntersection(rayOrigin, rayDir, boxMin, boxMax);
          float tNear = intersections.x;
          float tFar = intersections.y;
          
          // 交差がない、または視点が直方体の中にある場合
          if (tFar < tNear || tFar < 0.0) {
            // discard;
          }
          
          // 入射点と出射点を計算
          vec3 entryPoint = rayOrigin + rayDir * tNear;
          vec3 exitPoint = rayOrigin + rayDir * tFar;
          
          // 入射点と出射点の法線を取得
          vec3 entryNormal = getNormalAtIntersection(entryPoint, boxMin, boxMax);
          vec3 exitNormal = -getNormalAtIntersection(exitPoint, boxMin, boxMax);
          
          // 各点での色を計算
          vec4 entryColor = getFaceColor(entryPoint, entryNormal, uTime);
          vec4 exitColor = getFaceColor(exitPoint, exitNormal, uTime);
          
          // 色を乗算合成
          vec3 finalColor = entryColor.rgb * exitColor.rgb*1.;
          float finalAlpha = entryColor.a * exitColor.a;
          
          gl_FragColor = vec4(finalColor, finalAlpha);
          //gl_FragColor = vec4(entryColor.rgb, 1.);
          gl_FragColor = vec4(vec3(1.,0.,0.), 1.);
          //gl_FragColor = vec4(finalColor.rgb, 1.);
        }