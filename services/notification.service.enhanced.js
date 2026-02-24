/**
 * ENHANCED NOTIFICATION SERVICE
 * Advanced notification management with:
 * - Notification templates
 * - Bulk notifications
 * - Priority levels
 * - Scheduled notifications
 * - Email integration support
 * - User preferences
 */

const { db } = require('../config/database');

// Notification types
const NOTIFICATION_TYPES = {
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  PAYSLIP_GENERATED: 'payslip_generated',
  TIMESHEET_PENDING: 'timesheet_pending',
  ATTENDANCE_MISSING: 'attendance_missing',
  BIRTHDAY: 'birthday',
  ANNOUNCEMENT: 'announcement',
  TASK_ASSIGNED: 'task_assigned',
  COMPLIANCE_WARNING: 'compliance_warning',
  DOCUMENT_EXPIRY: 'document_expiry',
  SALARY_CREDITED: 'salary_credited',
  PERFORMANCE_REVIEW: 'performance_review'
};

// Priority levels
const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Notification templates
const TEMPLATES = {
  [NOTIFICATION_TYPES.LEAVE_APPROVED]: {
    title: 'Leave Approved',
    message: 'Your {{leave_type}} leave from {{start_date}} to {{end_date}} has been approved.',
    priority: PRIORITY.MEDIUM,
    category: 'leave'
  },
  [NOTIFICATION_TYPES.LEAVE_REJECTED]: {
    title: 'Leave Rejected',
    message: 'Your {{leave_type}} leave request has been rejected. Reason: {{reason}}',
    priority: PRIORITY.HIGH,
    category: 'leave'
  },
  [NOTIFICATION_TYPES.PAYSLIP_GENERATED]: {
    title: 'Payslip Generated',
    message: 'Your payslip for {{month}} {{year}} is now available. Net Pay: ₹{{net_pay}}',
    priority: PRIORITY.MEDIUM,
    category: 'payroll'
  },
  [NOTIFICATION_TYPES.TIMESHEET_PENDING]: {
    title: 'Timesheet Submission Pending',
    message: 'Please submit your timesheet for {{week}}. Only {{days_left}} days remaining.',
    priority: PRIORITY.HIGH,
    category: 'timesheet'
  },
  [NOTIFICATION_TYPES.ATTENDANCE_MISSING]: {
    title: 'Attendance Missing',
    message: 'Your attendance for {{date}} is missing. Please regularize.',
    priority: PRIORITY.HIGH,
    category: 'attendance'
  },
  [NOTIFICATION_TYPES.BIRTHDAY]: {
    title: 'Happy Birthday! 🎉',
    message: 'Wishing you a wonderful birthday, {{name}}!',
    priority: PRIORITY.LOW,
    category: 'celebration'
  },
  [NOTIFICATION_TYPES.ANNOUNCEMENT]: {
    title: '{{title}}',
    message: '{{message}}',
    priority: PRIORITY.MEDIUM,
    category: 'announcement'
  },
  [NOTIFICATION_TYPES.COMPLIANCE_WARNING]: {
    title: 'Compliance Warning',
    message: '{{warning_message}}. Please take action immediately.',
    priority: PRIORITY.URGENT,
    category: 'compliance'
  },
  [NOTIFICATION_TYPES.DOCUMENT_EXPIRY]: {
    title: 'Document Expiring Soon',
    message: 'Your {{document_type}} will expire on {{expiry_date}}. Please update.',
    priority: PRIORITY.HIGH,
    category: 'compliance'
  },
  [NOTIFICATION_TYPES.SALARY_CREDITED]: {
    title: 'Salary Credited',
    message: 'Your salary of ₹{{amount}} has been credited to your account.',
    priority: PRIORITY.MEDIUM,
    category: 'payroll'
  }
};

/**
 * Replace template variables with actual values
 */
