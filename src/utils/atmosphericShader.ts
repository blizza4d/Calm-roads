import * as THREE from 'three'

/**
 * Atmospheric Aerial Perspective & Height-Aware Elevation Fog
 *
 * Injects physically-inspired aerial perspective into Three.js MeshStandardMaterial:
 * 1. Height-Aware Exponential Fog:
 *    Dense misty fog settles into low riverbeds and valleys (Y < 15m), while
 *    high mountain crags and peaks (Y > 55m) remain sharp and crisp above the haze.
 * 2. Forward Solar Mie Scattering:
 *    Looking towards the directional sun produces a warm atmospheric glow
 *    and halo around celestial horizon points.
 * 3. Distance Aerial Desaturation:
 *    Distant geometry gradually softens in contrast and adopts the horizon sky tint.
 */

export interface AtmosphericUniforms {
  uAtmosphericSunDir: { value: THREE.Vector3 }
  uAtmosphericSunColor: { value: THREE.Color }
  uAtmosphericSkyHorizon: { value: THREE.Color }
  uHeightFogBase: { value: number }
  uHeightFogFalloff: { value: number }
  uAtmosphericScatteringStrength: { value: number }
  uLightningFlash: { value: number }
}

export const globalAtmosphericUniforms: AtmosphericUniforms = {
  uAtmosphericSunDir: { value: new THREE.Vector3(0.5, 0.7, -0.3).normalize() },
  uAtmosphericSunColor: { value: new THREE.Color('#fffef8') },
  uAtmosphericSkyHorizon: { value: new THREE.Color('#bae6fd') },
  uHeightFogBase: { value: 6.0 },
  uHeightFogFalloff: { value: 0.028 },
  uAtmosphericScatteringStrength: { value: 0.45 },
  uLightningFlash: { value: 0.0 },
}

export function updateAtmosphericUniforms(
  sunDir: [number, number, number],
  sunColor: THREE.Color,
  skyHorizon: THREE.Color,
  scatteringStrength: number = 0.45,
  lightningFlash: number = 0.0
) {
  globalAtmosphericUniforms.uAtmosphericSunDir.value.set(sunDir[0], sunDir[1], sunDir[2]).normalize()
  globalAtmosphericUniforms.uAtmosphericSunColor.value.copy(sunColor)
  globalAtmosphericUniforms.uAtmosphericSkyHorizon.value.copy(skyHorizon)
  globalAtmosphericUniforms.uAtmosphericScatteringStrength.value = scatteringStrength
  globalAtmosphericUniforms.uLightningFlash.value = lightningFlash
}

/**
 * Material onBeforeCompile callback that augments any Three.js standard material
 * with world-position passing and height-aware atmospheric fog rendering.
 */
export function applyAtmosphericMaterialExtension(
  shader: THREE.WebGLProgramParametersWithUniforms
) {
  // Bind global uniforms
  shader.uniforms.uAtmosphericSunDir = globalAtmosphericUniforms.uAtmosphericSunDir
  shader.uniforms.uAtmosphericSunColor = globalAtmosphericUniforms.uAtmosphericSunColor
  shader.uniforms.uAtmosphericSkyHorizon = globalAtmosphericUniforms.uAtmosphericSkyHorizon
  shader.uniforms.uHeightFogBase = globalAtmosphericUniforms.uHeightFogBase
  shader.uniforms.uHeightFogFalloff = globalAtmosphericUniforms.uHeightFogFalloff
  shader.uniforms.uAtmosphericScatteringStrength = globalAtmosphericUniforms.uAtmosphericScatteringStrength
  shader.uniforms.uLightningFlash = globalAtmosphericUniforms.uLightningFlash

  // 1. Vertex Shader: compute and export world position
  if (!shader.vertexShader.includes('varying vec3 vAtmosphericWorldPos;')) {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vAtmosphericWorldPos;`
    )
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vAtmosphericWorldPos = worldPosition.xyz;`
    )
  }

  // 2. Fragment Shader: Inject Atmospheric Scattering & Elevation Fog
  if (!shader.fragmentShader.includes('varying vec3 vAtmosphericWorldPos;')) {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vAtmosphericWorldPos;
       uniform vec3 uAtmosphericSunDir;
       uniform vec3 uAtmosphericSunColor;
       uniform vec3 uAtmosphericSkyHorizon;
       uniform float uHeightFogBase;
       uniform float uHeightFogFalloff;
       uniform float uAtmosphericScatteringStrength;
       uniform float uLightningFlash;`
    )
  }

  // Replace standard fog_fragment with height-aware aerial perspective
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <fog_fragment>',
    `#ifdef USE_FOG
       #ifdef FOG_EXP2
         float baseFogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
       #else
         float baseFogFactor = smoothstep( fogNear, fogFar, vFogDepth );
       #endif

       // 1. Elevation Falloff: Dense fog in valleys, clear mountain summits
       float altDelta = max(0.0, vAtmosphericWorldPos.y - uHeightFogBase);
       float heightMultiplier = exp( - altDelta * uHeightFogFalloff );
       float effectiveFogFactor = clamp(baseFogFactor * (0.35 + 0.65 * heightMultiplier), 0.0, 1.0);

       // 2. Forward Sun Mie Scattering in Atmosphere
       vec3 viewRay = normalize(vAtmosphericWorldPos - cameraPosition);
       float sunAlignment = max(0.0, dot(viewRay, uAtmosphericSunDir));
       float forwardScattering = pow(sunAlignment, 3.8) * uAtmosphericScatteringStrength;
       vec3 scatteredFogColor = mix(fogColor, uAtmosphericSunColor, forwardScattering);

       // 3. Lightning flash sky illumination
       if (uLightningFlash > 0.01) {
         scatteredFogColor = mix(scatteredFogColor, vec3(0.85, 0.92, 1.0), uLightningFlash * 0.75);
         gl_FragColor.rgb += vec3(0.2, 0.25, 0.35) * uLightningFlash;
       }

       // 4. Distance aerial desaturation towards horizon sky tint
       float distRatio = clamp(vFogDepth / 1600.0, 0.0, 1.0);
       vec3 atmosphericBlendColor = mix(scatteredFogColor, uAtmosphericSkyHorizon, distRatio * 0.4);

       gl_FragColor.rgb = mix( gl_FragColor.rgb, atmosphericBlendColor, effectiveFogFactor );
     #endif`
  )
}
