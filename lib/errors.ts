export type ErrorCode = "INVALID_PARAMS" | "NOT_FOUND" | "UPSTREAM_ERROR" | "UPSTREAM_TIMEOUT";

export class ApiError extends Error {
  status: number;
  code: ErrorCode;
  retryable: boolean;

  constructor(status: number, code: ErrorCode, message: string, retryable: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export function invalid(message: string) {
  return new ApiError(400, "INVALID_PARAMS", message, false);
}

export function notFound(message = "没有找到这部影片") {
  return new ApiError(404, "NOT_FOUND", message, false);
}

export function upstream(message = "片源暂时不可用") {
  return new ApiError(502, "UPSTREAM_ERROR", message, true);
}

export function upstreamTimeout(message = "片源响应超时") {
  return new ApiError(504, "UPSTREAM_TIMEOUT", message, true);
}

export function asApiError(error: unknown) {
  if (error instanceof ApiError) return error;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  if (name === "TimeoutError" || /timeout|timed out|aborted/i.test(message)) {
    return upstreamTimeout();
  }
  return upstream();
}

export function errorBody(error: ApiError) {
  return {
    ok: false as const,
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    },
  };
}
