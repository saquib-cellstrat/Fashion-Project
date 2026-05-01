import type { HairCalibrationPoints, NormalizedPoint2, SemanticLandmarkId } from "@/lib/image/face-landmarks";

export type { HairCalibrationPoints, SemanticLandmarkId };

export type EditorSession = {
  id: string;
  sourcePhotoUrl: string;
  selectedTemplateId?: string;
  referenceImageUrl?: string;
  zoom: number;
};

/** Per-hairstyle fit: PNG anchor + optional fine-tuning for auto-fit (persistable / API-ready). */
export type HairAnchor = {
  foreheadY: number;
  faceCenterX: number;
  faceWidthRatio: number;
  /** Multiplies auto-fit scale (1 = unchanged). */
  scaleMultiplier: number;
  /** Added to detected head tilt (degrees). */
  rotationOffsetDeg: number;
  /** Extra offset along letterboxed base width (normalized −1…1 typical). */
  nudgeX: number;
  /** Extra offset along letterboxed base height (normalized −1…1 typical). */
  nudgeY: number;
  /**
   * Multiplies width vs auto-fit (1 = default). Use when this PNG’s canvas is wider/narrower than others.
   */
  widthStretch: number;
  /**
   * Multiplies height vs natural width×aspect (1 = default). Use for taller/shorter art without changing width.
   */
  heightStretch: number;
};

export type ImageColorStatsPayload = {
  meanRgb: [number, number, number];
  stdRgb: [number, number, number];
  meanLuma: number;
  stdLuma: number;
  sampleCount: number;
};

export type HairstyleTemplate = {
  id: string;
  name: string;
  imageUrl: string;
  sourceImageUrl?: string;
  tags: string[];
  category: "Mens" | "Womens" | "Curly" | "Short";
  anchor?: HairAnchor;
  /** Optional per-PNG landmark placement for correspondence-based fit (overrides anchor auto-fit when complete). */
  calibrationPoints?: HairCalibrationPoints;
  /** Optional template-side oval-face 36-point contour in template-local normalized space (0-1). */
  templateOval36?: NormalizedPoint2[];
  /** Optional template-side full-head/bald-cap contour in template-local normalized space (0-1). */
  templateHeadCap?: NormalizedPoint2[];
  calibrationConfidence?: number;
  calibrationQuality?: "high" | "medium" | "low";
  calibrationWarnings?: string[];
  isAutoCalibrated?: boolean;
  colorStats?: ImageColorStatsPayload;
};

export type ColorSwatch = {
  id: string;
  name: string;
  imageUrl: string;
  hex: string;
  group: "natural" | "vivid" | "pastel";
};

export type Variation = {
  id: string;
  label: string;
  thumbnailUrl: string;
};

export type EditorToolId = "style" | "color" | "length" | "fade" | "texture" | "3d";

export type EditorTool = {
  id: EditorToolId;
  label: string;
  icon: string;
};

export type EditorSourceProfile = {
  displayName: string;
  fullName: string;
  imageDataUrl: string;
  originalImageDataUrl: string;
  crop: {
    panX: number;
    panY: number;
    zoom: number;
    rotation: number;
    viewportWidth: number;
    viewportHeight: number;
    outputWidth: number;
    outputHeight: number;
  };
  quality: {
    faceDetected: boolean;
    centerScore: number;
    brightnessScore: number;
    guidance: string[];
  };
  createdAt: string;
};
