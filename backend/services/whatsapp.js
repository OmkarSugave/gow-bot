import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { ROOT_DIR, DATA_DIR } from '../config.js';
import databaseService from './database.js';
import excelService from './excel.js';
import emailService from './email.js';
import googleSheetsService from './googleSheets.js';

const { Client, LocalAuth } = pkg;

class WhatsAppService {
  constructor() {
    this.client = null;
    this.status = 'disconnected'; // disconnected, initializing, qr_ready, connected, error
    this.qrCodeDataUrl = '';
    this.sessions = new Map(); // phone -> session state
    this.initAttempts = 0;
  }

  // Format WhatsApp JID into a clean phone number: e.g. 919850774901@c.us -> +919850774901
  formatPhoneNumber(jid) {
    const num = jid.split('@')[0];
    return num.startsWith('+') ? num : `+${num}`;
  }

  async initialize() {
    if (this.client) {
      console.log('WhatsApp client already initialized or initializing...');
      return;
    }

    console.log('Initializing WhatsApp client...');
    this.status = 'initializing';
    this.qrCodeDataUrl = '';

    try {
      const puppeteerOpts = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ]
      };

      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        puppeteerOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'growbuzz-bot',
          dataPath: path.join(DATA_DIR, '.wwebjs_auth')
        }),
        puppeteer: puppeteerOpts
      });

      this.client.on('qr', async (qrText) => {
        console.log('QR Code received, generate displayable image...');
        this.status = 'qr_ready';
        try {
          this.qrCodeDataUrl = await qrcode.toDataURL(qrText);
        } catch (err) {
          console.error('Error generating QR Data URL:', err);
        }
      });

      this.client.on('ready', () => {
        console.log('WhatsApp Client is READY! Connected to phone.');
        this.status = 'connected';
        this.qrCodeDataUrl = '';
        this.initAttempts = 0;
      });

      this.client.on('authenticated', () => {
        console.log('WhatsApp Client authenticated successfully.');
        this.status = 'connected';
      });

      this.client.on('auth_failure', (msg) => {
        console.error('WhatsApp Authentication failed:', msg);
        this.status = 'error';
        this.qrCodeDataUrl = '';
      });

      this.client.on('disconnected', (reason) => {
        console.log('WhatsApp Client disconnected:', reason);
        this.status = 'disconnected';
        this.qrCodeDataUrl = '';
        this.sessions.clear();
        
        // Try to reinitialize after some time if disconnected unexpectedly
        this.client = null;
        if (this.initAttempts < 3) {
          this.initAttempts++;
          setTimeout(() => this.initialize(), 5000);
        }
      });

      this.client.on('message', async (msg) => {
        try {
          await this.handleIncomingMessage(msg);
        } catch (err) {
          console.error('Error handling WhatsApp message:', err);
        }
      });

      await this.client.initialize();
    } catch (err) {
      console.error('Failed to initialize WhatsApp Web client:', err);
      this.status = 'error';
      this.client = null;
    }
  }

  async handleIncomingMessage(msg) {
    // Ignore messages from groups or broadcast lists
    if (msg.from.endsWith('@g.us') || msg.from === 'status@broadcast') {
      return;
    }

    const from = msg.from;
    const body = msg.body.trim();
    const bodyLower = body.toLowerCase();

    // Reset bot session if user commands 'reset' or 'menu'
    if (bodyLower === 'reset' || bodyLower === 'menu') {
      this.sessions.set(from, { state: 'IDLE', service: null, name: null, email: null });
    }

    let session = this.sessions.get(from);
    if (!session) {
      session = { state: 'IDLE', service: null, name: null, email: null };
      this.sessions.set(from, session);
    }

    const config = await databaseService.getConfig();
    const services = await databaseService.getServices();

    // Helper to generate the list of services for the text message
    const renderServicesList = () => {
      return services.map((s, index) => `${index + 1}. *${s.name}* - ${s.description}`).join('\n');
    };

    switch (session.state) {
      case 'IDLE': {
        // Build welcome message substituting the list of services
        const welcomeText = config.welcomeMessage.replace('{services}', renderServicesList());
        await msg.reply(welcomeText);
        session.state = 'AWAITING_SERVICE_SELECTION';
        this.sessions.set(from, session);
        break;
      }

      case 'AWAITING_SERVICE_SELECTION': {
        // Try to match selected service either by number (1-based index) or by name
        let matchedService = null;
        
        // 1. Try numeric matching
        const parsedIndex = parseInt(body);
        if (!isNaN(parsedIndex) && parsedIndex >= 1 && parsedIndex <= services.length) {
          matchedService = services[parsedIndex - 1];
        } else {
          // 2. Try text name matching
          matchedService = services.find(s => 
            bodyLower.includes(s.name.toLowerCase()) || 
            s.name.toLowerCase().includes(bodyLower)
          );
        }

        if (matchedService) {
          session.service = matchedService.name;
          
          // Generate a custom link to the lead form
          // We will use a fallback or the current request domain, for now we will supply the form path.
          // Note: In local testing, this will point to localhost. We can make the path relative or prompt for dashboard server URL.
          const cleanPhone = this.formatPhoneNumber(from);
          const formUrl = `http://localhost:5173/form?service=${encodeURIComponent(session.service)}&phone=${encodeURIComponent(cleanPhone)}`;

          const responseText = `Great! You selected: *${session.service}*.\n\nTo complete your registration, click the link to fill out our quick form:\n🔗 ${formUrl}\n\nOr, if you prefer to register directly here in chat, reply with *'chat'*.\n\nType *'menu'* to start over.`;
          
          await msg.reply(responseText);
          session.state = 'AWAITING_REGISTRATION_METHOD';
          this.sessions.set(from, session);
        } else {
          const listText = renderServicesList();
          await msg.reply(`Sorry, I didn't catch that. Please select a service by replying with its number (e.g. 1, 2, or 3) or name:\n\n${listText}`);
        }
        break;
      }

      case 'AWAITING_REGISTRATION_METHOD': {
        if (bodyLower === 'chat') {
          session.state = 'AWAITING_NAME';
          this.sessions.set(from, session);
          await msg.reply('Please reply with your *Full Name*:');
        } else {
          await msg.reply(`Reply with *'chat'* to register directly here, or click the form link in the previous message.\n\nType *'menu'* to start over.`);
        }
        break;
      }

      case 'AWAITING_NAME': {
        if (body.length < 2) {
          await msg.reply('Please enter a valid Full Name:');
          return;
        }
        session.name = body;
        session.state = 'AWAITING_EMAIL';
        this.sessions.set(from, session);
        await msg.reply(`Thanks *${session.name}*! Now, please reply with your *Email Address*:`);
        break;
      }

      case 'AWAITING_EMAIL': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(bodyLower)) {
          await msg.reply('That email address looks invalid. Please reply with a valid email address (e.g., yourname@domain.com):');
          return;
        }

        session.email = body;
        session.state = 'AWAITING_PHONE';
        this.sessions.set(from, session);
        
        const currentPhone = this.formatPhoneNumber(from);
        await msg.reply(`Thanks! Now, please reply with your *Phone Number* (or reply *'same'* to use your WhatsApp number *${currentPhone}*):`);
        break;
      }

      case 'AWAITING_PHONE': {
        let finalPhone = body;
        if (bodyLower === 'same' || bodyLower === 'yes' || bodyLower === 'same number') {
          finalPhone = this.formatPhoneNumber(from);
        } else {
          // Validate that the user entered a phone-like string
          const digitsOnly = body.replace(/\D/g, '');
          if (digitsOnly.length < 8) {
            await msg.reply(`That doesn't look like a valid phone number. Please reply with your *Phone Number* (or reply *'same'* to use *${this.formatPhoneNumber(from)}*):`);
            return;
          }
        }

        session.phone = finalPhone;

        // Save Lead to DB
        const lead = await databaseService.addLead({
          name: session.name,
          email: session.email,
          phone: session.phone,
          service: session.service,
          source: 'WhatsApp'
        });

        // Update Excel Sheet
        await excelService.addLeadToExcel(lead);

        // Sync to Google Sheets
        await googleSheetsService.syncLeadToGoogleSheets(lead);

        // Send Email Notifications
        await emailService.sendLeadNotificationEmails(lead);

        // Send Confirmation back to WhatsApp
        const successMsg = config.registrationSuccessMessage || 
          "Thank you! Your registration is complete. Our team will contact you for further details and procedures within the next 6-9 working hours. 🚀";
        await msg.reply(successMsg);

        // Reset session state
        session.state = 'IDLE';
        session.service = null;
        session.name = null;
        session.email = null;
        session.phone = null;
        this.sessions.set(from, session);
        break;
      }
    }
  }

  // Allow sending a message to a phone number from outside (e.g. from the web form submission)
  async sendDirectMessage(phone, text) {
    if (this.status !== 'connected' || !this.client) {
      console.warn('Cannot send direct WhatsApp message: Client is not connected.');
      return false;
    }

    try {
      // Format number to JID: e.g. +919850774901 -> 919850774901@c.us
      let cleanPhone = phone.replace(/[+-\s]/g, '');
      if (!cleanPhone.endsWith('@c.us')) {
        cleanPhone = `${cleanPhone}@c.us`;
      }
      
      await this.client.sendMessage(cleanPhone, text);
      console.log(`Direct WhatsApp message sent to ${cleanPhone}`);
      return true;
    } catch (err) {
      console.error(`Failed to send direct WhatsApp message to ${phone}:`, err);
      return false;
    }
  }

  getStatus() {
    return {
      status: this.status,
      qr: this.qrCodeDataUrl
    };
  }

  async logout() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.error('Error destroying client:', err);
      }
      this.client = null;
      this.status = 'disconnected';
      this.qrCodeDataUrl = '';
      this.sessions.clear();
      
      // Clean auth session folder
      const authPath = path.join(DATA_DIR, '.wwebjs_auth');
      if (fs.existsSync(authPath)) {
        try {
          fs.rmSync(authPath, { recursive: true, force: true });
        } catch (e) {
          console.error('Error deleting auth session folder:', e);
        }
      }
      
      // Reinitialize
      await this.initialize();
    }
  }
}

export default new WhatsAppService();
