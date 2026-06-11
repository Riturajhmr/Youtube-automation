export interface ApiError {
  error: string;
  detail: string;
  code: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
