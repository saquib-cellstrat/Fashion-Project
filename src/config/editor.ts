export const editorConfig = {
  defaultZoom: 1,
  minZoom: 0.5,
  maxZoom: 2.5,
  enableUndoRedo: true,
  enableRealtimePreview: true,
} as const;

export {
  DEFAULT_HAIR_ANCHOR,
  getDefaultAnchorForHairId,
  getHairAnchorForTemplateId,
  normalizeHairAnchor,
} from "./hair-anchors";
