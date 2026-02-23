/**
 * ANNOUNCEMENT ROUTES
 * Handles company announcements and notifications
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, hr } = require("../middleware/auth");

/* ============ ANNOUNCEMENT MANAGEMENT ============ */

// Get all announcements
router.get("/", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM announcements ORDER BY created_at DESC");
    c.end();
    res.json(r);
});

// Create announcement (HR/Admin only)
router.post("/", auth, hr, async (req, res) => {
    const { title, body, priority, starts_at, ends_at } = req.body;
    if (!title || title.trim() === "" || !body || body.trim() === "") {
        return res.status(400).json({ error: "Title and Body are required" });
    }
    // Convert ISO 8601 to MySQL TIMESTAMP (YYYY-MM-DD HH:MM:SS)
    function toMySQLDatetime(val) {
        if (!val) return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 19).replace('T', ' ');
    }
    const c = await db();
    const [result] = await c.query(
        `INSERT INTO announcements (title, body, starts_at, ends_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
        [title, body, toMySQLDatetime(starts_at), toMySQLDatetime(ends_at), req.user.id]
    );
    c.end();
    res.json({ id: result.insertId, success: true });
});

// Update announcement (HR/Admin only)
router.put("/:id", auth, hr, async (req, res) => {
    const { title, body, priority, starts_at, ends_at } = req.body;
    function toMySQLDatetime(val) {
        if (!val) return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 19).replace('T', ' ');
    }
    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (body !== undefined) updateFields.body = body;
    if (priority !== undefined) updateFields.priority = priority;
    if (starts_at !== undefined) updateFields.starts_at = toMySQLDatetime(starts_at);
    if (ends_at !== undefined) updateFields.ends_at = toMySQLDatetime(ends_at);
    const c = await db();
    await c.query("UPDATE announcements SET ? WHERE id = ?", [updateFields, req.params.id]);
    c.end();
    res.json({ success: true });
});

// Delete announcement (HR/Admin only)
router.delete("/:id", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM announcements WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ success: true });
});

module.exports = router;
