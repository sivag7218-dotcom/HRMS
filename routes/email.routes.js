const express = require('express');
const router = express.Router();
const { sendMail } = require('../utils/mail.service');

/**
 * Route to send email
 * POST /send-email
 */
router.post('/send-email', async (req, res) => {
    try {
        const { to, subject, text, html } = req.body;

        if (!to || !subject) {
            return res.status(400).json({
                success: false,
                message: 'Recipient (to) and subject are required.'
            });
        }

        const result = await sendMail({ to, subject, text, html });
        res.json({ success: true, message: 'Email sent successfully', data: result });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send email',
            error: error.message
        });
    }
});

module.exports = router;
