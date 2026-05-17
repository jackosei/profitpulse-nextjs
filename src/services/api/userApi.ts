import { UserProfile } from "@/types/user";
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "../types/apiResponses";
import { getFirebaseToken } from "../firebase/authService";

/**
 * Client wrapper around the server-side /api/users route.
 *
 * All profile reads/writes are token-verified server-side and the user's
 * role is enforced by the server (never client-settable). The `userId`
 * arguments are kept for call-site compatibility but the server always
 * derives identity from the verified Firebase ID token.
 */
async function authedFetch(
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Promise<Response | null> {
  const token = await getFirebaseToken();
  if (!token) return null;
  return fetch("/api/users", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export async function getUserProfile(
  _userId: string,
): Promise<ApiResponse<UserProfile>> {
  void _userId;
  try {
    const res = await authedFetch("GET");
    if (!res) {
      return createErrorResponse(ErrorCode.UNAUTHORIZED, "Not authenticated");
    }
    if (res.status === 404) {
      return createErrorResponse(ErrorCode.NOT_FOUND, "User profile not found");
    }
    if (!res.ok) {
      return createErrorResponse(ErrorCode.SERVER_ERROR, "Failed to get user profile");
    }
    const { profile } = await res.json();
    return createSuccessResponse(profile as UserProfile);
  } catch (error) {
    return createErrorResponse(ErrorCode.SERVER_ERROR, "Failed to get user profile", {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function createUserProfile(
  _userId: string,
  email: string,
  displayName: string | null,
): Promise<ApiResponse<UserProfile>> {
  void _userId;
  try {
    const res = await authedFetch("POST", { email, displayName });
    if (!res) {
      return createErrorResponse(ErrorCode.UNAUTHORIZED, "Not authenticated");
    }
    if (!res.ok) {
      return createErrorResponse(ErrorCode.SERVER_ERROR, "Failed to create user profile");
    }
    const { profile } = await res.json();
    return createSuccessResponse(profile as UserProfile);
  } catch (error) {
    return createErrorResponse(ErrorCode.SERVER_ERROR, "Failed to create user profile", {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function updateUserProfile(
  _userId: string,
  data: Partial<Pick<UserProfile, "displayName">>,
): Promise<ApiResponse<UserProfile>> {
  void _userId;
  try {
    const res = await authedFetch("PATCH", { displayName: data.displayName });
    if (!res) {
      return createErrorResponse(ErrorCode.UNAUTHORIZED, "Not authenticated");
    }
    if (!res.ok) {
      return createErrorResponse(ErrorCode.SERVER_ERROR, "Failed to update user profile");
    }
    const { profile } = await res.json();
    return createSuccessResponse(profile as UserProfile);
  } catch (error) {
    return createErrorResponse(ErrorCode.SERVER_ERROR, "Failed to update user profile", {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function isUserAdmin(
  userId: string,
): Promise<ApiResponse<boolean>> {
  const profile = await getUserProfile(userId);
  if (!profile.success || !profile.data) {
    return createErrorResponse(ErrorCode.NOT_FOUND, "User profile not found");
  }
  return createSuccessResponse(profile.data.role === "admin");
}
