/**
 * ENHANCED NOTIFICATION ROUTES
 * Advanced notification management with filtering, preferences, and bulk operations
 */

const express = require("express");
const router = express.Router();
const { auth, hr, admin } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");
const notificationService = require("../services/notification.service.enhanced");

/* ============ USER NOTIFICATION ENDPOINTS ============ */

// Get my notifications with filters
router.get("/", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });
        
        const filters = {
            category: req.query.category,
            priority: req.query.priority,
            type: req.query.type,
            unreadOnly: req.query.unread === 'true',
            sortByPriority: req.query.sortByPriority === 'true',
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };
        
        const notifications = await notificationService.getNotifications(emp.id, filters);
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get notification statistics
router.get("/stats", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });
        
        const stats = await notificationService.getEmployeeNotificationStats(emp.id);
        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark notification as read
router.post("/mark-read/:id", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });
        
        const { db } = require("../config/database");
        const c = await db();
        await c.query(
            "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND employee_id = ?",
            [req.params.id, emp.id]
        );
        c.end();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark all as read
router.post("/mark-all-read", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });
        
        const { db } = require("../config/database");
        const c = await db();
        const [result] = await c.query(
            "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE employee_id = ? AND is_read = 0",
            [emp.id]
        );
        c.end();
        res.json({ success: true, updatedCount: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete notification
router.delete("/:id", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });
        
        const { db } = require("../config/database");
        const c = await db();
        await c.query("DELETE FROM notifications WHERE id = ? AND employee_id = ?", [req.params.id, emp.id]);
        c.end();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get unread count
router.get("/unread/count", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });
        
        const { db } = require("../config/database");
        const c = await db();
        const [r] = await c.query(
            "SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = 0",
            [emp.id]
        );
        c.end();
        res.json({ count: r[0]?.count || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============ NOTIFICATION PREFERENCES ============ */

// Get my notification preferences
router.get("/preferences", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });
        
        const preferences = await notificationService.getNotificationPreferences(emp.id);
        res.json({ success: true, preferences });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update notification preferences
router.post("/preferences", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });
        
        const result = await notificationService.saveNotificationPreferences(emp.id, req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============ ADMIN NOTIFICATION ENDPOINTS ============ */

// Create notification for specific employee
router.post("/create", auth, hr, async (req, res) => {
    try {
        const { employeeId, type, data, options } = req.body;
        
        if (!employeeId || !type) {
            return res.status(400).json({ error: "employeeId and type are required" });
        }
        
        const notificationId = await notificationService.createNotification(
            employeeId,
            type,
            data || {},
            options || {}
        );
        
        res.json({ success: true, notificationId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create bulk notifications
router.post("/create-bulk", auth, hr, async (req, res) => {
    try {
        const { employeeIds, type, data, options } = req.body;
        
        if (!employeeIds || !Array.isArray(employeeIds) || !type) {
            return res.status(400).json({ error: "employeeIds (array) and type are required" });
        }
        
        const result = await notificationService.createBulkNotifications(
            employeeIds,
            type,
            data || {},
            options || {}
        );
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create department-wide notification
router.post("/create-department", auth, hr, async (req, res) => {
    try {
        const { department, type, data, options } = req.body;
        
        if (!department || !type) {
            return res.status(400).json({ error: "department and type are required" });
        }
        
        const result = await notificationService.createDepartmentNotification(
            department,
            type,
            data || {},
            options || {}
        );
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create company-wide notification
router.post("/create-company-wide", auth, admin, async (req, res) => {
    try {
        const { type, data, options } = req.body;
        
        if (!type) {
            return res.status(400).json({ error: "type is required" });
        }
        
        const result = await notificationService.createCompanyWideNotification(
            type,
            data || {},
            options || {}
        );
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Schedule notification
router.post("/schedule", auth, hr, async (req, res) => {
    try {
        const { employeeId, type, data, scheduledDateTime } = req.body;
        
        if (!employeeId || !type || !scheduledDateTime) {
            return res.status(400).json({ 
                error: "employeeId, type, and scheduledDateTime are required" 
            });
        }
        
        const notificationId = await notificationService.scheduleNotification(
            employeeId,
            type,
            data || {},
            scheduledDateTime
        );
        
        res.json({ success: true, notificationId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get pending scheduled notifications (admin only)
router.get("/scheduled/pending", auth, admin, async (req, res) => {
    try {
        const notifications = await notificationService.getPendingScheduledNotifications();
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cleanup old notifications
router.delete("/cleanup", auth, admin, async (req, res) => {
    try {
        const daysOld = parseInt(req.query.daysOld) || 90;
        const result = await notificationService.cleanupOldNotifications(daysOld);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get notification types (for UI dropdown)
router.get("/types", auth, async (req, res) => {
    res.json({
        success: true,
        types: notificationService.NOTIFICATION_TYPES,
        priorities: notificationService.PRIORITY
    });
});

module.exports = router;
