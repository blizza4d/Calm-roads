import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface VolumetricCloudsProps {
  sunColor: THREE.Color
  shadowColor: THREE.Color
  opacity: number
  isNight: boolean
  isSunset: boolean
  weather: string
}

// ------------------------------------------------------------------------
// 1. Layer 1: High-Altitude Wispy Cirrus Canopy (Upper Celestial Dome ~2,600m)
// ------------------------------------------------------------------------
const cirrusVertexShader = `
  varying vec3 vWorldPosition;
  varying float vElevation;

  void main() {
    vElevation = position.y;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const cirrusFragmentShader = `
  uniform float uTime;
  uniform vec3 uSunColor;
  uniform vec3 uShadowColor;
  uniform float uOpacity;
  uniform vec3 uSunDir;
  varying vec3 vWorldPosition;
  varying float vElevation;

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.21));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Ethereal high-altitude wind drift with anisotropic streak stretch
    vec2 windOffset = vec2(uTime * 0.003, uTime * 0.0015);
    vec2 p = (vWorldPosition.xz * 0.00028) + windOffset;
    // Anisotropic stretch along wind
    p.x *= 0.45;
    p.y *= 2.2;

    float n1 = noise(p * 3.5);
    float n2 = noise(p * 8.2 + vec2(0.4, 0.7));
    float cirrusDensity = n1 * 0.7 + n2 * 0.3;

    float alpha = smoothstep(0.42, 0.85, cirrusDensity) * 0.38;

    // Horizon fade
    float horizonFade = smoothstep(0.04, 0.40, vElevation / 2600.0);
    alpha *= horizonFade * uOpacity;

    if (alpha < 0.005) discard;

    // Subtle forward scattering
    vec3 dir = normalize(vWorldPosition);
    float sunDot = max(0.0, dot(dir, uSunDir));
    vec3 col = mix(uShadowColor, uSunColor, 0.65);
    col += uSunColor * pow(sunDot, 2.5) * 0.35;

    gl_FragColor = vec4(col, alpha);
  }
