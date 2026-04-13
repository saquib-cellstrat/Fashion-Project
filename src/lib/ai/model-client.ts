export type GenerateHairstyleInput = {
  userImageUrl: string;
  referenceImageUrl?: string;
  templateId?: string;
};

export async function generateHairstyle(input: GenerateHairstyleInput) {
  return {
    jobId: "pending",
    ...input,
  };
}
