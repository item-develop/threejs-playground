  uniform float time;
      attribute float aIndex;
      varying vec2 vUv;
      varying float vIndex;

       void main() {
         vUv = uv;
          vIndex = aIndex;
         vec3 pos = vec3(position.xy, position.z);
         gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
       }