function parseTemplate(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Create a single notification
 */
async function createNotification(employeeId, type, data = {}, options = {}) {
  const conn = await db();
  
  try {
    const template = TEMPLATES[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }
    
    const title = parseTemplate(template.title, data);
    const message = parseTemplate(template.message, data);
    const priority = options.priority || template.priority;
    const category = options.category || template.category;
    const scheduledFor = options.scheduledFor || null;
    const metadata = JSON.stringify(data);
    
    const [result] = await conn.query(
      `INSERT INTO notifications (employee_id, title, message, type, priority, category, scheduled_for, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [employeeId, title, message, type, priority, category, scheduledFor, metadata]
    );
    
    return result.insertId;
  } finally {
    conn.end();
  }
}

/**
 * Create bulk notifications for multiple employees
 */
async function createBulkNotifications(employeeIds, type, data = {}, options = {}) {
  const conn = await db();
  
  try {
    const template = TEMPLATES[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }
    
    const title = parseTemplate(template.title, data);
    const message = parseTemplate(template.message, data);
    const priority = options.priority || template.priority;
    const category = options.category || template.category;
    const scheduledFor = options.scheduledFor || null;
    const metadata = JSON.stringify(data);
    
    const values = employeeIds.map(empId => [
      empId, title, message, type, priority, category, scheduledFor, metadata
    ]);
    
    if (values.length === 0) return [];
    
    const [result] = await conn.query(
      `INSERT INTO notifications (employee_id, title, message, type, priority, category, scheduled_for, metadata, created_at)
       VALUES ?`,
      [values]
    );
    
    return {
      success: true,
      count: result.affectedRows,
      firstId: result.insertId
    };
  } finally {
    conn.end();
  }
}

/**
 * Create notification for all employees in a department
 */
async function createDepartmentNotification(department, type, data = {}, options = {}) {
  const conn = await db();
  
  try {
    const [employees] = await conn.query(
      'SELECT id FROM employees WHERE Department = ? AND EmploymentStatus = ?',
      [department, 'active']
    );
    
    const employeeIds = employees.map(e => e.id);
    return await createBulkNotifications(employeeIds, type, data, options);
  } finally {
    conn.end();
  }
}

/**
 * Create notification for all active employees
 */
async function createCompanyWideNotification(type, data = {}, options = {}) {
  const conn = await db();
  
  try {
    const [employees] = await conn.query(
      'SELECT id FROM employees WHERE EmploymentStatus = ?',
      ['active']
    );
    
    const employeeIds = employees.map(e => e.id);
    return await createBulkNotifications(employeeIds, type, data, options);
  } finally {
    conn.end();
  }
}

/**
 * Schedule notification for future delivery
 */
async function scheduleNotification(employeeId, type, data, scheduledDateTime) {
  return await createNotification(employeeId, type, data, {
    scheduledFor: scheduledDateTime
  });
}

/**
 * Get pending scheduled notifications
 */
async function getPendingScheduledNotifications() {
  const conn = await db();
  
  try {
    const [notifications] = await conn.query(
      `SELECT * FROM notifications 
       WHERE scheduled_for IS NOT NULL 
         AND scheduled_for <= NOW() 
         AND sent_at IS NULL 
         AND is_read = 0
       ORDER BY scheduled_for ASC
       LIMIT 100`
    );
    
    return notifications;
  } finally {
    conn.end();
  }
}

/**
 * Mark scheduled notification as sent
 */
async function markNotificationSent(notificationId) {
  const conn = await db();
  
  try {
    await conn.query(
      'UPDATE notifications SET sent_at = NOW() WHERE id = ?',
      [notificationId]
    );
  } finally {
    conn.end();
  }
}

/**
 * Get notification statistics for an employee
 */
async function getEmployeeNotificationStats(employeeId) {
  const conn = await db();
  
  try {
    const [stats] = await conn.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
         SUM(CASE WHEN priority = 'urgent' AND is_read = 0 THEN 1 ELSE 0 END) as urgent_unread,
         SUM(CASE WHEN category = 'leave' THEN 1 ELSE 0 END) as leave_notifications,
         SUM(CASE WHEN category = 'payroll' THEN 1 ELSE 0 END) as payroll_notifications,
         SUM(CASE WHEN category = 'compliance' THEN 1 ELSE 0 END) as compliance_notifications
       FROM notifications 
       WHERE employee_id = ?`,
      [employeeId]
    );
    
    return stats[0] || {};
  } finally {
    conn.end();
  }
}

/**
 * Get notifications with filtering and pagination
 */
async function getNotifications(employeeId, filters = {}) {
  const conn = await db();
  
  try {
    let query = 'SELECT * FROM notifications WHERE employee_id = ?';
    const params = [employeeId];
    
    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }
    
    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }
    
    if (filters.unreadOnly) {
      query += ' AND is_read = 0';
    }
    
    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    
    query += ' ORDER BY ';
    
    // Sort by priority first if requested
    if (filters.sortByPriority) {
      query += `FIELD(priority, 'urgent', 'high', 'medium', 'low'), `;
    }
    
    query += 'created_at DESC';
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [notifications] = await conn.query(query, params);
    return notifications;
  } finally {
    conn.end();
  }
}

