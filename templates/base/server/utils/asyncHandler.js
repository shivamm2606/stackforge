// Wraps an async route handler and forwards any unhandled error to Express's
// next(err) — which is then caught by the global error handler in index.js.
// Eliminates repetitive try/catch boilerplate in every controller function.
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
