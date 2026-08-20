const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details || null;

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = {
      errors: Object.values(err.errors).map((fieldError) => ({
        field: fieldError.path,
        message: fieldError.message,
      })),
    };
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate value conflict";
    details = { duplicateKey: err.keyValue };
  }

  const payload = {
    success: false,
    message,
    requestId: req?.requestId || null,
  };

  if (details) {
    payload.details = details;
  }

  if (process.env.NODE_ENV !== "production" && err.stack) {
    payload.stack = err.stack;
  }

  logger.reqError(req, "api_error", {
    statusCode,
    message,
    details,
    errorName: err.name,
  });

  res.status(statusCode).json(payload);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
