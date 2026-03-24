// middleware/errorHandler.js

const { StatusCodes } = require('http-status-codes');

const errorHandlerMiddleware = (err, req, res, next) => {
  // Set default error properties
  let customError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || 'Something went wrong, please try again later',
  };

  // --- Mongoose/MongoDB Error Handling ---

  // 1. Validation Error (e.g., required field missing)
  if (err.name === 'ValidationError') {
    customError.msg = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ');
    customError.statusCode = 400;
  }

  // 2. Cast Error (e.g., invalid ObjectId format in a URL param)
  if (err.name === 'CastError') {
    customError.msg = `No item found with id: ${err.value}`;
    customError.statusCode = 404;
  }
  
  // 3. Duplicate Key Error (MongoDB code 11000, typically on unique index like email/name)
  if (err.code && err.code === 11000) {
    const field = Object.keys(err.keyValue).join('');
    customError.msg = `Duplicate value entered for ${field} field, please choose another value.`;
    customError.statusCode = 400;
  }

  // Log the full error on the server side for debugging (optional)
  if (customError.statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
      console.error('SERVER ERROR:', err);
  }

  // Send the standardized response
  return res.status(customError.statusCode).json({ msg: customError.msg });
};

module.exports = errorHandlerMiddleware;