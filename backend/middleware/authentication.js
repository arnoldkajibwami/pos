// middleware/authentication.js

const { isTokenValid } = require('../utils/jwt');
const { USER_ROLES } = require('../utils/constants');

// Custom Error Class (You should create a separate custom-errors file for production)
class UnauthenticatedError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 401;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 403;
  }
}

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    throw new UnauthenticatedError('Authentication Invalid: No token provided');
  }
  const token = authHeader.split(' ')[1];

  try {
    const { userId, name, role } = isTokenValid(token);
    req.user = { userId, name, role };
    next();
  } catch (error) {
    throw new UnauthenticatedError('Authentication Invalid: Token invalid or expired');
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedError(
        'Unauthorized to access this route'
      );
    }
    next();
  };
};

module.exports = {
  authenticateUser,
  authorizeRoles,
  USER_ROLES, // Exporting roles for convenience in route files
};