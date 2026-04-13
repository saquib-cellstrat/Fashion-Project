import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
  NEXT_PUBLIC_DEFAULT_EDITOR_ZOOM: z.coerce.number().positive().default(1),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_MAX_UPLOAD_MB: process.env.NEXT_PUBLIC_MAX_UPLOAD_MB,
  NEXT_PUBLIC_DEFAULT_EDITOR_ZOOM: process.env.NEXT_PUBLIC_DEFAULT_EDITOR_ZOOM,
});
