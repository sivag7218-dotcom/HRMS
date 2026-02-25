/**
 * APPLICATION CONSTANTS - REFACTORED
 * 
 * Improvements:
 * - Environment variable support (.env)
 * - Secure default handling
 * - Configuration validation
 * - Better documentation
 * 
 * BACKWARD COMPATIBLE: JWT_SECRET still exported with same name
 * 
 * SECURITY RECOMMENDATION:
 * Create a .env file in project root with:
 *   JWT_SECRET=your-secure-random-secret-here-min-32-chars
 *   JWT_EXPIRES_IN=8h
 *   NODE_ENV=production
 * 
 * Generate secure secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

// Load environment variables from .env file
require('dotenv').config();

/**
 * JWT Configuration
 */
const JWT_SECRET = process.env.JWT_SECRET || "abc123xyz456"; // Fallback for backward compatibility

// Warn if using default/weak secret
if (JWT_SECRET === "abc123xyz456") {
    console.warn("");
    console.warn("⚠️  WARNING: Using default JWT secret! This is insecure for production.");
    console.warn("⚠️  Please set JWT_SECRET environment variable to a secure random value.");
    console.warn("⚠️  Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    console.warn("");
}

// Validate JWT secret strength (minimum length)
if (JWT_SECRET.length < 16) {
    console.error("❌ JWT_SECRET is too short. Must be at least 16 characters.");
    if (process.env.NODE_ENV === 'production') {
        throw new Error("JWT_SECRET too short for production use");
    }
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Application Configuration
 */
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;

/**
 * Security Configuration
 */
const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10);
const PASSWORD_REQUIRE_UPPERCASE = process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false';
const PASSWORD_REQUIRE_LOWERCASE = process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false';
const PASSWORD_REQUIRE_NUMBER = process.env.PASSWORD_REQUIRE_NUMBER !== 'false';
const PASSWORD_REQUIRE_SPECIAL = process.env.PASSWORD_REQUIRE_SPECIAL !== 'false';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

// Session/Rate Limiting
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOGIN_RATE_LIMIT_WINDOW_MS = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes

/**
 * File Upload Configuration
 */
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx').split(',');

/**
 * Email Configuration (for future use)
 */
const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@hrms.local';

/**
 * Pagination Defaults
 */
const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE || '50', 10);
const MAX_PAGE_SIZE = parseInt(process.env.MAX_PAGE_SIZE || '1000', 10);

/**
 * Logging Configuration
 */
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || 'logs/app.log';

/**
 * Utility function to validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
    const errors = [];

    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }

    if (PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (PASSWORD_REQUIRE_NUMBER && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Utility function to check if running in production mode
 * @returns {boolean}
 */
function isProduction() {
    return NODE_ENV === 'production';
}

/**
 * Utility function to check if running in development mode
 * @returns {boolean}
 */
function isDevelopment() {
    return NODE_ENV === 'development';
}

module.exports = { 
    // Backward compatible export
    JWT_SECRET,
    
    // JWT Configuration
    JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN,
    
    // Application
    NODE_ENV,
    PORT,
    API_BASE_URL,
    
    // Security
    PASSWORD_MIN_LENGTH,
    PASSWORD_REQUIRE_UPPERCASE,
    PASSWORD_REQUIRE_LOWERCASE,
    PASSWORD_REQUIRE_NUMBER,
    PASSWORD_REQUIRE_SPECIAL,
    BCRYPT_ROUNDS,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_RATE_LIMIT_WINDOW_MS,
    
    // File Upload
    MAX_FILE_SIZE,
    UPLOAD_DIR,
    ALLOWED_FILE_TYPES,
    
    // Email
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
    
    // Pagination
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    
    // Logging
    LOG_LEVEL,
    LOG_FILE_PATH,
    
    // Utilities
    validatePasswordStrength,
    isProduction,
    isDevelopment
};
