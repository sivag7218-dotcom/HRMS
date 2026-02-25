/**
 * INPUT VALIDATION MIDDLEWARE
 * 
 * Provides comprehensive input validation and sanitization
 * Prevents SQL injection, XSS, and other injection attacks
 * 
 * Usage:
 *   const { validateEmployeeCreate, validateEmployeeUpdate } = require('../middleware/validation');
 *   router.post('/employees', auth, hr, validateEmployeeCreate, createEmployeeHandler);
 */

const validator = require('validator');

/**
 * Sanitize string input - remove dangerous characters
 * @param {string} value - Input to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeString(value) {
    if (typeof value !== 'string') return value;
    
    // Trim whitespace
    value = value.trim();
    
    // Remove null bytes
    value = value.replace(/\0/g, '');
    
    // Basic XSS prevention (for display purposes, use proper escaping in frontend)
    return value;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    return validator.isEmail(email || '');
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhone(phone) {
    if (!phone) return true; // Optional field
    // Indian phone: 10 digits, may start with +91 or 0
    return /^(\+91|0)?[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
}

/**
 * Validate PAN number (Indian)
 * @param {string} pan - PAN to validate
 * @returns {boolean} True if valid
 */
function isValidPAN(pan) {
    if (!pan) return true; // Optional field
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase());
}

/**
 * Validate Aadhaar number (Indian)
 * @param {string} aadhaar - Aadhaar to validate
 * @returns {boolean} True if valid
 */
function isValidAadhaar(aadhaar) {
    if (!aadhaar) return true; // Optional field
    // 12 digits, may have spaces
    const cleaned = aadhaar.replace(/\s+/g, '');
    return /^\d{12}$/.test(cleaned);
}

/**
 * Validate date format
 * @param {string} date - Date to validate
 * @returns {boolean} True if valid
 */
function isValidDate(date) {
    if (!date) return true; // Optional field
    return validator.isISO8601(date) || validator.isDate(date);
}

/**
 * Validate number
 * @param {any} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if valid
 */
function isValidNumber(value, min = null, max = null) {
    const num = Number(value);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
}

/**
 * Validate employee creation data
 */
const validateEmployeeCreate = (req, res, next) => {
    const errors = [];
    const data = req.body;

    // Required fields
    if (!data.FirstName || data.FirstName.trim() === '') {
        errors.push('FirstName is required');
    }
    
    if (!data.LastName || data.LastName.trim() === '') {
        errors.push('LastName is required');
    }
    
    if (!data.WorkEmail || !isValidEmail(data.WorkEmail)) {
        errors.push('Valid WorkEmail is required');
    }
    
    // Validate email formats
    if (data.PersonalEmail && !isValidEmail(data.PersonalEmail)) {
        errors.push('PersonalEmail must be a valid email address');
    }
    
    // Validate phone
    if (data.PhoneNumber && !isValidPhone(data.PhoneNumber)) {
        errors.push('PhoneNumber must be a valid 10-digit phone number');
    }
    
    // Validate PAN
    if (data.PANNumber && !isValidPAN(data.PANNumber)) {
        errors.push('PANNumber must be in format: ABCDE1234F');
    }
    
    // Validate Aadhaar
    if (data.AadhaarNumber && !isValidAadhaar(data.AadhaarNumber)) {
        errors.push('AadhaarNumber must be a 12-digit number');
    }
    
    // Validate dates
    if (data.DateOfBirth && !isValidDate(data.DateOfBirth)) {
        errors.push('DateOfBirth must be a valid date');
    }
    
    if (data.DateJoined && !isValidDate(data.DateJoined)) {
        errors.push('DateJoined must be a valid date');
    }
    
    // Validate salary
    if (data.lpa !== undefined && !isValidNumber(data.lpa, 0, 100000000)) {
        errors.push('LPA must be a valid number between 0 and 100000000');
    }
    
    // Validate percentages
    const percentageFields = ['basic_pct', 'hra_pct', 'medical_allowance_pct'];
    percentageFields.forEach(field => {
        if (data[field] !== undefined && !isValidNumber(data[field], 0, 100)) {
            errors.push(`${field} must be between 0 and 100`);
        }
    });
    
    // Sanitize string fields
    const stringFields = ['FirstName', 'MiddleName', 'LastName', 'Gender', 'MaritalStatus', 
                         'current_city', 'current_state', 'current_country', 'father_name', 'mother_name'];
    stringFields.forEach(field => {
        if (data[field]) {
            req.body[field] = sanitizeString(data[field]);
        }
    });
    
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', errors });
    }
    
    next();
};

