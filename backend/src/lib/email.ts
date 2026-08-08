import { Resend } from 'resend';

// Initialize with dummy key if not provided, just so it doesn't crash.
// In a real scenario, you would have RESEND_API_KEY in your .env.
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export const sendAdminNotification = async (subject: string, body: string) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rentout.com';
  
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email Simulation] To Admin:', subject);
    console.log('[Email Simulation] Body:', body);
    return;
  }

  try {
    await resend.emails.send({
      from: 'RentOut System <noreply@rentout.com>', // Resend requires a verified domain if using a custom email
      to: adminEmail,
      subject: `[Admin Alert] ${subject}`,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    });
  } catch (err) {
    console.error('Failed to send admin notification email:', err);
  }
};
