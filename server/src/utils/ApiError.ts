/**
 * A typed application error carrying an HTTP status code and a stable machine-readable
 * `code` string, so the frontend can branch on `error.code` rather than parsing English
 * error messages. Never throw a raw Error for anything the client is expected to handle.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string): ApiError {
    return new ApiError(409, 'CONFLICT', message);
  }
  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
