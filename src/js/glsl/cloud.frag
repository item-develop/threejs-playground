// 必要なuniform変数
uniform sampler2D uTexture;     // ベースとなるテクスチャ
varying vec2 vUv;               // UV座標
uniform vec2 uResolution;       // 画面の解像度
uniform vec2 uLightPosition;    // 光源の位置 (0.0-1.0の範囲)
uniform vec2 imageResolution;    // 光源の位置 (0.0-1.0の範囲)
uniform float uLightIntensity;  // 光の強さ (0.0-1.0の範囲)
uniform float uTime;            // アニメーション用の時間変数
uniform float uLightLeakIntensity;  // ライトリークの強さ
uniform float uLensFlareIntensity;  // レンズフレアの強さ
uniform float uGradProgress;  // レンズフレアの強さ
uniform vec3 uLightColor;       // 光の色
uniform float uUp;       // 光の色


// UV座標をスケーリングする関数
// uv: 元のUV座標 (0.0～1.0の範囲)
// scale: スケーリング係数 (1.0より大きい値で拡大、小さい値で縮小)
// center: スケーリングの中心点 (デフォルトは中央(0.5, 0.5))
vec2 scaleUv(vec2 uv, float scale, vec2 center) {
    // 中心点を原点に移動
    vec2 uv_centered = uv - center;
    
    // スケーリングを適用
    vec2 uv_scaled = uv_centered / scale;
    
    // 中心点を元に戻す
    return uv_scaled + center;
}

// オーバーロード：中心点を省略した場合、中央(0.5, 0.5)を使用
vec2 scaleUv(vec2 uv, float scale) {
    return scaleUv(uv, scale, vec2(0.5, 0.5));
}


vec2 getCoverUV(vec2 uv, vec2 anchor) {
    // anchorは0.0～1.0の範囲で、(0.5, 0.5)が中央、(0, 0)が左上、(1, 1)が右下を表す
    vec2 scale = uResolution / imageResolution;
    float scaleMax = max(scale.x, scale.y);
    vec2 scaledTextureSize = imageResolution * scaleMax;
    
    // 基準点に基づいたオフセットを計算
    // anchor(0.5, 0.5)なら中央揃え、(0, 0)なら左上揃え、(1, 1)なら右下揃え
    vec2 offsetFactor = 1.0 - anchor;
    vec2 offset = (uResolution - scaledTextureSize) * offsetFactor;
    
    return (uv * uResolution - offset) / scaledTextureSize;
}


// ライトリーク効果を生成する関数
vec3 createLightLeak(vec2 uv, vec2 lightPos, float intensity) {
    // ライトリークのパターンを生成
    float distanceFromLight = length(uv - lightPos);
    float radialGradient = 1.0 - smoothstep(0.0, 0.8, distanceFromLight);
    
    // 波紋のようなパターンを追加
    float rings = sin(distanceFromLight * 15.0 - uTime * 0.5) * 0.5 + 0.5;
    
    // 非対称な広がりを作成
    vec2 direction = normalize(uv - lightPos);
    float anisotropy = max(0.0, dot(direction, vec2(0.7, 0.5)));
    
    // 色付きのライトリーク
    vec3 leakColor = uLightColor * mix(1.0, rings, 0.3) * radialGradient * anisotropy;
    return leakColor * intensity;
}

// レンズフレアのゴースト効果を生成する関数
vec3 createLensGhosts(vec2 uv, vec2 lightPos, float intensity) {
    vec3 ghostColor = vec3(0.0);
    
    // 複数のゴーストを生成
    for(int i = 1; i <= 5; i++) {
        // 光源位置を中心として反対側に配置
        float ghostSpacing = float(i) * 0.15;
        vec2 ghostPos = lightPos + (lightPos - vec2(0.5)) * ghostSpacing;
        
        // ゴーストの形状と強度
        float ghostSize = 0.04 / float(i);
        float dist = length(uv - ghostPos);
        float ghostStrength = smoothstep(ghostSize, 0.0, dist) * 0.3 / float(i);
        
        // 色付きのゴースト
        vec3 currentGhostColor = uLightColor * ghostStrength;
        ghostColor += currentGhostColor;
    }
    
    return ghostColor * intensity;
}

