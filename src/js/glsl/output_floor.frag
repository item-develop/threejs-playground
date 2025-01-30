uniform float uBlack;
uniform float uTick;
uniform vec3 uDirLightPos;
uniform float uDotScale;
uniform float uLineScale;
uniform vec3 uFloorToneColor;
uniform vec3 uFogColor;

uniform int uTonePattern;

varying vec3 vNormal;

uniform vec4 uColor;




const float PI = 3.1415926;

float bias;
uniform sampler2D shadowMap;
uniform vec2 shadowMapSize;

varying vec4 vShadowCoord;


float unpackDepth( const in vec4 rgba_depth ) {
  const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
    return dot(rgba_depth, bit_shift);
}

float sampleVisibility( vec3 coord ) {
  return step( coord.z, ( texture2D( shadowMap, coord.xy ).x ) + bias );
}

float getShadow(vec3 normal, vec3 lightPos, vec4 _shadowCoord){
  bias = 0.0;//max(0.05 * (1.0 - dot(normal, lightPos)), 0.001);  

  float shadow = 0.0;
  vec3 shadowCoord = _shadowCoord.xyz / _shadowCoord.w;

float step = 1.0;

 vec2 inc = vec2( step ) / shadowMapSize;

  shadow += sampleVisibility( shadowCoord + vec3(     -inc.x, -inc.y, 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(     0., -inc.y, 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(     inc.x, -inc.y, 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3( -inc.x,     0., 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(     -inc.x, inc.y, 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(     0., inc.y, 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(     inc.x, inc.y, 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(  inc.x,     0., 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(     0.,      0, 0. ) );
  shadow /= 9.;

  //shadow = step( shadowCoord.z, unpackDepth( texture2D( shadowMap, shadowCoord.xy ) ) + bias );
  return shadow;
}


float getHalfToneEffect(float dotDiffuse){
  vec2 v_dot;
  vec2 v_line;

  float f_dot;
  float f_line;
  float g_line;

  float result;

  if(uTonePattern == 1){
    v_dot = gl_FragCoord.xy * uDotScale;
    f_dot = max(sin(v_dot.x) * cos(v_dot.y) * 1.5, 0.0);

    if(dotDiffuse > 0.2){
      result = 1.0;
    } else{
      result = f_dot;
    }

  } else if(uTonePattern == 2){
    v_line = gl_FragCoord.xy * uLineScale;
    f_line = max(sin(v_line.x + v_line.y), 0.0);
    g_line = max(sin(v_line.x - v_line.y), 0.0);

    if(dotDiffuse > 0.2){
      result = 1.0;
    } else{
      result = (pow(f_line, 2.0) + pow(g_line, 2.0));
    }
  }



  result = min(1.0, result);

  return result;
}

// ポアソンディスクの定数配列
const vec2 poissonDisk[12] = vec2[](
    vec2(-0.94201624, -0.39906216),
    vec2(0.94558609, -0.76890725),
    vec2(-0.094184101, -0.92938870),
    vec2(0.34495938, 0.29387760),
    vec2(-0.91588581, 0.45771432),
    vec2(-0.81544232, -0.87912464),
    vec2(-0.38277543, 0.27676845),
    vec2(0.97484398, 0.75648379),
    vec2(0.44323325, -0.97511554),
    vec2(0.53742981, -0.47373420),
    vec2(-0.26496911, -0.41893023),
    vec2(0.79197514, 0.19090188)
);

// シャドウマップからポアソンサンプリングで影の可視性を計算する関数
float getPoissonShadow(sampler2D shadowMap, vec3 shadowCoord, float bias) {
    float visibility = 1.0;
    
    // サンプリングのスケール係数（調整可能）
    float scale =2000.0;
    
    // 4点のポアソンサンプリング
    for(int i = 0; i < 12; i++) {
        vec2 sampleCoord = shadowCoord.xy + poissonDisk[i] / scale;
        float shadowMapDepth = texture2D(shadowMap, sampleCoord).r;
        
        if(shadowMapDepth < shadowCoord.z - bias) {
            visibility -= 0.25; // 各サンプルの重みを0.25に設定
        }
    }
    
    return clamp(visibility, 0.0, 1.0); // 0.0から1.0の範囲に制限
}

void main(){
  // float shadow = getShadow(vNormal, uDirLightPos, vShadowCoord);
  
 vec3 shadowCoord = vShadowCoord.xyz / vShadowCoord.w * 0.5 + 0.5;

 float depth_shadowCoord = shadowCoord.z;
   vec2 depthMapUv = shadowCoord.xy;


  float cosTheta = dot(normalize(uDirLightPos), vNormal);
     float bias = 0.005 * tan(acos(cosTheta)); // cosTheta is dot( n,l ), clamped between 0 and 1
    bias = clamp(bias, 0.0, 0.005);
    
  float shadowFactor = getPoissonShadow(shadowMap, shadowCoord, bias);

  float depth_depthMap = unpackRGBAToDepth(texture2D(shadowMap, depthMapUv));
//  shadowFactor = step(depth_shadowCoord , depth_depthMap);

 // 比較して、深度マップの値のほうが小さかったら遮蔽物があるので影を描画する。
//    float shadowFactor = step(depth_shadowCoord, depth_depthMap);


    //bias=0.;
    //float shadow = getShadow(vNormal, uDirLightPos, vShadowCoord);
    //float shadowFactor = shadow;
    

  bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
    bool inFrustum = all( inFrustumVec );

    bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
    bool frustumTest = all( frustumTestVec );

    if(frustumTest == false){
        shadowFactor = 1.0;
    }


  float difLight = max(0.0, cosTheta);

    float shading = shadowFactor ;
   /*  vec4 uColor = vec4(
      1.0,0.1,0.1
      , 1.0); */
vec4 color = mix(vec4(uBlack), vec4(1.), shading);
  //color=vec3(1.,0.,0.);
  gl_FragColor = vec4(vec3(color), 1.0);
}