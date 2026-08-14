import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { PORT, EXCEL_PATH } from './config.js';
import databaseService from './services/database.js';
import excelService from './services/excel.js';
import emailService from './services/email.js';
import whatsappService from './services/whatsapp.js';
import mockWhatsappService from './mockWhatsapp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start WhatsApp bot in the background
whatsappService.initialize();

// --- API Endpoints ---

// 1. WhatsApp Status & QR
app.get('/api/status', (req, res) => {
  res.json(whatsappService.getStatus());
});

// 2. WhatsApp Logout & Reconnect
app.post('/api/logout', async (req, res) => {
  try {
    await whatsappService.logout();
    res.json({ success: true, message: 'WhatsApp session reset. Generating new QR code.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Config (Business Settings, Templates, SMTP)
app.get('/api/config', async (req, res) => {
  try {
    const config = await databaseService.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const updated = await databaseService.updateConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Services Manager
app.get('/api/services', async (req, res) => {
  try {
    const services = await databaseService.getServices();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const services = await databaseService.updateServices(req.body);
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Leads Manager
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await databaseService.getLeads();
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit lead from Web Form
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, phone, service } = req.body;

    if (!name || !email || !phone || !service) {
      return res.status(400).json({ success: false, error: 'Name, Email, Phone, and Service are required.' });
    }

    // Add to JSON Database
    const lead = await databaseService.addLead({
      name,
      email,
      phone,
      service,
      source: 'Web Form'
    });

    // Add to Excel File
    await excelService.addLeadToExcel(lead);

    // Send Emails to Client & Admin
    await emailService.sendLeadNotificationEmails(lead);

    // Send automated WhatsApp confirmation to user (if bot connected)
    const config = await databaseService.getConfig();
    const successMsg = config.registrationSuccessMessage || 
      "Thank you! Your registration is complete. Our team will contact you for further details and procedures within the next 6-9 working hours. 🚀";
    
    await whatsappService.sendDirectMessage(phone, `Hello ${name}!\n\n${successMsg}`);

    res.json({ success: true, lead });
  } catch (error) {
    console.error('Error submitting web form lead:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download Leads Excel Sheet
app.get('/api/leads/download', (req, res) => {
  if (fs.existsSync(EXCEL_PATH)) {
    res.download(EXCEL_PATH, 'leads.xlsx', (err) => {
      if (err) {
        console.error('Error downloading Excel file:', err);
        res.status(500).send('Error downloading file');
      }
    });
  } else {
    res.status(404).send('Excel file has not been created yet. Please register a lead first.');
  }
});

// 6. Test Email Credentials
app.post('/api/test-email', async (req, res) => {
  try {
    const result = await emailService.testConnection(req.body);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 7. Bot Simulator endpoint
app.post('/api/simulator/msg', async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' });
  }
  try {
    const replies = await mockWhatsappService.processSimulatedMessage(userId, message);
    res.json({ replies });
  } catch (error) {
    console.error('Simulator error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend in production mode
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`GrowBuzz server listening on http://localhost:${PORT}`);
});
