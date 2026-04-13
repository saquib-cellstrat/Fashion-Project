export const uploadConfig = {
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxFileSizeMb: 10,
  requireFrontalFace: true,
  preferredOrientation: "portrait",
} as const;
