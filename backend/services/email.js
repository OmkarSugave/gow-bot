import nodemailer from 'nodemailer';
import databaseService from './database.js';

class EmailService {
  async createTransporter() {
    const config = await databaseService.getConfig();
    const smtp = config.smtp;

    // Verify SMTP settings are present
    if (!smtp.host || !smtp.user || !smtp.pass) {
      console.warn('SMTP settings are incomplete. Emails will not be sent. Please configure them in the Admin Settings.');
      return null;
    }

    return nodemailer.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port) || 587,
      secure: smtp.secure === true || smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass
      }
    });
  }

  async sendLeadNotificationEmails(lead) {
    const config = await databaseService.getConfig();
    const smtp = config.smtp;
    const transporter = await this.createTransporter();

    if (!transporter) {
      console.log('Skipping email notifications due to missing SMTP configuration.');
      return false;
    }

    try {
      // 1. Send Email to Client
      const clientMailOptions = {
        from: smtp.from || `"GrowBuzz" <no-reply@growbuzz.online>`,
        to: lead.email,
        subject: `Your Registration for ${lead.service} at GrowBuzz 🐝`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #ffbe3c; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #1e1e1e; font-size: 24px; font-weight: 700;">Welcome to GrowBuzz! 🐝</h1>
            </div>
            <div style="padding: 24px; background-color: #ffffff; color: #334155; line-height: 1.6;">
              <p style="font-size: 16px; margin-top: 0;">Hi <strong>${lead.name}</strong>,</p>
              <p>Thank you for reaching out to us. We have successfully registered your request for our <strong>${lead.service}</strong> service.</p>
              
              <div style="background-color: #fffbeb; border-left: 4px solid #ffbe3c; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 8px 0; color: #1e1e1e; font-size: 16px;">Registration Summary:</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; width: 100px;">Service:</td>
                    <td style="padding: 4px 0; color: #1e1e1e; font-weight: 600;">${lead.service}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Phone:</td>
                    <td style="padding: 4px 0; color: #1e1e1e;">${lead.phone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Email:</td>
                    <td style="padding: 4px 0; color: #1e1e1e;">${lead.email}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-weight: 600; color: #1e1e1e; font-size: 16px; margin-bottom: 8px;">What's Next?</p>
              <p style="margin-top: 0;">Our core team is already reviewing your details. <strong>We will contact you for further details and procedures within the next 6-9 working hours.</strong></p>
              
              <p style="margin-bottom: 0;">Best Regards,</p>
              <p style="margin-top: 4px; font-weight: 600; color: #ffbe3c; font-size: 16px;">The GrowBuzz Team</p>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              This is an automated email. Please do not reply to this message. <br/>
              © ${new Date().getFullYear()} GrowBuzz. All rights reserved.
            </div>
          </div>
        `
      };

      // 2. Send Email to Admin (Business Owner)
      const adminMailOptions = {
        from: smtp.from || `"GrowBuzz Lead Bot" <leads@growbuzz.online>`,
        to: smtp.adminEmail || 'omkar@growbuzz.online',
        subject: `🚨 New Lead Registered: ${lead.name} (${lead.service})`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1e1e1e; padding: 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; color: #ffbe3c; font-size: 24px; font-weight: 700;">New Lead Notification 🚨</h1>
            </div>
            <div style="padding: 24px; background-color: #ffffff; color: #334155; line-height: 1.6;">
              <p style="font-size: 16px; margin-top: 0;">Hello Admin,</p>
              <p>A new customer has registered a request through the <strong>${lead.source}</strong> bot flow.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 15px;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0; width: 150px;">Customer Name</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${lead.name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Selected Service</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #b45309;">${lead.service}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Phone Number</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><a href="tel:${lead.phone}">${lead.phone}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Email Address</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${lead.email}">${lead.email}</a></td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Intake Source</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 2px 8px; background-color: #dbeafe; color: #1e40af; border-radius: 9999px; font-size: 13px;">${lead.source}</span></td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Registration Date</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${new Date(lead.timestamp).toLocaleString()}</td>
                </tr>
              </table>
              
              <div style="text-align: center; margin-top: 24px;">
                <p style="font-size: 13px; color: #64748b;">The local Excel sheet has been updated with this contact information.</p>
              </div>
            </div>
          </div>
        `
      };

      // Dispatch both emails
      await Promise.all([
        transporter.sendMail(clientMailOptions),
        transporter.sendMail(adminMailOptions)
      ]);

      console.log('Client and Admin notification emails sent successfully.');
      return true;
    } catch (error) {
      console.error('Error sending notification emails:', error);
      return false;
    }
  }

  async testConnection(smtpConfig) {
    try {
      const testTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port) || 587,
        secure: smtpConfig.secure === true || smtpConfig.port === 465,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass
        }
      });
      await testTransporter.verify();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();
