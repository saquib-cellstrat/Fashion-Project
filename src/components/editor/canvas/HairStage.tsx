"use client";

/**
 * HairStage.tsx — v2 (Plane-based approach)
 *
 * Renders the hair template as a full-coverage textured plane positioned
 * and rotated from MediaPipe face landmarks. This replaces the broken
 * scalp sub-mesh approach which produced only tiny patches.
 *
 * Architecture:
 *  Layer 1 (renderOrder 1): Depth-only full 468-vert face mesh → writes Z for occlusion
 *  Layer 2 (renderOrder 2): PlaneGeometry sized to face bounding box + head rotation
 *                            → shows full hair PNG with GLSL color-transfer
 */

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { FaceMeshData } from "@/lib/3d/useFaceMesh";
import type { FaceMeshTopology } from "@/lib/3d/face-mesh-topology";
import { buildIndexArray } from "@/lib/3d/face-mesh-topology";
import { buildFullMeshPositions } from "@/lib/3d/hair-uv-mapping";
import {
  createHairShaderMaterial,
  createDepthOnlyMaterial,
  sampleSceneLuma,
  sampleHairLuma,
} from "@/lib/3d/hair-color-shader";
import { SEMANTIC_LANDMARK_INDICES } from "@/lib/image/face-landmarks";
import type { SemanticLandmarkId, HairCalibrationPoints } from "@/lib/image/face-landmarks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HairStageProps = {
  baseImage: HTMLImageElement | null;
  hairImage: HTMLImageElement | null;
  faceMeshData: FaceMeshData;
  topology: FaceMeshTopology;
  imgProps: { x: number; y: number; width: number; height: number };
  canvasWidth: number;
  canvasHeight: number;
  opacity: number;
  tintHex?: string | null;
  fitRect: { x: number; y: number; width: number; height: number; rotation: number };
  calibrationPoints?: HairCalibrationPoints;
};

// ---------------------------------------------------------------------------
// Inner scene (runs inside R3F Canvas context)
// ---------------------------------------------------------------------------

