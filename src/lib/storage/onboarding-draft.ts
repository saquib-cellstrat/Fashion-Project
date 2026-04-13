import {
  onboardingDraftSchema,
  type OnboardingPhotoInput,
  type OnboardingProfileInput,
} from "@/features/auth/schemas/onboarding.schema";
import type { OnboardingDraft } from "@/features/auth/types/onboarding.types";
import type { EditorSourceProfile } from "@/types/editor";

const STORAGE_KEY = "fashion.onboarding.draft.v1";

const defaultProfile: OnboardingProfileInput = {
  firstName: "",
  lastName: "",
  displayName: "",
  ageRange: "18-24",
  hairGoals: "",
  stylePreferences: [],
};

export function getDefaultOnboardingDraft(): OnboardingDraft {
  return {
    version: 1,
    profile: defaultProfile,
    photo: null,
    updatedAt: new Date().toISOString(),
  };
}

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function readOnboardingDraft(): OnboardingDraft {
  const storage = getStorage();
  if (!storage) return getDefaultOnboardingDraft();
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return getDefaultOnboardingDraft();

  try {
    const parsed = onboardingDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return getDefaultOnboardingDraft();
    return {
      ...parsed.data,
      profile: {
        ...defaultProfile,
        ...parsed.data.profile,
      },
    };
  } catch {
    return getDefaultOnboardingDraft();
  }
}

export function saveOnboardingProfile(profile: OnboardingProfileInput) {
  const draft = readOnboardingDraft();
  persist({
    ...draft,
    profile,
    updatedAt: new Date().toISOString(),
  });
}

export function saveOnboardingPhoto(photo: OnboardingPhotoInput) {
  const draft = readOnboardingDraft();
  persist({
    ...draft,
    photo,
    updatedAt: new Date().toISOString(),
  });
}

export function clearOnboardingDraft() {
  const storage = getStorage();
  storage?.removeItem(STORAGE_KEY);
}

function persist(draft: OnboardingDraft) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function getEditorSourceProfileFromDraft(): EditorSourceProfile | null {
  const draft = readOnboardingDraft();
  if (!draft.photo) return null;

  const { profile, photo } = draft;
  return {
    displayName: profile.displayName,
    fullName: `${profile.firstName} ${profile.lastName}`.trim(),
    imageDataUrl: photo.processedDataUrl,
    originalImageDataUrl: photo.originalDataUrl,
    crop: photo.crop,
    quality: photo.quality,
    createdAt: draft.updatedAt,
  };
}

