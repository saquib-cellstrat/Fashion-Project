import type { HairAnchor } from "@/types/editor";

const STORAGE_KEY = "fashion.editor.hairAnchorOverrides.v1";

/** Per-hairstyle saved anchors (full `HairAnchor` after edits). */
export type HairAnchorOverridesMap = Record<string, HairAnchor>;

export function readHairAnchorOverrides(): HairAnchorOverridesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as HairAnchorOverridesMap;
  } catch {
    return {};
  }
}

export function writeHairAnchorOverrides(map: HairAnchorOverridesMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

export function removeHairAnchorOverrideForId(
  id: string,
  previous: HairAnchorOverridesMap
): HairAnchorOverridesMap {
  if (!(id in previous)) return previous;
  const next = { ...previous };
  delete next[id];
  writeHairAnchorOverrides(next);
  return next;
}
