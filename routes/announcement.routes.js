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
    const { title, message, priority } = req.body;
    if (!title || title.trim() === "" || !message || message.trim() === "") {
        return res.status(400).json({ error: "Title and message are required" });
    }
    const c = await db();
    const [result] = await c.query(
        "INSERT INTO announcements (title, body, created_by, created_at) VALUES (?, ?, ?, NOW())",
        [title, message, req.user.id]
    );
    c.end();
    res.json({ id: result.insertId, success: true });
});

// Update announcement (HR/Admin only)
router.put("/:id", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE announcements SET ? WHERE id = ?", [req.body, req.params.id]);
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
