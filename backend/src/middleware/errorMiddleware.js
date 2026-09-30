/**
 * Global Error Handling Middleware
 * Prevents information disclosure (stack traces, SQL details, internal file paths)
 * while returning clean, normalized JSON responses.
 */

exports.errorHandler = (err, req, res, next) => {
  // Always log internal error details for server-side debugging
  console.error('[Application Error]:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId || null,
  });

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  // Safe client error message
  let clientMessage = 'An unexpected server error occurred. Please try again later.';

  // If the error explicitly marked as operational / safe
  if (err.isOperational && err.message) {
    clientMessage = err.message;
  } else if (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 429) {
    clientMessage = err.message || clientMessage;
  } else if (process.env.NODE_ENV !== 'production') {
    // In local development, allow message for easier debugging
    clientMessage = err.message;
  }

  // Prevent CORS or header issues by ensuring JSON headers
  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(process.env.NODE_ENV !== 'production' && { errorName: err.name }),
  });
};
