/**
 * TIMESHEET COMPLIANCE CHECKER & REMINDER SERVICE
 * Automated daily checks and reminder notifications
 */

const { db } = require('../config/database');

class ComplianceChecker {
    constructor() {
        this.isRunning = false;
    }

    /**
     * Start the compliance checker service
     * Runs daily at specified times
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️  Compliance checker already running');
            return;
        }

        this.isRunning = true;
        console.log('✅ Timesheet compliance checker started');

        // Run immediately on startup
        this.runDailyCheck();

        // Schedule daily checks
        // 4:00 PM - First reminder
        this.scheduleDaily('16:00', () => this.runDailyCheck('afternoon_reminder'));
        
        // 6:00 PM - Second reminder
        this.scheduleDaily('18:00', () => this.runDailyCheck('evening_reminder'));

        // 8:00 PM - Final reminder / Escalation
        this.scheduleDaily('20:00', () => this.runDailyCheck('final_reminder'));

        // 11:30 PM - End of day compliance report
        this.scheduleDaily('23:30', () => this.generateEODReport());
    }

    /**
     * Schedule a task to run daily at specific time
     */
    scheduleDaily(time, callback) {
        const [hours, minutes] = time.split(':').map(Number);
        
        const schedule = () => {
            const now = new Date();
            const scheduled = new Date();
            scheduled.setHours(hours, minutes, 0, 0);

            if (now > scheduled) {
                scheduled.setDate(scheduled.getDate() + 1);
            }

            const timeout = scheduled - now;
            setTimeout(() => {
                callback();
                // Reschedule for next day
                setInterval(callback, 24 * 60 * 60 * 1000);
            }, timeout);
        };

        schedule();
    }

    /**
     * Run daily compliance check
     */
    async runDailyCheck(reminderType = 'daily_check') {
        try {
            console.log(`\n🔍 Running compliance check: ${reminderType} at ${new Date().toLocaleString()}`);
            
            const c = await db();
            const today = new Date().toISOString().split('T')[0];

            // Get all active employees
            const [employees] = await c.query(`
                SELECT 
                    e.id,
                    e.EmployeeNumber,
                    CONCAT(e.FirstName, ' ', e.LastName) as name,
                    e.WorkEmail,
                    e.PersonalEmail,
                    d.name as department,
                    m.WorkEmail as manager_email,
                    CONCAT(m.FirstName, ' ', m.LastName) as manager_name
                FROM employees e
                LEFT JOIN departments d ON e.DepartmentId = d.id
                LEFT JOIN employees m ON e.reporting_manager_id = m.id
                WHERE e.EmploymentStatus = 'Working'
            `);

            let compliantCount = 0;
            let nonCompliantCount = 0;
            let remindersToSend = [];

            for (const emp of employees) {
                // Check if timesheet submitted
                const [submission] = await c.query(`
                    SELECT id, status FROM timesheets
                    WHERE employee_id = ? AND date = ?
                    AND status IN ('submitted', 'verified')
                `, [emp.id, today]);

                if (submission.length > 0) {
                    compliantCount++;
                } else {
                    nonCompliantCount++;

                    // Check if reminder already sent today
                    const [existingReminder] = await c.query(`
                        SELECT id FROM timesheet_notifications
                        WHERE employee_id = ? 
                        AND DATE(scheduled_at) = ?
                        AND notification_type = 'reminder'
                    `, [emp.id, today]);

                    if (existingReminder.length === 0 || reminderType === 'final_reminder') {
                        remindersToSend.push(emp);
                    }
                }
            }

            // Send reminders
            if (remindersToSend.length > 0) {
                await this.sendReminders(c, remindersToSend, today, reminderType);
            }

            const complianceRate = ((compliantCount / employees.length) * 100).toFixed(2);

            console.log(`📊 Compliance Summary for ${today}:`);
            console.log(`   ✅ Compliant: ${compliantCount}/${employees.length} (${complianceRate}%)`);
            console.log(`   ⚠️  Non-compliant: ${nonCompliantCount}`);
            console.log(`   📧 Reminders to send: ${remindersToSend.length}`);

            c.end();
        } catch (error) {
            console.error('❌ Error in compliance check:', error);
        }
    }

