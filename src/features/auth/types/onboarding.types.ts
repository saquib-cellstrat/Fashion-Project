export type OnboardingProfileDraft = {
  firstName: string;
  lastName: string;
  displayName: string;
  ageRange: "13-17" | "18-24" | "25-34" | "35-44" | "45+";
  hairGoals: string;
  stylePreferences: string[];
};

export type PhotoCropDraft = {
  panX: number;
  panY: number;
  zoom: number;
  rotation: number;
  viewportWidth: number;
  viewportHeight: number;
  outputWidth: number;
  outputHeight: number;
};

export type PhotoQualityDraft = {
  faceDetected: boolean;
  centerScore: number;
  brightnessScore: number;
  guidance: string[];
};

export type OnboardingPhotoDraft = {
  originalDataUrl: string;
  processedDataUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  crop: PhotoCropDraft;
  quality: PhotoQualityDraft;
};

export type OnboardingDraft = {
  version: 1;
  profile: OnboardingProfileDraft;
  photo: OnboardingPhotoDraft | null;
  updatedAt: string;
};

