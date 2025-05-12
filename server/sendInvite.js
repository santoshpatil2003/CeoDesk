import express from 'express';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const router = express.Router();

async function sendInvite(toEmail, teamName, inviteLink, subject = `You’re invited to join ${teamName} on CEODesk!`, bodyContent = '', position = '') {
  // Fallback to CEO template if body is empty
  let content = bodyContent && bodyContent.trim().length > 0
    ? bodyContent
    : `Hey {name}, We would love for you to join our workspace as {Position} in CEODesk to collaborate with your teammates effortlessly.`;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const recipientName = toEmail.split('@')[0];
  // Always replace placeholders, even in fallback
  const finalBody = content
    .replace('{name}', recipientName)
    .replace('{Position}', position);

  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: toEmail,
    subject,
    html: `
      <div style="background:#f4f6fb;padding:40px 0;min-height:100vh;font-family:Arial,sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.07);padding:36px 32px 28px 32px;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="font-size:24px;font-weight:700;color:#0066cc;letter-spacing:1px;margin-bottom:8px;">CEODesk</div>
            <div style="font-size:18px;font-weight:600;color:#222;margin-bottom:8px;">${subject}</div>
          </div>
          <div style="font-size:16px;color:#222;margin-bottom:26px;white-space:pre-line;">
            ${finalBody}
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${inviteLink}" style="display:inline-block;padding:14px 32px;background-color:#0066cc;color:#fff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;box-shadow:0 2px 6px rgba(0,102,204,0.08);transition:background 0.2s;">Join Workspace</a>
          </div>
          <div style="font-size:13px;color:#888;text-align:center;margin-bottom:12px;">
            If the button doesn’t work, copy and paste this link into your browser:
          </div>
          <div style="font-size:13px;word-break:break-all;text-align:center;margin-bottom:16px;">
            <a href="${inviteLink}" style="color:#0066cc;">${inviteLink}</a>
          </div>
          <div style="text-align:center;font-size:13px;color:#aaa;">— The CEODesk Team</div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

router.post('/', async (req, res) => {
  const { toEmail, teamName, inviteLink, subject, body, position } = req.body;

  // TEMP: Log what is received for debugging (remove for production)
  console.log('[Invite API] Received:', { toEmail, teamName, inviteLink, subject, body, position });

  try {
    await sendInvite(toEmail, teamName, inviteLink, subject, body, position);
    res.status(200).json({ message: 'Invite sent!' });
  } catch (err) {
    console.error('[Invite API] Error:', err);
    res.status(500).json({ error: 'Failed to send invite.' });
  }
});

export default router;