    /**
     * Send reminder notifications
     */
    async sendReminders(connection, employees, date, reminderType) {
        // const messages = {
        //     afternoon_reminder: {
        //         subject: '⏰ Reminder: Submit Your Timesheet',
        //         message: `Hi {name},\n\nThis is a friendly reminder to submit your timesheet for ${date}.\n\nPlease complete it by end of day to maintain compliance.\n\nThank you!`
        //     },
        //     evening_reminder: {
        //         subject: '⚠️ Urgent: Timesheet Submission Pending',
        //         message: `Hi {name},\n\nYour timesheet for ${date} is still pending.\n\nPlease submit it immediately to avoid non-compliance.\n\nThank you!`
        //     },
        //     final_reminder: {
        //         subject: '🚨 Final Reminder: Timesheet Submission',
        //         message: `Hi {name},\n\nThis is the final reminder for your timesheet submission for ${date}.\n\nFailure to submit will be escalated to your manager and will be marked as non-compliant.\n\nPlease submit immediately.\n\nThank you!`
        //     }
        // };

        // const template = messages[reminderType] || messages.afternoon_reminder;

        // for (const emp of employees) {
        //     try {
        //         const personalizedMessage = template.message.replace('{name}', emp.name.split(' ')[0]);

        //         // Insert notification
        //         await connection.query(`
        //             INSERT INTO timesheet_notifications
        //             (employee_id, project_id, notification_type, notification_channel, 
        //              subject, message, scheduled_at, status)
        //             VALUES (?, 0, ?, 'in_app', ?, ?, NOW(), 'sent')
        //         `, [emp.id, reminderType === 'final_reminder' ? 'escalation' : 'reminder',
        //             template.subject, personalizedMessage]);

        //         // If final reminder, notify manager
        //         if (reminderType === 'final_reminder' && emp.manager_email) {
        //             const managerMessage = `Your team member ${emp.name} (${emp.EmployeeNumber}) has not submitted their timesheet for ${date}.`;
                    
        //             await connection.query(`
        //                 INSERT INTO timesheet_notifications
        //                 (employee_id, project_id, notification_type, notification_channel,
        //                  subject, message, scheduled_at, status)
        //                 VALUES (?, 0, 'escalation', 'email', ?, ?, NOW(), 'pending')
        //             `, [emp.id, `Team Member Timesheet Non-Compliance: ${emp.name}`, managerMessage]);
        //         }

        //     } catch (error) {
        //         console.error(`   ❌ Failed to send reminder to ${emp.name}:`, error.message);
        //     }
        // }

        // console.log(`   ✉️  ${employees.length} reminders queued`);
    }

    /**
     * Generate End-of-Day compliance report
     */
    async generateEODReport() {
        try {
            console.log('\n📋 Generating End-of-Day Compliance Report...');
            
            const c = await db();
            const today = new Date().toISOString().split('T')[0];

            // Overall stats
            const [stats] = await c.query(`
                SELECT 
                    COUNT(DISTINCT e.id) as total_employees,
                    COUNT(DISTINCT t.employee_id) as submitted,
                    COUNT(DISTINCT e.id) - COUNT(DISTINCT t.employee_id) as pending,
                    ROUND(COUNT(DISTINCT t.employee_id) * 100.0 / COUNT(DISTINCT e.id), 2) as rate
                FROM employees e
                LEFT JOIN timesheets t ON e.id = t.employee_id 
                    AND t.date = ? 
                    AND t.status IN ('submitted', 'verified')
                WHERE e.EmploymentStatus = 'Working'
            `, [today]);

            // Department breakdown
                const [deptBreakdown] = await c.query(`
                    SELECT 
                        d.name as department,
                        COUNT(DISTINCT e.id) as total,
                        COUNT(DISTINCT t.employee_id) as submitted,
                        ROUND(COUNT(DISTINCT t.employee_id) * 100.0 / COUNT(DISTINCT e.id), 2) as rate
                    FROM departments d
                    JOIN employees e ON d.id = e.DepartmentID
                    LEFT JOIN timesheets t ON e.id = t.employee_id 
                        AND t.date = ? 
                        AND t.status IN ('submitted', 'verified')
                    WHERE e.EmploymentStatus = 'Working'
                    GROUP BY d.id, d.name
                    ORDER BY rate DESC
                `, [today]);

            console.log(`\n═══════════════════════════════════════════`);
            console.log(`  📊 EOD COMPLIANCE REPORT - ${today}`);
            console.log(`═══════════════════════════════════════════`);
            console.log(`  Total Employees: ${stats[0].total_employees}`);
            console.log(`  ✅ Submitted: ${stats[0].submitted} (${stats[0].rate}%)`);
            console.log(`  ⚠️  Pending: ${stats[0].pending}`);
            console.log(`\n  Department Breakdown:`);
            
            deptBreakdown.forEach(dept => {
                const icon = dept.rate >= 95 ? '✅' : dept.rate >= 80 ? '⚠️' : '❌';
                console.log(`  ${icon} ${dept.department}: ${dept.submitted}/${dept.total} (${dept.rate}%)`);
            });

            console.log(`═══════════════════════════════════════════\n`);

            c.end();
        } catch (error) {
            console.error('❌ Error generating EOD report:', error);
        }
    }

