export const aiModelsConfig = {
  defaultModel: "hairstyle-v1",
  fallbackModel: "hairstyle-v1-lite",
  generationTimeoutMs: 25_000,
  maxConcurrentRequestsPerUser: 2,
} as const;