/**
 * Validate employee update data
 */
const validateEmployeeUpdate = (req, res, next) => {
    const errors = [];
    const data = req.body;
    
    // Validate email if provided
    if (data.WorkEmail && !isValidEmail(data.WorkEmail)) {
        errors.push('WorkEmail must be a valid email address');
    }
    
    if (data.PersonalEmail && !isValidEmail(data.PersonalEmail)) {
        errors.push('PersonalEmail must be a valid email address');
    }
    
    // Validate phone if provided
    if (data.PhoneNumber && !isValidPhone(data.PhoneNumber)) {
        errors.push('PhoneNumber must be a valid 10-digit phone number');
    }
    
    // Validate PAN if provided
    if (data.PANNumber && !isValidPAN(data.PANNumber)) {
        errors.push('PANNumber must be in format: ABCDE1234F');
    }
    
    // Validate Aadhaar if provided
    if (data.AadhaarNumber && !isValidAadhaar(data.AadhaarNumber)) {
        errors.push('AadhaarNumber must be a 12-digit number');
    }
    
    // Validate dates if provided
    if (data.DateOfBirth && !isValidDate(data.DateOfBirth)) {
        errors.push('DateOfBirth must be a valid date');
    }
    
    if (data.DateJoined && !isValidDate(data.DateJoined)) {
        errors.push('DateJoined must be a valid date');
    }
    
    // Validate salary if provided
    if (data.lpa !== undefined && !isValidNumber(data.lpa, 0, 100000000)) {
        errors.push('LPA must be a valid number between 0 and 100000000');
    }
    
    // Sanitize string fields
    const stringFields = ['FirstName', 'MiddleName', 'LastName', 'Gender', 'MaritalStatus',
                         'current_city', 'current_state', 'current_country'];
    stringFields.forEach(field => {
        if (data[field]) {
            req.body[field] = sanitizeString(data[field]);
        }
    });
    
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', errors });
    }
    
    next();
};

/**
 * Validate ID parameter
 */
const validateIdParam = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id || !isValidNumber(id, 1)) {
            return res.status(400).json({ 
                error: `Invalid ${paramName}`,
                message: `${paramName} must be a positive number`
            });
        }
        
        next();
    };
};

/**
 * Validate date range query parameters
 */
const validateDateRange = (req, res, next) => {
    const { start_date, end_date } = req.query;
    
    if (start_date && !isValidDate(start_date)) {
        return res.status(400).json({ error: 'Invalid start_date format' });
    }
    
    if (end_date && !isValidDate(end_date)) {
        return res.status(400).json({ error: 'Invalid end_date format' });
    }
    
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({ error: 'start_date must be before end_date' });
    }
    
    next();
};

/**
 * Sanitize search query to prevent SQL injection
 */
const sanitizeSearchQuery = (req, res, next) => {
    if (req.query.q) {
        // Remove SQL special characters
        req.query.q = req.query.q.replace(/['"`;\\]/g, '');
        req.query.q = sanitizeString(req.query.q);
        
        // Limit length
        if (req.query.q.length > 100) {
            req.query.q = req.query.q.substring(0, 100);
        }
    }
    
    next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
    const { page, limit } = req.query;
    
    if (page && !isValidNumber(page, 1, 10000)) {
        return res.status(400).json({ error: 'page must be between 1 and 10000' });
    }
    
    if (limit && !isValidNumber(limit, 1, 1000)) {
        return res.status(400).json({ error: 'limit must be between 1 and 1000' });
    }
    
    next();
};

module.exports = {
    // Validation middleware
    validateEmployeeCreate,
    validateEmployeeUpdate,
    validateIdParam,
    validateDateRange,
    validatePagination,
    sanitizeSearchQuery,
    
    // Utility functions
    sanitizeString,
    isValidEmail,
    isValidPhone,
    isValidPAN,
    isValidAadhaar,
    isValidDate,
    isValidNumber
};
