/**
 * BIRTHDAY & WISHES ROUTES
 * Handles birthday lists and birthday wishes
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");

/* ============ BIRTHDAY MANAGEMENT ============ */

// Get birthdays (today, this week, this month)
router.get("/", auth, async (req, res) => {
  const period = req.query.period || "today";
  const c = await db();

  let query =
    "SELECT id, FirstName, LastName, DateOfBirth, WorkEmail, profile_image FROM employees WHERE 1=1";

  if (period === "today") {
    query +=
      " AND DAY(DateOfBirth) = DAY(CURDATE()) AND MONTH(DateOfBirth) = MONTH(CURDATE())";
  } else if (period === "week") {
    query += " AND WEEK(DateOfBirth) = WEEK(CURDATE())";
  } else if (period === "month") {
    query += " AND MONTH(DateOfBirth) = MONTH(CURDATE())";
  } else if (period === "upcoming") {
    // Next 30 days
    query += ` AND (
            (MONTH(DateOfBirth) = MONTH(CURDATE()) AND DAY(DateOfBirth) >= DAY(CURDATE())) 
            OR 
            (MONTH(DateOfBirth) = MONTH(DATE_ADD(CURDATE(), INTERVAL 30 DAY)))
        )`;
  }

  query += " ORDER BY MONTH(DateOfBirth), DAY(DateOfBirth)";

  const [r] = await c.query(query);
  c.end();
  res.json(r);
});

/* ============ BIRTHDAY WISHES ============ */

// Post birthday wish
router.post("/wishes", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const { birthday_employee_id, message } = req.body;
    const c = await db();
    const [result] = await c.query(
      "INSERT INTO birthday_wishes (sender_id, employee_id, message, created_at) VALUES (?, ?, ?, NOW())",
      [req.user.id, birthday_employee_id, message],
    );
    c.end();
    res.json({ id: result.insertId, success: true });
  } catch (error) {
    console.error("Error posting wish:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get wishes for an employee
router.get("/wishes/:employee_id", auth, async (req, res) => {
  try {
    const c = await db();
    const [r] = await c.query(
      `SELECT bw.*, u.full_name as sender_name, e.FirstName, e.LastName 
             FROM birthday_wishes bw 
             LEFT JOIN users u ON bw.sender_id = u.id
             LEFT JOIN employees e ON bw.employee_id = e.id 
             WHERE bw.employee_id = ? 
             ORDER BY bw.created_at DESC`,
      [req.params.employee_id],
    );
    c.end();
    res.json(r);
  } catch (error) {
    console.error("Error fetching wishes:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get my wishes received
router.get("/wishes/my/received", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const c = await db();
    const [r] = await c.query(
      `SELECT bw.*, u.full_name as sender_name, e.FirstName, e.LastName 
             FROM birthday_wishes bw 
             LEFT JOIN users u ON bw.sender_id = u.id
             LEFT JOIN employees e ON bw.employee_id = e.id 
             WHERE bw.employee_id = ? 
             ORDER BY bw.created_at DESC`,
      [emp.id],
    );
    c.end();
    res.json(r);
  } catch (error) {
    console.error("Error fetching my wishes:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