// 六角形の形状のボケ効果（絞りの形）を生成する関数
float hexShape(vec2 p, float size) {
    p = abs(p);
    float angleStep = 3.14159 / 3.0;
    float angle = atan(p.y, p.x);
    float angleMod = mod(angle, angleStep);
    float dist = length(p) * cos(angleMod - angleStep * 0.5);
    return smoothstep(size, size - 0.03, dist);
}

// レンズフレアのハロー効果を生成する関数
vec3 createLensHalo(vec2 uv, vec2 lightPos, float intensity) {
    vec2 deltaUV = uv - lightPos;
    float dist = length(deltaUV);
    
    // 基本的なハロー
    float haloGradient = smoothstep(0.4, 0.0, dist);
    
    // 色収差効果を追加
    float redShift = smoothstep(0.3, 0.0, dist);
    float greenShift = smoothstep(0.25, 0.0, dist);
    float blueShift = smoothstep(0.2, 0.0, dist);
    
    vec3 haloColor = vec3(redShift, greenShift, blueShift) * haloGradient;
    
    // 六角形の形状を適用
    float hexMask = hexShape(deltaUV, 0.1 + sin(uTime * 0.2) * 0.01);
    haloColor *= mix(0.5, 1.0, hexMask);
    
    return haloColor * intensity * 0.5;
}

// 光条（スターバースト）効果を生成する関数
vec3 createStarburst(vec2 uv, vec2 lightPos, float intensity) {
    vec2 deltaUV = uv - lightPos;
    float angle = atan(deltaUV.y, deltaUV.x);
    float dist = length(deltaUV);
    
    // 光条のレイを生成
    float rays = 0.0;
    int numRays = 8;
    for(int i = 0; i < numRays; i++) {
        float rayAngle = float(i) * 3.14159 * 2.0 / float(numRays);
        float rayIntensity = abs(cos(angle - rayAngle) * sin(angle * 3.0 + uTime * 0.2));
        rays += pow(rayIntensity, 10.0) * (1.0 - smoothstep(0.0, 0.6, dist));
    }
    
    return uLightColor * rays * intensity;
}

// すべての光の効果を組み合わせる関数
vec3 combineLightEffects(vec2 uv, vec2 lightPos) {
lightPos = vec2(
lightPos.x- 0.2*uUp + 0.1,
lightPos.y- 0.2*uUp + 0.2
);

  // ライトリーク
    vec3 lightLeak = createLightLeak(uv, lightPos, uLensFlareIntensity*0.5);

    // レンズフレアのゴースト
    vec3 lensGhosts = createLensGhosts(uv, lightPos, uLensFlareIntensity);

    // 六角形
    vec3 lensHalo = createLensHalo(uv, lightPos, uLensFlareIntensity);

    // 星みたいな
    vec3 starburst = createStarburst(uv, lightPos, uLensFlareIntensity);
    
    // すべての効果を加算合成
    return lightLeak + lensGhosts + lensHalo;
}

void main() {
    vec2 uv = vUv;
    //vec2 uv2 = scaleUv(getCoverUV(vUv, vec2(0.5, 0.)), 1.0) ;
    //vec2 uv2 = scaleUv(getCoverUV(vUv, vec2(0.5, 0.)), 1.0) ;
    vec2 _uv2 = getCoverUV(vUv, vec2(0.5, 1.)) ;
    vec2 uv2 = scaleUv(_uv2, 1.4, vec2(0.5, 1.)) ;
    //vec2 uv2 = vUv;
    uv2.y-= 0.3;
    uv2.y+= uUp * 0.3; // UV座標を時間でアニメーション



    // 元のテクスチャをサンプリング
    vec3 baseColor = texture2D(uTexture, uv2).rgb;
    
    // 光の効果を追加

    vec3 lightEffects = combineLightEffects(uv, uLightPosition);
    

    vec2 leftTop = vec2(1. + uGradProgress*0.5, 1. + uGradProgress*0.5);
    float distanceFromLight = length(uv - leftTop);
    float radialGradient = 1.0 - uGradProgress*2.*smoothstep(0.0, 1.1, distanceFromLight);


    // スクリーン合成（光の加算）
    vec3 finalColor = baseColor + lightEffects + clamp(radialGradient, 0., 1.);
    
    // 結果の出力
    gl_FragColor = vec4(finalColor, 1.0);
}