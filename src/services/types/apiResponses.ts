/**
 * Standardized API response types for consistent data handling across the app
 */

// Base response type with common properties
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  loading?: boolean;
}

// Common error codes for the application
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  DUPLICATE_ERROR = 'DUPLICATE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

// Helper functions to create standardized responses
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

export function createErrorResponse<T = undefined>(
  code: ErrorCode | string, 
  message: string, 
  details?: unknown
): ApiResponse<T> {
  return {
    success: false,
    error: {
      code: code,
      message: message,
      details
    }
  };
}

// Type for paginated results
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    hasMore: boolean;
    lastCursor?: string;
    total?: number;
  };
}

// Create paginated response helper
export function createPaginatedResponse<T>(
  data: T[],
  hasMore: boolean,
  lastCursor?: string,
  total?: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: {
      hasMore,
      lastCursor,
      total
    }
  };
} 