`

// ------------------------------------------------------------------------
// 2. Layer 2: Main Stratocumulus / Cumulus Canopy (Mid Celestial Dome ~2,100m)
// ------------------------------------------------------------------------
const cumulusVertexShader = `
  varying vec3 vWorldPosition;
  varying float vElevation;

  void main() {
    vElevation = position.y;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const cumulusFragmentShader = `
  uniform float uTime;
  uniform vec3 uSunColor;
  uniform vec3 uShadowColor;
  uniform float uOpacity;
  uniform float uCoverage;
  uniform vec3 uSunDir;
  varying vec3 vWorldPosition;
  varying float vElevation;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float total = 0.0;
    float amp = 0.52;
    for (int i = 0; i < 4; i++) {
      total += noise(p) * amp;
      p = p * 2.14 + vec2(1.3, 1.7);
      amp *= 0.48;
    }
    return total;
  }

  void main() {
    vec2 windOffset = vec2(uTime * 0.007, uTime * 0.0035);
    vec2 uv = (vWorldPosition.xz * 0.00040) + windOffset;

    float cloudDensity = fbm(uv * 1.5);
    float detail = fbm(uv * 3.6 - windOffset * 0.4);
    cloudDensity = mix(cloudDensity, detail, 0.25);

    float threshold = 1.0 - uCoverage;
    float alpha = smoothstep(threshold, threshold + 0.22, cloudDensity);

    // Horizon fade
    float horizonFade = smoothstep(0.03, 0.36, vElevation / 2100.0);
    alpha *= horizonFade * uOpacity;

    if (alpha < 0.01) discard;

    // Sun directional scattering
    vec3 dirToVertex = normalize(vWorldPosition);
    float sunScattering = max(0.0, dot(dirToVertex, uSunDir));
    vec3 cloudLitColor = mix(uShadowColor, uSunColor, smoothstep(threshold, threshold + 0.32, cloudDensity));
    cloudLitColor += uSunColor * pow(sunScattering, 3.2) * 0.45;

    gl_FragColor = vec4(cloudLitColor, alpha);
  }
`

// ------------------------------------------------------------------------
// 3. Layer 3: Low-Altitude Storm / Mountain Scud & Mist (Lower Dome ~1,500m)
// ------------------------------------------------------------------------
const lowScudVertexShader = `
  varying vec3 vWorldPosition;
  varying float vElevation;

  void main() {
    vElevation = position.y;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const lowScudFragmentShader = `
  uniform float uTime;
  uniform vec3 uSunColor;
  uniform vec3 uShadowColor;
  uniform float uOpacity;
  uniform float uCoverage;
  varying vec3 vWorldPosition;
  varying float vElevation;

  float hash(vec2 p) {
    p = fract(p * vec2(345.67, 789.01));
    p += dot(p, p + 56.78);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Faster, turbulent low-altitude scud drift
    vec2 windOffset = vec2(uTime * 0.014, uTime * 0.007);
    vec2 uv = (vWorldPosition.xz * 0.00065) + windOffset;

    float n1 = noise(uv * 2.2);
    float n2 = noise(uv * 4.8 + vec2(0.5, 0.3));
    float scudDensity = n1 * 0.65 + n2 * 0.35;

    float threshold = 1.0 - uCoverage;
    float alpha = smoothstep(threshold, threshold + 0.28, scudDensity);

    // Horizon fade
    float horizonFade = smoothstep(0.02, 0.32, vElevation / 1500.0);
    alpha *= horizonFade * uOpacity;

    if (alpha < 0.01) discard;

    vec3 scudColor = mix(uShadowColor * 0.75, uSunColor * 0.85, 0.3);
    gl_FragColor = vec4(scudColor, alpha);
  }
`

export function VolumetricClouds({
  sunColor,
  shadowColor,
  opacity,
  isNight,
  isSunset,
  weather,
}: VolumetricCloudsProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  const cirrusMatRef = useRef<THREE.ShaderMaterial>(null)
  const cumulusMatRef = useRef<THREE.ShaderMaterial>(null)
  const lowScudMatRef = useRef<THREE.ShaderMaterial>(null)

  // Cloud coverage modulation based on weather & time-of-day
  const cumulusCoverage = useMemo(() => {
    if (weather === 'rain') return 0.88
    if (weather === 'mist') return 0.76
    if (weather === 'snow') return 0.82
    if (isSunset) return 0.58
    if (isNight) return 0.38
    return 0.46
  }, [weather, isSunset, isNight])

  const scudCoverage = useMemo(() => {
    if (weather === 'rain') return 0.75
    if (weather === 'mist') return 0.65
    if (weather === 'snow') return 0.60
    return 0.18 // Sparse light puffs during clear weather
  }, [weather])

  // Geometries for the 3 celestial dome tiers
  const cirrusDomeGeo = useMemo(() => new THREE.SphereGeometry(2600, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.46), [])
  const cumulusDomeGeo = useMemo(() => new THREE.SphereGeometry(2100, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.44), [])
  const lowScudDomeGeo = useMemo(() => new THREE.SphereGeometry(1500, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.40), [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.set(camera.position.x, camera.position.y * 0.12, camera.position.z)
    }

    const t = state.clock.getElapsedTime()

    // Layer 1: Cirrus
    if (cirrusMatRef.current) {
      cirrusMatRef.current.uniforms.uTime.value = t
      cirrusMatRef.current.uniforms.uSunColor.value.copy(sunColor)
      cirrusMatRef.current.uniforms.uShadowColor.value.copy(shadowColor)
      cirrusMatRef.current.uniforms.uOpacity.value = opacity * 0.85
    }

    // Layer 2: Cumulus
    if (cumulusMatRef.current) {
      cumulusMatRef.current.uniforms.uTime.value = t
      cumulusMatRef.current.uniforms.uSunColor.value.copy(sunColor)
      cumulusMatRef.current.uniforms.uShadowColor.value.copy(shadowColor)
      cumulusMatRef.current.uniforms.uOpacity.value = opacity
      cumulusMatRef.current.uniforms.uCoverage.value = cumulusCoverage
    }

    // Layer 3: Low Scud / Storm Fluff
    if (lowScudMatRef.current) {
      lowScudMatRef.current.uniforms.uTime.value = t
      lowScudMatRef.current.uniforms.uSunColor.value.copy(sunColor)
      lowScudMatRef.current.uniforms.uShadowColor.value.copy(shadowColor)
      lowScudMatRef.current.uniforms.uOpacity.value = weather === 'rain' ? 0.90 : 0.65
      lowScudMatRef.current.uniforms.uCoverage.value = scudCoverage
    }
  })

  return (
    <group ref={groupRef} renderOrder={-5}>
      {/* Tier 1: High-Altitude Cirrus Canopy */}
      <mesh geometry={cirrusDomeGeo}>
        <shaderMaterial
          ref={cirrusMatRef}
          vertexShader={cirrusVertexShader}
          fragmentShader={cirrusFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uSunColor: { value: new THREE.Color().copy(sunColor) },
            uShadowColor: { value: new THREE.Color().copy(shadowColor) },
            uSunDir: { value: new THREE.Vector3(0.5, 0.7, -0.3).normalize() },
            uOpacity: { value: opacity * 0.85 },
          }}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Tier 2: Main Stratocumulus / Cumulus Formations */}
      <mesh geometry={cumulusDomeGeo}>
        <shaderMaterial
          ref={cumulusMatRef}
          vertexShader={cumulusVertexShader}
          fragmentShader={cumulusFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uSunColor: { value: new THREE.Color().copy(sunColor) },
            uShadowColor: { value: new THREE.Color().copy(shadowColor) },
            uSunDir: { value: new THREE.Vector3(0.5, 0.7, -0.3).normalize() },
            uOpacity: { value: opacity },
            uCoverage: { value: cumulusCoverage },
          }}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Tier 3: Low-Altitude Storm Scud & Mist */}
      <mesh geometry={lowScudDomeGeo}>
        <shaderMaterial
          ref={lowScudMatRef}
          vertexShader={lowScudVertexShader}
          fragmentShader={lowScudFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uSunColor: { value: new THREE.Color().copy(sunColor) },
            uShadowColor: { value: new THREE.Color().copy(shadowColor) },
            uOpacity: { value: 0.65 },
            uCoverage: { value: scudCoverage },
          }}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}