    /**
     * Check and alert for missing monthly client timesheet uploads
     */
    async checkMonthlyUploads() {
        try {
            console.log('\n📅 Checking monthly client timesheet uploads...');
            
            const c = await db();
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthStr = lastMonth.toISOString().slice(0, 7);

            // Get project employees who haven't uploaded for last month
            const [pending] = await c.query(`
                SELECT DISTINCT
                    e.id,
                    e.EmployeeNumber,
                    CONCAT(e.FirstName, ' ', e.LastName) as name,
                    e.WorkEmail,
                    p.project_name,
                    COUNT(DISTINCT t.date) as days_worked,
                    SUM(t.total_hours) as total_hours
                FROM employees e
                JOIN project_assignments pa ON e.id = pa.employee_id
                JOIN projects p ON pa.project_id = p.id
                JOIN timesheets t ON e.id = t.employee_id 
                    AND t.project_id = p.id
                    AND t.timesheet_type = 'project'
                    AND DATE_FORMAT(t.date, '%Y-%m') = ?
                WHERE pa.status = 'active'
                AND NOT EXISTS (
                    SELECT 1 FROM timesheets t2
                    WHERE t2.employee_id = e.id
                    AND t2.project_id = p.id
                    AND DATE_FORMAT(t2.date, '%Y-%m') = ?
                    AND t2.client_timesheet_file IS NOT NULL
                )
                GROUP BY e.id, e.EmployeeNumber, name, e.WorkEmail, p.id, p.project_name
            `, [lastMonthStr, lastMonthStr]);

            if (pending.length > 0) {
                console.log(`   ⚠️  ${pending.length} employees pending client timesheet upload for ${lastMonthStr}`);
                
                // Send notifications
                for (const emp of pending) {
                    await c.query(`
                        INSERT INTO timesheet_notifications
                        (employee_id, project_id, notification_type, notification_channel,
                         subject, message, scheduled_at, status)
                        VALUES (?, 0, 'reminder', 'in_app', ?, ?, NOW(), 'pending')
                    `, [
                        emp.id,
                        `📅 Monthly Client Timesheet Upload Required`,
                        `Please upload the client-approved timesheet for ${emp.project_name} (${lastMonthStr}). You worked ${emp.days_worked} days (${emp.total_hours} hours).`
                    ]);
                }
            } else {
                console.log(`   ✅ All client timesheets uploaded for ${lastMonthStr}`);
            }

            c.end();
        } catch (error) {
            console.error('❌ Error checking monthly uploads:', error);
        }
    }

    /**
     * Stop the service
     */
    stop() {
        this.isRunning = false;
        console.log('⏹️  Compliance checker stopped');
    }
}

// Create singleton instance
const complianceChecker = new ComplianceChecker();

module.exports = complianceChecker;