/**
 * Delete old read notifications (cleanup)
 */
async function cleanupOldNotifications(daysOld = 90) {
  const conn = await db();
  
  try {
    const [result] = await conn.query(
      `DELETE FROM notifications 
       WHERE is_read = 1 
         AND read_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [daysOld]
    );
    
    return {
      success: true,
      deletedCount: result.affectedRows
    };
  } finally {
    conn.end();
  }
}

/**
 * Save user notification preferences
 */
async function saveNotificationPreferences(employeeId, preferences) {
  const conn = await db();
  
  try {
    const prefsJson = JSON.stringify(preferences);
    await conn.query(
      `INSERT INTO employee_notification_preferences (employee_id, preferences, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE preferences = ?, updated_at = NOW()`,
      [employeeId, prefsJson, prefsJson]
    );
    
    return { success: true };
  } finally {
    conn.end();
  }
}

/**
 * Get user notification preferences
 */
async function getNotificationPreferences(employeeId) {
  const conn = await db();
  
  try {
    const [rows] = await conn.query(
      'SELECT preferences FROM employee_notification_preferences WHERE employee_id = ?',
      [employeeId]
    );
    
    if (rows.length === 0) {
      // Return default preferences
      return {
        email: true,
        push: true,
        categories: {
          leave: true,
          payroll: true,
          attendance: true,
          compliance: true,
          announcement: true
        }
      };
    }
    
    return JSON.parse(rows[0].preferences);
  } finally {
    conn.end();
  }
}

/**
 * Send notification based on user preferences
 */
async function sendNotificationWithPreferences(employeeId, type, data, options = {}) {
  const preferences = await getNotificationPreferences(employeeId);
  const template = TEMPLATES[type];
  
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }
  
  // Check if user wants notifications for this category
  if (preferences.categories && !preferences.categories[template.category]) {
    return { success: false, reason: 'User disabled this category' };
  }
  
  // Create in-app notification
  const notificationId = await createNotification(employeeId, type, data, options);
  
  // TODO: Send email if enabled
  if (preferences.email) {
    // await sendEmailNotification(employeeId, type, data);
  }
  
  // TODO: Send push notification if enabled
  if (preferences.push) {
    // await sendPushNotification(employeeId, type, data);
  }
  
  return {
    success: true,
    notificationId
  };
}

module.exports = {
  NOTIFICATION_TYPES,
  PRIORITY,
  TEMPLATES,
  createNotification,
  createBulkNotifications,
  createDepartmentNotification,
  createCompanyWideNotification,
  scheduleNotification,
  getPendingScheduledNotifications,
  markNotificationSent,
  getEmployeeNotificationStats,
  getNotifications,
  cleanupOldNotifications,
  saveNotificationPreferences,
  getNotificationPreferences,
  sendNotificationWithPreferences
};
