import type { HairCalibrationPoints } from "@/lib/image/face-landmarks";

const STORAGE_KEY = "fashion.editor.hairCalibrationOverrides.v1";

export type HairCalibrationOverride = {
  points: HairCalibrationPoints;
  confidence?: number;
  quality?: "high" | "medium" | "low";
  warnings?: string[];
  isAutoCalibrated?: boolean;
};

export type HairCalibrationOverridesMap = Record<string, HairCalibrationOverride>;

function isPoint(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.x === "number" && typeof v.y === "number";
}

function isLegacyPointsMap(value: unknown): value is HairCalibrationPoints {
  if (!value || typeof value !== "object") return false;
  for (const item of Object.values(value as Record<string, unknown>)) {
    if (!isPoint(item)) return false;
  }
  return true;
}

function normalizeOverride(value: unknown): HairCalibrationOverride | null {
  if (!value || typeof value !== "object") return null;

  const entry = value as Record<string, unknown>;
  if (isLegacyPointsMap(entry)) {
    return { points: entry as HairCalibrationPoints };
  }

  if (!isLegacyPointsMap(entry.points)) return null;

  return {
    points: entry.points,
    confidence: typeof entry.confidence === "number" ? entry.confidence : undefined,
    quality:
      entry.quality === "high" || entry.quality === "medium" || entry.quality === "low"
        ? entry.quality
        : undefined,
    warnings: Array.isArray(entry.warnings)
      ? entry.warnings.filter((item): item is string => typeof item === "string")
      : undefined,
    isAutoCalibrated: typeof entry.isAutoCalibrated === "boolean" ? entry.isAutoCalibrated : undefined,
  };
}

export function readHairCalibrationOverrides(): HairCalibrationOverridesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const normalized: HairCalibrationOverridesMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const override = normalizeOverride(value);
      if (override) {
        normalized[id] = override;
      }
    }
    return normalized;
  } catch {
    return {};
  }
}

export function writeHairCalibrationOverrides(map: HairCalibrationOverridesMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function removeHairCalibrationOverrideForId(id: string, previous: HairCalibrationOverridesMap): void {
  if (!(id in previous)) return;
  const next = { ...previous };
  delete next[id];
  writeHairCalibrationOverrides(next);
}
