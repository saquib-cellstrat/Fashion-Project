/**
 * hair-color-shader.ts
 *
 * Three.js ShaderMaterial for rendering the hair template onto the 3D scalp mesh
 * with environment-matched luminance transfer (color transfer).
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// GLSL Shaders
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uCurveDepth;

  void main() {
    vUv = uv;
    // Parabolic mapping: x centered ranges from -0.5 to 0.5.
    // 1.0 at center, 0.0 at edges.
    float xCentered = uv.x - 0.5;
    float zOffset = uCurveDepth * (1.0 - 4.0 * xCentered * xCentered);

    vec3 pos = position;
    pos.z += zOffset;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uHairTex;
  uniform float     uSceneLuma;   // [0,1] mean luminance of the scene (face region)
  uniform float     uHairLuma;    // [0,1] mean luminance of the hair template
  uniform float     uOpacity;     // overall alpha multiplier [0,1]
  uniform float     uColorMix;    // how strongly to apply color transfer [0,1]
  uniform vec3      uTintColor;   // optional hex tint (r,g,b in linear [0,1])
  uniform float     uTintStrength;// [0,1] how strongly to apply tint

  varying vec2 vUv;

  // Convert sRGB to linear light for correct luminance math
  vec3 srgbToLinear(vec3 c) {
    return pow(clamp(c, 0.0, 1.0), vec3(2.2));
  }

  // Convert linear back to sRGB for display
  vec3 linearToSrgb(vec3 c) {
    return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
  }

  // Relative luminance BT.709 — named relLuma to avoid collision with GLSL ES 3 built-in
  float relLuma(vec3 linear) {
    return dot(linear, vec3(0.2126, 0.7152, 0.0722));
  }

  void main() {
    vec4 hair = texture2D(uHairTex, vUv);

    // Respect alpha matte — discard fully transparent pixels for occlusion
    if (hair.a < 0.04) discard;

    vec3 hairLinear = srgbToLinear(hair.rgb);
    float hairLum   = max(0.001, relLuma(hairLinear));

    // --- Luminance transfer ---
    float ratio = clamp(uSceneLuma / max(0.001, uHairLuma), 0.35, 3.0);
    vec3 transferred = hairLinear * ratio;

    // Blend original with luminance-adjusted version
    vec3 luma_adjusted = mix(hairLinear, transferred, uColorMix);

    // --- Tint overlay (multiplicative) ---
    vec3 tintLinear = srgbToLinear(uTintColor);
    vec3 tinted = mix(luma_adjusted, luma_adjusted * tintLinear * 1.8, uTintStrength);

    // Back to sRGB for output
    vec3 finalSrgb = linearToSrgb(tinted);

    gl_FragColor = vec4(finalSrgb, hair.a * uOpacity);
  }
`;

// ---------------------------------------------------------------------------
// Uniform types
// ---------------------------------------------------------------------------

export type HairShaderUniforms = {
  uHairTex: { value: THREE.Texture | null };
  uSceneLuma: { value: number };
  uHairLuma: { value: number };
  uOpacity: { value: number };
  uColorMix: { value: number };
  uTintColor: { value: THREE.Color };
  uTintStrength: { value: number };
  uCurveDepth: { value: number };
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createHairShaderMaterial(hairTexture: THREE.Texture): THREE.ShaderMaterial {
  const uniforms: HairShaderUniforms = {
    uHairTex: { value: hairTexture },
    uSceneLuma: { value: 0.5 },
    uHairLuma: { value: 0.4 },
    uOpacity: { value: 1.0 },
    uColorMix: { value: 0.55 },
    uTintColor: { value: new THREE.Color(1, 1, 1) },
    uTintStrength: { value: 0.0 },
    uCurveDepth: { value: 0.0 },
  };

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false, // Hair renders on top; depth occlusion handled by ghost mesh
    depthTest: true,
    blending: THREE.NormalBlending,
  });
}

/** Create an invisible depth-only material for the occlusion ghost mesh */
export function createDepthOnlyMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: true,
    side: THREE.FrontSide,
  });
}

// ---------------------------------------------------------------------------
// CPU-side luminance sampling
// ---------------------------------------------------------------------------

/**
 * Samples the mean luminance of a rectangular region of an HTMLImageElement.
 * Returns a value in [0,1] in linear light space.
 */
export function sampleSceneLuma(
  image: HTMLImageElement,
  faceRegion?: { x: number; y: number; w: number; h: number }
): number {
  const canvas = document.createElement("canvas");
  const sample = 64; // small sample canvas for speed
  canvas.width = sample;
  canvas.height = sample;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0.5;

  if (faceRegion) {
    ctx.drawImage(
      image,
      faceRegion.x,
      faceRegion.y,
      faceRegion.w,
      faceRegion.h,
      0,
      0,
      sample,
      sample
    );
  } else {
    // Sample center third of image (likely contains face)
    const sw = image.naturalWidth / 3;
    const sh = image.naturalHeight / 3;
    ctx.drawImage(image, sw, 0, sw, sh * 2, 0, 0, sample, sample);
  }

  const data = ctx.getImageData(0, 0, sample, sample).data;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a < 0.1) continue;
    // sRGB → linear → BT.709 luminance
    const r = Math.pow(data[i] / 255, 2.2);
    const g = Math.pow(data[i + 1] / 255, 2.2);
    const b = Math.pow(data[i + 2] / 255, 2.2);
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    count++;
  }
  return count > 0 ? sum / count : 0.5;
}

/**
 * Samples the mean luminance of a hair template canvas/image.
 * Ignores pixels with low alpha (transparent background).
 */
export function sampleHairLuma(
  source: HTMLCanvasElement | HTMLImageElement
): number {
  const canvas = document.createElement("canvas");
  const sample = 64;
  canvas.width = sample;
  canvas.height = sample;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0.4;

  ctx.drawImage(source, 0, 0, sample, sample);
  const data = ctx.getImageData(0, 0, sample, sample).data;

  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a < 0.3) continue; // skip background
    const r = Math.pow(data[i] / 255, 2.2);
    const g = Math.pow(data[i + 1] / 255, 2.2);
    const b = Math.pow(data[i + 2] / 255, 2.2);
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    count++;
  }
  return count > 0 ? sum / count : 0.4;
}
