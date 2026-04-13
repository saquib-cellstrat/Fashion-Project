import { useState, useEffect, useMemo } from "react";
import { detectHeadPosition, type HeadPosition } from "@/lib/image/face-landmarks";
import type { HairAnchor } from "@/types/editor";

const MAX_ROTATION_DEG = 45;

export function useHairAutoFit(
  baseImage: HTMLImageElement | null,
  hairstyleAnchor: HairAnchor | null,
  imageProps: { x: number; y: number; width: number; height: number } | null,
  overlayImage: HTMLImageElement | null
) {
  const [headPosition, setHeadPosition] = useState<HeadPosition | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const autoFitTransform = useMemo(() => {
    if (!headPosition || !hairstyleAnchor || !imageProps || !overlayImage) {
      return null;
    }

    const baseCenterX = imageProps.x + imageProps.width / 2;
    const baseCenterY = imageProps.y + imageProps.height / 2;

    const foreheadCanvasX = imageProps.x + headPosition.foreheadCenter.x * imageProps.width;
    const foreheadCanvasY = imageProps.y + headPosition.foreheadCenter.y * imageProps.height;

    const faceWidthCanvas = headPosition.faceWidth * imageProps.width;

    const baseOverlayWidth = faceWidthCanvas / hairstyleAnchor.faceWidthRatio;
    const hairRatio = overlayImage.height / overlayImage.width;

    /** Final draw size: independent width/height stretch for PNGs with different aspect ratios. */
    const tw = baseOverlayWidth * hairstyleAnchor.scaleMultiplier * hairstyleAnchor.widthStretch;
    const th = tw * hairRatio * hairstyleAnchor.heightStretch;

    const baseScale = tw / imageProps.width;

    const dxUnrotated = tw * (hairstyleAnchor.faceCenterX - 0.5);
    const dyUnrotated = th * (hairstyleAnchor.foreheadY - 0.5);

    const theta = (headPosition.headTilt * Math.PI) / 180;
    const dxRotated = dxUnrotated * Math.cos(theta) - dyUnrotated * Math.sin(theta);
    const dyRotated = dxUnrotated * Math.sin(theta) + dyUnrotated * Math.cos(theta);

    const targetOverlayCenterX = foreheadCanvasX - dxRotated;
    const targetOverlayCenterY = foreheadCanvasY - dyRotated;

    let offsetX = targetOverlayCenterX - baseCenterX;
    let offsetY = targetOverlayCenterY - baseCenterY;

    offsetX += hairstyleAnchor.nudgeX * imageProps.width;
    offsetY += hairstyleAnchor.nudgeY * imageProps.height;

    const scale = baseScale;
    let rotation = headPosition.headTilt + hairstyleAnchor.rotationOffsetDeg;
    rotation = Math.max(-MAX_ROTATION_DEG, Math.min(MAX_ROTATION_DEG, rotation));

    return { x: offsetX, y: offsetY, scale, rotation };
  }, [headPosition, hairstyleAnchor, imageProps, overlayImage]);

  // Detect landmarks when baseImage changes
  useEffect(() => {
    if (!baseImage) {
      queueMicrotask(() => setHeadPosition(null));
      return;
    }

    let isActive = true;

    const runDetection = async () => {
      setIsDetecting(true);
      try {
        const position = await detectHeadPosition(baseImage);
        if (isActive) {
          setHeadPosition(position);
        }
      } catch (err) {
        console.error("Detection error: ", err);
      }

      if (isActive) {
        setIsDetecting(false);
      }
    };

    void runDetection();

    return () => {
      isActive = false;
    };
  }, [baseImage]);

  return {
    autoFitTransform,
    isDetecting,
    isDetected: !!headPosition,
    fitSource: headPosition?.fitSource ?? null,
  };
}
