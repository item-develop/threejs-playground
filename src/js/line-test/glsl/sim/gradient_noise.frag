#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;

out vec4 fragColor;

// ----- Simplex Noise (snoise) Implementation -----
vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ----- Fractal Brownian Motion (FBM) -----
float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value;
}

// ----- Main -----
void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    
    // アスペクト比を補正
    vec2 pos = uv;
    pos.x *= uResolution.x / uResolution.y;
    
    // 時間でゆっくり動かす
    float time = uTime * 0.3;
    
    // 複数のノイズレイヤーを重ねてグラデメッシュ風に
    float n1 = fbm(vec3(pos * 2.0, time));
    float n2 = fbm(vec3(pos * 3.0 + 100.0, time * 0.7));
    float n3 = snoise(vec3(pos * 1.5 - 50.0, time * 0.5));
    
    // ノイズを組み合わせる
    float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    
    // 0-1の範囲にリマップ
    noise = noise * 0.5 + 0.5;
    
    // 緑のバリエーション
    vec3 green1 = vec3(0.0, 0.8, 0.3);   // 明るい緑
    vec3 green2 = vec3(0.0, 0.5, 0.2);   // 中間の緑
    vec3 green3 = vec3(0.0, 0.3, 0.1);   // 暗い緑
    vec3 black = vec3(0.0, 0.0, 0.0);    // 黒
    
    // グラデーションを作成
    vec3 color;
    
    // 複数のノイズ値で色を決定
    float colorNoise = snoise(vec3(pos * 4.0, time * 0.4)) * 0.5 + 0.5;
    
    if (noise < 0.3) {
        color = mix(black, green3, noise / 0.3);
    } else if (noise < 0.5) {
        color = mix(green3, green2, (noise - 0.3) / 0.2);
    } else if (noise < 0.7) {
        color = mix(green2, green1, (noise - 0.5) / 0.2);
    } else {
        color = mix(green1, green2, (noise - 0.7) / 0.3);
    }
    
    // さらにノイズで色に変化を加える
    color = mix(color, black, (1.0 - colorNoise) * 0.4);
    
    // ビネット効果（端を暗く）
    float vignette = 1.0 - length(uv - 0.5) * 0.8;
    color *= vignette;
    
    fragColor = vec4(color, 1.0);
}
