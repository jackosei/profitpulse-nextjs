/**
 * Client helpers for /api/keys — per-pulse API keys for the MT5 sync EA.
 */

import { getFirebaseToken } from "@/services/firebase/authService";

export interface ApiKeyInfo {
  prefix: string;
  label: string;
  createdAt: { _seconds?: number; seconds?: number } | null;
  lastUsedAt: { _seconds?: number; seconds?: number } | null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getFirebaseToken();
  if (!token) throw new Error("Not authenticated");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/** Create (or rotate) the pulse's API key. Returns the raw key — shown once. */
export async function createPulseApiKey(
  pulseFirestoreId: string,
): Promise<{ key: string; prefix: string }> {
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ pulseFirestoreId, label: "MT5 EA" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to create API key");
  return data.data;
}

/** Metadata about the pulse's active key (never the key itself). */
export async function getPulseApiKey(
  pulseFirestoreId: string,
): Promise<ApiKeyInfo | null> {
  const res = await fetch(
    `/api/keys?pulseFirestoreId=${encodeURIComponent(pulseFirestoreId)}`,
    { headers: await authHeaders() },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to fetch API key");
  return data.data.key ?? null;
}

/** Revoke the pulse's key(s) — disconnects the EA. */
export async function revokePulseApiKey(
  pulseFirestoreId: string,
): Promise<void> {
  const res = await fetch("/api/keys", {
    method: "DELETE",
    headers: await authHeaders(),
    body: JSON.stringify({ pulseFirestoreId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to revoke API key");
}
