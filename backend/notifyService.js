// ═══════════════════════════════════════════════════
//  notifyService.js — SMS / WhatsApp Alerts (Optional)
//  Sends a notification to the admin when a HIGH
//  priority report is submitted.
//
//  Requires a Twilio account: https://twilio.com
//  Set TWILIO_* variables in your .env file.
// ═══════════════════════════════════════════════════

/**
 * sendUrgentAlert()
 * Sends an SMS (or WhatsApp) message to the town admin
 * when a High priority report comes in.
 *
 * @param {object} report - The saved report object
 */
async function sendUrgentAlert(report) {
  // Only send if Twilio credentials are configured
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log("ℹ️  Twilio not configured — skipping SMS alert");
    return;
  }

  try {
    // Lazy-load Twilio only if credentials are set
    // Run: npm install twilio
    const twilio = require("twilio");
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = `🚨 URGENT REPORT — ${report.category.toUpperCase()}
Title: ${report.title}
Location: ${report.location}
Priority: ${report.priority}
View at: http://your-admin-url/admin.html`;

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_FROM,  // Your Twilio number
      to:   process.env.TWILIO_PHONE_TO,    // Admin's number

      // To use WhatsApp instead of SMS, use:
      // from: "whatsapp:" + process.env.TWILIO_PHONE_FROM,
      // to:   "whatsapp:" + process.env.TWILIO_PHONE_TO,
    });

    console.log(`📱 Urgent alert sent for report: ${report.id}`);

  } catch (error) {
    // Don't crash the app if the notification fails
    console.error("⚠️  Failed to send SMS alert:", error.message);
  }
}

module.exports = { sendUrgentAlert };