function HairScene({
  baseImage,
  hairImage,
  faceMeshData,
  topology,
  imgProps,
  canvasWidth,
  canvasHeight,
  opacity,
  tintHex,
  fitRect,
  calibrationPoints,
}: HairStageProps) {
  // ── Texture ────────────────────────────────────────────────────────────────
  const hairTexture = useMemo(() => {
    if (!hairImage) return null;
    const tex = new THREE.Texture(hairImage);
    tex.needsUpdate = true;
    tex.flipY = true; // Three.js bottom-up vs HTML top-down
    return tex;
  }, [hairImage]);

  // ── Shader material (hair plane) ───────────────────────────────────────────
  const shaderMat = useMemo(() => {
    if (!hairTexture) return null;
    return createHairShaderMaterial(hairTexture);
  }, [hairTexture]);

  // ── Depth-only material (full face occlusion) ──────────────────────────────
  const depthMat = useMemo(() => createDepthOnlyMaterial(), []);

  // ── Geometry: full 468-vert face mesh for depth pass ──────────────────────
  const fullGeoRef = useRef(new THREE.BufferGeometry());
  const fullIndexArray = useMemo(
    () => buildIndexArray(topology.triangles),
    [topology]
  );

  useEffect(() => {
    fullGeoRef.current.setIndex(
      new THREE.BufferAttribute(fullIndexArray, 1)
    );
    return () => {
      fullGeoRef.current.dispose();
    };
  }, [fullIndexArray]);

  // ── Mesh refs ──────────────────────────────────────────────────────────────
  const hairMeshRef = useRef<THREE.Mesh>(null!);
  const fullMeshRef = useRef<THREE.Mesh>(null!);

  // ── Luminance sample (once per image change) ───────────────────────────────
  useEffect(() => {
    if (!shaderMat) return;
    shaderMat.uniforms.uSceneLuma.value = baseImage
      ? sampleSceneLuma(baseImage)
      : 0.5;
    shaderMat.uniforms.uHairLuma.value = hairImage
      ? sampleHairLuma(hairImage)
      : 0.4;
    shaderMat.needsUpdate = true;
  }, [baseImage, hairImage, shaderMat]);

  // ── Opacity uniform ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shaderMat) return;
    shaderMat.uniforms.uOpacity.value = opacity;
    shaderMat.needsUpdate = true;
  }, [opacity, shaderMat]);

  // ── Tint uniform ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shaderMat) return;
    if (tintHex) {
      shaderMat.uniforms.uTintColor.value.set(tintHex);
      shaderMat.uniforms.uTintStrength.value = 0.45;
    } else {
      shaderMat.uniforms.uTintStrength.value = 0.0;
    }
    shaderMat.needsUpdate = true;
  }, [tintHex, shaderMat]);

  // ── Per-frame update ───────────────────────────────────────────────────────
  useFrame(() => {
    const { detected, landmarks, transformMatrix } = faceMeshData;
    if (!detected || landmarks.length < 400) return;

    // ── 1) Update depth-only full-face mesh ──────────────────────────────
    const fullPositions = buildFullMeshPositions(
      landmarks,
      canvasWidth,
      canvasHeight,
      imgProps
    );
    const fullGeo = fullGeoRef.current;
    const existingPos = fullGeo.getAttribute(
      "position"
    ) as THREE.BufferAttribute | undefined;

    if (
      existingPos &&
      existingPos.array.length === fullPositions.length
    ) {
      (existingPos.array as Float32Array).set(fullPositions);
      existingPos.needsUpdate = true;
    } else {
      fullGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(fullPositions, 3)
      );
    }
    fullGeo.computeBoundingSphere();

    // ── 2) Position & size the hair plane from exact 2D calibrated fitRect ────────────
    const threeX = fitRect.x - canvasWidth / 2;
    const threeY = -(fitRect.y - canvasHeight / 2);

    // Anchor the back of the cylinder slightly behind the ears for Z-occlusion.
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];
    const avgEarZ = leftEar && rightEar
      ? -(((leftEar.z ?? 0) + (rightEar.z ?? 0)) / 2) * imgProps.width * 0.15
      : 0;

    const hairMesh = hairMeshRef.current;
    if (hairMesh) {
      hairMesh.position.set(threeX, threeY, avgEarZ - 10);
      hairMesh.scale.set(fitRect.width, fitRect.height, 1);
      // Three.js positive rotation is CCW around Z axis, Konva is CW.
      hairMesh.rotation.set(0, 0, -fitRect.rotation * (Math.PI / 180));
    }



    // Apply volumetric curvature depth. 35% of width forms a nice half-head arc.
    if (shaderMat) {
      shaderMat.uniforms.uCurveDepth.value = fitRect.width * 0.35;
    }
  });

  if (!faceMeshData.detected || !shaderMat || !hairTexture) return null;

  return (
    <>
      {/* Pass 1: Invisible depth-only full face mesh → Z-buffer occlusion */}
      <mesh
        ref={fullMeshRef}
        geometry={fullGeoRef.current}
        material={depthMat}
        renderOrder={1}
      />

      {/* Pass 2: Hair plane — unit PlaneGeometry scaled each frame */}
      {/* Segmented (16x4) so the vertex shader can curve it smoothly */}
      <mesh ref={hairMeshRef} renderOrder={2} frustumCulled={false}>
        <planeGeometry args={[1, 1, 16, 4]} />
        <primitive object={shaderMat} attach="material" />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------------------
// Orthographic camera setup
// ---------------------------------------------------------------------------

function OrthoSetup({
  canvasWidth,
  canvasHeight,
}: {
  canvasWidth: number;
  canvasHeight: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.left   = -canvasWidth  / 2;
      camera.right  =  canvasWidth  / 2;
      camera.top    =  canvasHeight / 2;
      camera.bottom = -canvasHeight / 2;
      camera.near   = 0.1;
      camera.far    = 5000;
      camera.position.set(0, 0, 1000);
      camera.updateProjectionMatrix();
    }
  }, [canvasWidth, canvasHeight, camera]);

  return null;
}

// ---------------------------------------------------------------------------
// HairStage — public component
// ---------------------------------------------------------------------------

export function HairStage(props: HairStageProps) {
  return (
    <Canvas
      orthographic
      camera={{
        left:   -props.canvasWidth  / 2,
        right:   props.canvasWidth  / 2,
        top:     props.canvasHeight / 2,
        bottom: -props.canvasHeight / 2,
        near: 0.1,
        far: 5000,
        position: [0, 0, 1000],
      }}
      style={{ position: "absolute", inset: 0 }}
      gl={{
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        preserveDrawingBuffer: true, // required for toDataURL on export
      }}
      onCreated={({ gl }) => {
        gl.setClearAlpha(0); // transparent background
      }}
    >
      <OrthoSetup
        canvasWidth={props.canvasWidth}
        canvasHeight={props.canvasHeight}
      />
      <HairScene {...props} />
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Export: composite Konva base photo + R3F hair overlay → PNG data URL
// ---------------------------------------------------------------------------

export function compositeCanvasExport(
  konvaCanvas: HTMLCanvasElement,
  r3fGlElement: HTMLCanvasElement
): string {
  const out = document.createElement("canvas");
  out.width  = konvaCanvas.width;
  out.height = konvaCanvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) return konvaCanvas.toDataURL("image/png");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);

  // Draw Konva base photo
  ctx.drawImage(konvaCanvas, 0, 0);

  // Draw Three.js hair overlay scaled to match
  ctx.drawImage(
    r3fGlElement,
    0, 0, r3fGlElement.width, r3fGlElement.height,
    0, 0, out.width, out.height
  );

  return out.toDataURL("image/png");
}
