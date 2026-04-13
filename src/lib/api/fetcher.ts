import { ApiError } from "@/lib/api/errors";

export async function fetcher<TData>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);

  if (!response.ok) {
    const details = await response.text().catch(() => undefined);
    throw new ApiError("API request failed", response.status, details);
  }

  return (await response.json()) as TData;
}
