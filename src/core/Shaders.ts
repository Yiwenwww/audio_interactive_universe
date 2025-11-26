export const vertexShader = `
  uniform float size;
  uniform float uBass;
  uniform float uTreble;
  uniform float uWave;
  uniform float uTime;
  uniform float uModY; 
  uniform float uEffect; 
  
  // Interaction Uniforms
  uniform vec3 uMousePos;

  varying vec3 vColor;
  varying vec3 vPos;
  varying float vAlpha;

  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  
  // Simplex Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) { 
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i); 
      vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857; 
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ ); 
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
      vColor = color;
      vec3 pos = position;
      vAlpha = 1.0;

      // --- Material Logic ---
      if (abs(uEffect - 2.0) < 0.1) { // Plant
          float n = snoise(pos * 0.01 + uTime * 0.2);
          pos += n * 20.0;
          vColor.g += 0.2; 
      } 
      else if (abs(uEffect - 3.0) < 0.1) { // Silk
          float wave = sin(pos.x * 0.01 + uTime) * 20.0;
          pos.y += wave;
          pos.z += cos(pos.y * 0.01 + uTime) * 20.0;
      }
      else if (abs(uEffect - 5.0) < 0.1) { // Rock
          float r = random(pos.xy) * 5.0;
          pos += r;
      }

      // --- Audio Reactivity ---
      pos = pos * (1.0 + uBass * 0.15); 
      if (uWave > 0.05) {
          float wave = sin(pos.y * 0.02 + uTime * 4.0) * cos(pos.x * 0.02 + uTime * 3.0);
          pos.x += wave * uWave * 10.0; 
      }

      // Restore XY MOD Ripple (Y-axis interaction)
      if (uModY > 0.01) {
          float ripple = sin(pos.x * 0.05 + uTime * 5.0) * cos(pos.z * 0.05 + uTime * 2.0);
          pos.y += ripple * uModY * 30.0; 
      }
      
      vPos = pos;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      float scale = 1.0;
      if(abs(uEffect - 1.0) < 0.1) scale = 2.0; 
      if(abs(uEffect - 3.0) < 0.1) scale = 0.5; 
      
      // Improved point size calculation for better clarity and depth
      float depth = -mvPosition.z;
      float sizeAttenuation = 400.0 / max(depth, 1.0); // Prevent division by zero
      gl_PointSize = size * scale * (1.0 + uBass * 1.2) * sizeAttenuation;
      gl_PointSize = max(gl_PointSize, 2.0); // Minimum size for visibility
      gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShader = `
  uniform vec3 uColorTint;
  uniform float uBass;
  uniform float uEffect; 
  uniform float uStyle; 
  uniform float uPlayColor;
  uniform float uTime;
  uniform float uModX;
  uniform float uModY;

  varying vec3 vColor;
  varying vec3 vPos;
  varying float vAlpha;

  void main() {
      vec2 uv = gl_PointCoord;
      float dist = length(uv - 0.5);
      if (dist > 0.5) discard;

      // Determine the effective color to use (Static Tint or Dynamic Cycle)
      vec3 effectiveTint;
      if (uPlayColor > 0.5) {
          effectiveTint = 0.5 + 0.5 * cos(uTime * 0.5 + vec3(0.0, 2.0, 4.0)); 
          effectiveTint *= 1.5; // Boost brightness for cycle
      } else {
          effectiveTint = uColorTint;
      }

      vec3 finalColor = vColor * effectiveTint;
      
      // XY Mode Brightness Modulation (X-axis)
      if (uModX > 0.0) {
          finalColor *= (0.5 + uModX * 1.5); 
      }

      float alpha = 1.0;

      // --- Material Effects ---
      if (abs(uEffect - 1.0) < 0.1) { // Glass - Enhanced clarity
          float rim = smoothstep(0.4, 0.5, dist);
          float core = 1.0 - smoothstep(0.0, 0.2, dist);
          alpha = 0.4 + rim * 0.4 + core * 0.3; // More visible
          if (uPlayColor <= 0.5) finalColor += vec3(0.5, 0.8, 1.0) * rim; 
      } 
      else if (abs(uEffect - 4.0) < 0.1) { // Metal
          float shine = smoothstep(0.2, 0.3, dist) * smoothstep(0.5, 0.4, dist);
          finalColor = finalColor * 1.5 + vec3(1.0) * shine;
          finalColor = pow(finalColor, vec3(1.2)); 
      }
      else if (abs(uEffect - 5.0) < 0.1) { // Rock
          if(dist > 0.4) alpha = 0.0; 
          finalColor *= 0.6; 
      }

      // --- Style Overrides ---
      if (abs(uStyle - 1.0) < 0.1) { // Ink Wash
          float edge = smoothstep(0.5, 0.0, dist);
          float gray = dot(finalColor, vec3(0.299, 0.587, 0.114));
          if (uPlayColor <= 0.5) { 
              finalColor = mix(vec3(gray), finalColor, 0.8); 
              finalColor *= 0.9; 
          }
          alpha = edge * 0.7; 
      }
      else if (abs(uStyle - 2.0) < 0.1) { // Oil
          finalColor *= 1.8; 
          finalColor = pow(finalColor, vec3(1.5)); 
          float stroke = smoothstep(0.5, 0.45, dist);
          alpha = stroke;
      }
      else if (abs(uStyle - 3.0) < 0.1) { // Forest
          float leaf = smoothstep(0.5, 0.0, dist);
          finalColor = effectiveTint * leaf; 
          alpha = leaf * 0.8;
      }
      else if (abs(uStyle - 4.0) < 0.1) { // Sketch
          if (dist > 0.48) discard;
          finalColor = effectiveTint; 
          alpha = 0.7;
      }
      else if (abs(uStyle - 5.0) < 0.1) { // Cell
          float rim = smoothstep(0.4, 0.5, dist);
          float core = 1.0 - smoothstep(0.0, 0.4, dist);
          finalColor = effectiveTint * core + (effectiveTint * 0.5) * rim;
          alpha = core + rim * 0.5;
      }
      else if (abs(uStyle - 6.0) < 0.1) { // Ocean
          float bubble = smoothstep(0.4, 0.5, dist);
          finalColor = effectiveTint * (1.0 - dist);
          alpha = 0.6 - dist;
      }
      else if (abs(uStyle - 7.0) < 0.1) { // Fire
          float core = exp(-dist * dist * 15.0);
          alpha = core;
          finalColor += effectiveTint * core;
      }
      else {
          // Standard Universe - Enhanced glow for clarity
          float glow = exp(-dist * dist * 12.0); // Sharper falloff
          float core = 1.0 - smoothstep(0.0, 0.3, dist); // Brighter core
          alpha = mix(glow, 1.0, core * 0.5);
      }

      gl_FragColor = vec4(finalColor, alpha);
  }
`;
