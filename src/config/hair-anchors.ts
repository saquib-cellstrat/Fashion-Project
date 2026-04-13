import type { HairAnchor } from "@/types/editor";
import raw from "./hair-anchors.json";

export type { HairAnchor };

export const HAIR_ANCHORS_BY_ID = raw as Record<string, Partial<HairAnchor>>;

/** Median-ish default for uploads and unknown IDs (aligned with precomputed library). */
export const DEFAULT_HAIR_ANCHOR: HairAnchor = {
  foreheadY: 0.05,
  faceCenterX: 0.5,
  faceWidthRatio: 0.52,
  scaleMultiplier: 1,
  rotationOffsetDeg: 0,
  nudgeX: 0,
  nudgeY: 0,
  widthStretch: 1,
  heightStretch: 1,
};

/** Merge JSON / partial anchors with defaults (static JSON may omit tuning fields). */
export function normalizeHairAnchor(partial?: Partial<HairAnchor> | null): HairAnchor {
  return {
    ...DEFAULT_HAIR_ANCHOR,
    ...(partial ?? {}),
  };
}

export function getHairAnchorForTemplateId(id: string): HairAnchor {
  return normalizeHairAnchor(HAIR_ANCHORS_BY_ID[id]);
}

/** Built-in `hair-N` uses JSON defaults; uploads use `DEFAULT_HAIR_ANCHOR`. */
export function getDefaultAnchorForHairId(id: string): HairAnchor {
  if (/^hair-\d+$/.test(id)) return getHairAnchorForTemplateId(id);
  return DEFAULT_HAIR_ANCHOR;
}
