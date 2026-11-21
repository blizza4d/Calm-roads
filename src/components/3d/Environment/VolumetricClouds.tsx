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

// Procedural Multi-Layered Atmospheric Cloud Canopy Shader
// Uses dual-octave smooth procedural fBm noise to render volumetric-like cloud formations
// with light absorption, silver linings, and golden-hour rim scattering
const cloudVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vElevation;

  void main() {
    vUv = uv;
    vElevation = position.y;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const cloudFragmentShader = `
  uniform float uTime;
  uniform vec3 uSunColor;
  uniform vec3 uShadowColor;
  uniform float uOpacity;
  uniform float uCoverage;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vElevation;

  // Optimized pseudo-fractal noise
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
    // Gentle continuous wind drift
    vec2 windOffset = vec2(uTime * 0.008, uTime * 0.004);
    vec2 uv = (vWorldPosition.xz * 0.00042) + windOffset;

    float cloudDensity = fbm(uv * 1.6);
    float detail = fbm(uv * 3.8 - windOffset * 0.5);
    cloudDensity = mix(cloudDensity, detail, 0.25);

    // Dynamic coverage threshold
    float threshold = 1.0 - uCoverage;
    float alpha = smoothstep(threshold, threshold + 0.24, cloudDensity);

    // Horizon fade: smoothly blend into distant horizon fog
    float horizonFade = smoothstep(0.02, 0.35, vElevation / 2100.0);
    alpha *= horizonFade * uOpacity;

    if (alpha < 0.01) discard;

    // Sun directional scattering: clouds illuminated towards the sun get brilliant rim scattering
    vec3 dirToVertex = normalize(vWorldPosition);
    float sunScattering = max(0.0, dot(dirToVertex, uSunDir));
    vec3 cloudLitColor = mix(uShadowColor, uSunColor, smoothstep(threshold, threshold + 0.32, cloudDensity));
    cloudLitColor += uSunColor * pow(sunScattering, 3.2) * 0.45;

    gl_FragColor = vec4(cloudLitColor, alpha);
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
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Cloud coverage modulation based on weather & time-of-day
  const coverage = useMemo(() => {
    if (weather === 'rain') return 0.88
    if (weather === 'mist') return 0.78
    if (weather === 'snow') return 0.82
    if (isSunset) return 0.58
    if (isNight) return 0.38
    return 0.48
  }, [weather, isSunset, isNight])

  // Upper atmospheric celestial dome spanning radius 2,100m
  // thetaLength = Math.PI * 0.45 ensures dome only covers upper sky down to ~9 degrees above horizon
  const cloudDomeGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(2100, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.44)
    return geo
  }, [])

  useFrame((state) => {
    // Center the cloud canopy above the player camera
    if (meshRef.current) {
      meshRef.current.position.set(camera.position.x, camera.position.y * 0.15, camera.position.z)
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
      materialRef.current.uniforms.uSunColor.value.copy(sunColor)
      materialRef.current.uniforms.uShadowColor.value.copy(shadowColor)
      materialRef.current.uniforms.uOpacity.value = opacity
      materialRef.current.uniforms.uCoverage.value = coverage
    }
  })

  return (
    <mesh ref={meshRef} geometry={cloudDomeGeo} renderOrder={-5}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uSunColor: { value: new THREE.Color().copy(sunColor) },
          uShadowColor: { value: new THREE.Color().copy(shadowColor) },
          uSunDir: { value: new THREE.Vector3(0.5, 0.7, -0.3).normalize() },
          uOpacity: { value: opacity },
          uCoverage: { value: coverage },
        }}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
