import { z } from "zod";
import { uploadConfig } from "@/config/upload";

export const onboardingProfileSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(2, "Last name is required"),
  displayName: z.string().trim().min(3, "Display name must be at least 3 characters"),
  ageRange: z.enum(["13-17", "18-24", "25-34", "35-44", "45+"]),
  hairGoals: z.string().trim().min(20, "Share a bit more about your hair goals"),
  stylePreferences: z
    .array(z.string().trim().min(1))
    .min(1, "Pick at least one style preference")
    .max(5, "Pick up to 5 style preferences"),
});

export const photoCropSchema = z.object({
  panX: z.number().min(-240).max(240),
  panY: z.number().min(-240).max(240),
  zoom: z.number().min(1).max(2.2),
  rotation: z.number().min(-10).max(10),
  viewportWidth: z.number().min(240),
  viewportHeight: z.number().min(320),
  outputWidth: z.number().min(512),
  outputHeight: z.number().min(512),
});

export const photoQualitySchema = z.object({
  faceDetected: z.boolean(),
  centerScore: z.number().min(0).max(1),
  brightnessScore: z.number().min(0).max(255),
  guidance: z.array(z.string()),
});

export const onboardingPhotoSchema = z.object({
  originalDataUrl: z.string().startsWith("data:image/", "Invalid original image"),
  processedDataUrl: z.string().startsWith("data:image/", "Invalid processed image"),
  mimeType: z.enum(uploadConfig.allowedMimeTypes),
  width: z.number().min(300),
  height: z.number().min(300),
  crop: photoCropSchema,
  quality: photoQualitySchema,
});

export const onboardingDraftSchema = z.object({
  version: z.literal(1),
  profile: z.object({
    firstName: z.string().trim().catch(""),
    lastName: z.string().trim().catch(""),
    displayName: z.string().trim().catch(""),
    ageRange: z.enum(["13-17", "18-24", "25-34", "35-44", "45+"]).catch("18-24"),
    hairGoals: z.string().trim().catch(""),
    stylePreferences: z.array(z.string().trim().min(1)).catch([]),
  }),
  photo: onboardingPhotoSchema.nullable(),
  updatedAt: z.string(),
});

export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;
export type OnboardingPhotoInput = z.infer<typeof onboardingPhotoSchema>;
export type OnboardingDraftInput = z.infer<typeof onboardingDraftSchema>;

