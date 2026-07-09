/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ApiErrorCode =
  | "SUPABASE_NOT_CONFIGURED"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "STORAGE_ERROR"
  | "UNKNOWN_ERROR";

export class ApiError extends Error {
  code: ApiErrorCode;
  details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error && typeof error === 'object') {
    const errObj = error as any;
    // Handle Supabase/PostgREST error codes
    if (errObj.code === '42501') {
      return new ApiError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.", error);
    }
    if (errObj.code && typeof errObj.message === 'string') {
      if (errObj.message.toLowerCase().includes('row-level security') || errObj.message.toLowerCase().includes('violates row-level security')) {
        return new ApiError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.", error);
      }
      return new ApiError("DATABASE_ERROR", errObj.message, error);
    }
    if (errObj.message && typeof errObj.message === 'string') {
      if (errObj.message.toLowerCase().includes('row-level security') || errObj.message.toLowerCase().includes('violates row-level security') || errObj.message.toLowerCase().includes('insufficient_privilege')) {
        return new ApiError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.", error);
      }
      return new ApiError("UNKNOWN_ERROR", errObj.message, error);
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('row-level security') || error.message.toLowerCase().includes('violates row-level security') || error.message.toLowerCase().includes('insufficient_privilege') || error.message.includes('42501')) {
      return new ApiError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.", error);
    }
    return new ApiError("UNKNOWN_ERROR", error.message, error);
  }

  return new ApiError("UNKNOWN_ERROR", "Đã xảy ra lỗi không xác định.", error);
}
