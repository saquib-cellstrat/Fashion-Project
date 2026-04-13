const requiredServerEnv = [] as const;

export function getRequiredServerEnv() {
  return requiredServerEnv.reduce<Record<string, string>>((acc, key) => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    acc[key] = value;
    return acc;
  }, {});
}
