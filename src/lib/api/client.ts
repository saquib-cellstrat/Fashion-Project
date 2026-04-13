import { fetcher } from "@/lib/api/fetcher";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function apiClient<TData>(path: string, init?: RequestInit) {
  const url = API_BASE_URL ? new URL(path, API_BASE_URL) : path;
  return fetcher<TData>(url, init);
}
