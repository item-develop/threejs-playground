uniform float uTick;
uniform vec3 uDirLightPos;
uniform float uDotScale;
uniform float uLineScale;
uniform float uAlpha;
uniform vec3 uFloorToneColor;
uniform vec3 uFogColor;

uniform int uTonePattern;

varying vec3 vNormal;

uniform vec4 uColor;
uniform sampler2D uTexture;

uniform sampler2D uTextureTextJa;
uniform sampler2D uTextureTextEn;


const float PI = 3.1415926;

float bias;
uniform sampler2D shadowMap;
uniform vec2 shadowMapSize;

varying vec4 vShadowCoord;
varying vec2 vUv;

uniform float uTextProgress;
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

//  float step = 1.0;

  // vec2 inc = vec2( step ) / shadowMapSize;

  //shadow += sampleVisibility( shadowCoord + vec3(     -inc.x, -inc.y, 0. ) );
  //shadow += sampleVisibility( shadowCoord + vec3(     0., -inc.y, 0. ) );
  //shadow += sampleVisibility( shadowCoord + vec3(     inc.x, -inc.y, 0. ) );
  //shadow += sampleVisibility( shadowCoord + vec3( -inc.x,     0., 0. ) );
  //shadow += sampleVisibility( shadowCoord + vec3(     -inc.x, inc.y, 0. ) );
  //shadow += sampleVisibility( shadowCoord + vec3(     0., inc.y, 0. ) );
  //shadow += sampleVisibility( shadowCoord + vec3(     inc.x, inc.y, 0. ) );
  //shadow += sampleVisibility( shadowCoord + vec3(  inc.x,     0., 0. ) );
  //shadow += sampleVisibility( shadowCoord + vec3(     0.,      0, 0. ) );
  //shadow /= 9.;

  shadow = step( shadowCoord.z, unpackDepth( texture2D( shadowMap, shadowCoord.xy ) ) + bias );
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




float rand(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
	vec2 ip = floor(p);
	vec2 u = fract(p);
	u = u*u*(3.0-2.0*u);
	
	float res = mix(
		mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
		mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
	return res*res;
}

float fbm(vec2 x, int numOctaves) {
	float v = 0.0;
	float a = 0.5;
	vec2 shift = vec2(100);
	// Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
	for (int i = 0; i < numOctaves; ++i) {
		v += a * noise(x);
		x = rot * x * 2.0 + shift;
		a *= 0.5;
	}
	return v;
}


// UV座標における矩形領域からテクスチャをサンプリングする関数
vec4 sampleTextureRect(
    sampler2D _texture,    // サンプリングするテクスチャ
    vec2 uv,             // 現在のUV座標
    float left,          // 左端のX座標 (0.0 to 1.0)
    float top,           // 上端のY座標 (0.0 to 1.0)
    float width,         // 幅 (0.0 to 1.0)
    float height         // 高さ (0.0 to 1.0)
) {
    // 矩形領域の範囲チェック
    bool isInRect = 
        uv.x >= left && 
        uv.x <= (left + width) && 
        uv.y >= top && 
        uv.y <= (top + height);
    
    // 矩形領域内のUV座標を0-1の範囲に正規化
    vec2 normalizedUV = vec2(
        (uv.x - left) / width,
        (uv.y - top) / height
    );
    
    // 矩形領域内の場合のみテクスチャをサンプリング
    return isInRect ? texture2D(_texture, normalizedUV) : vec4(0.0);
}




void main(){
  // float shadow = getShadow(vNormal, uDirLightPos, vShadowCoord);
 vec3 shadowCoord = vShadowCoord.xyz / vShadowCoord.w * 0.5 + 0.5;
 float depth_shadowCoord = shadowCoord.z;
   vec2 depthMapUv = shadowCoord.xy;

    

    float depth_depthMap = unpackRGBAToDepth(texture2D(shadowMap, depthMapUv));

 // 比較して、深度マップの値のほうが小さかったら遮蔽物があるので影を描画する。
//    float shadowFactor = step(depth_shadowCoord, depth_depthMap);

  float cosTheta = dot(normalize(uDirLightPos), vNormal);
    float bias = 0.005 * tan(acos(cosTheta)); // cosTheta is dot( n,l ), clamped between 0 and 1
    bias = clamp(bias, 0.0, 0.01);
    
    

    float shadowFactor = step(depth_shadowCoord - bias, depth_depthMap);



  bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
    bool inFrustum = all( inFrustumVec );

    bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
    bool frustumTest = all( frustumTestVec );

    if(frustumTest == false){
        shadowFactor = 1.0;
    }


  float difLight = max(0.0, cosTheta);

	float disp= fbm(
  	  vUv*1000., 4
  	)  ;
    float shading =  (shadowFactor) ;
   /*  vec4 uColor = vec4(
      1.0,0.1,0.1
      , 1.0); */
      vec4 txtColor = texture2D(uTexture, vUv);

    
    vec4 textEnColor = sampleTextureRect(uTextureTextEn, vUv, 0.078, 0.11, 0.8, 0.64);

    vec4 textJaColor = sampleTextureRect(uTextureTextJa, vUv, 0.078, 0.11, 0.8, 0.64);

 
    vec4 color = mix(txtColor-0.2*disp, txtColor,shading);

    float jpProgress= step(
      (1.-vUv.y), uTextProgress
    );
    jpProgress=smoothstep((1.-vUv.y),(1.-vUv.y+0.02), uTextProgress*1.5);

    color = mix(color, textEnColor, textEnColor.a*(1.-jpProgress)
    
    );
    color = mix(color, textJaColor, textJaColor.a
    * jpProgress
    );

  //color=vec3(1.,0.,0.);
  color= mix(
    color, vec4(vec3(1.),1.), 1.-uAlpha
  );
  gl_FragColor = vec4(vec3(color),color.a);
}