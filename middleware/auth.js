const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/constants");

const auth = (req, res, next) => {
    try {
        const t = req.headers.authorization?.split(" ")[1];
        if (!t) return res.status(401).json({ error: "Missing token" });
        req.user = jwt.verify(t, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
};

const admin = (req, res, next) => {
    const role = req.user.role ? req.user.role.toLowerCase() : '';
    if (role !== "admin")
        return res.status(403).json({ error: "Admin only" });
    next();
};

const roleAuth = (allowedRoles) => (req, res, next) => {
    const role = req.user.role ? req.user.role.toLowerCase() : '';
    const normalizedRoles = allowedRoles.map(r => r.toLowerCase());
    if (!normalizedRoles.includes(role)) {
        return res.status(403).json({ error: `Access denied. Required roles: ${allowedRoles.join(', ')}` });
    }
    next();
};

const hr = (req, res, next) => {
    const role = req.user.role ? req.user.role.toLowerCase() : '';
    if (!['admin', 'hr'].includes(role))
        return res.status(403).json({ error: "HR/Admin only" });
    next();
};

const manager = (req, res, next) => {
    const role = req.user.role ? req.user.role.toLowerCase() : '';
    if (!['admin', 'hr', 'manager'].includes(role))
        return res.status(403).json({ error: "Manager/HR/Admin only" });
    next();
};

// Aliases for new routes
const authMiddleware = auth;
const adminAuthMiddleware = (req, res, next) => {
    auth(req, res, (err) => {
        if (err) return next(err);
        admin(req, res, next);
    });
};

module.exports = { auth, admin, roleAuth, hr, manager, authMiddleware, adminAuthMiddleware };
