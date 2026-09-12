const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured – emails will be logged to console only');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendKeyEmail({ to, productName, keyValue, duration }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@localhost';
  const durationText = duration ? `${duration} day(s)` : 'Lifetime';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f13; color: #e4e4e7; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #27272a; }
    .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; color: white; }
    .content { padding: 32px; }
    .key-box { background: #09090b; border: 1px dashed #7c3aed; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .key-box code { font-size: 20px; letter-spacing: 2px; color: #a78bfa; font-weight: 600; }
    .footer { padding: 20px 32px; font-size: 13px; color: #71717a; text-align: center; border-top: 1px solid #27272a; }
    .btn { display: inline-block; background: #7c3aed; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Your Script Key is Ready</h1>
    </div>
    <div class="content">
      <p>Thanks for your purchase!</p>
      <p><strong>Product:</strong> ${productName}<br>
      <strong>Duration:</strong> ${durationText}</p>
      
      <div class="key-box">
        <div style="font-size:13px;color:#a1a1aa;margin-bottom:8px;">YOUR LICENSE KEY</div>
        <code>${keyValue}</code>
      </div>

      <p style="font-size:14px;color:#a1a1aa;">
        Copy the key above and paste it into the script loader when prompted.<br>
        Keep this email safe – the key is unique to you.
      </p>
    </div>
    <div class="footer">
      If you have any issues, reply to this email or open a ticket in our Discord.<br>
      © ${new Date().getFullYear()} Script Store
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Your Script Key is Ready!

Product: ${productName}
Duration: ${durationText}

YOUR LICENSE KEY:
${keyValue}

Copy the key and paste it into the script loader when prompted.
Keep this email safe.
  `;

  const mailOptions = {
    from,
    to,
    subject: `🔑 Your ${productName} Key`,
    text,
    html,
  };

  const transport = getTransporter();

  if (!transport) {
    // Demo mode – just log it
    console.log('\n========== EMAIL (DEMO MODE) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Key: ${keyValue}`);
    console.log('=======================================\n');
    return { success: true, demo: true };
  }

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`✅ Key email sent to ${to} – messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendKeyEmail };
