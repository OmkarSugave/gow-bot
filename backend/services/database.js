import fs from 'fs/promises';
import { DB_PATH } from '../config.js';

class DatabaseService {
  async read() {
    try {
      const data = await fs.readFile(DB_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading database.json, initializing default structure:', error);
      const defaultData = {
        config: {
          businessName: "GrowBuzz",
          welcomeMessage: "Hello! Welcome to GrowBuzz. 🐝\nWe help local businesses get more customers with high-converting websites, targeted Meta/Google ads, and WhatsApp automation.\n\nHere are the services we provide:\n{services}\n\nReply with the number (e.g. 1, 2, or 3) of the service you are interested in!",
          registrationSuccessMessage: "Thank you! Your registration is complete. Our team will contact you for further details and procedures within the next 6-9 working hours. 🚀",
          smtp: {
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            user: "",
            pass: "",
            from: "GrowBuzz Leads <leads@growbuzz.online>",
            adminEmail: "omkar@growbuzz.online"
          }
        },
        services: [
          { id: "1", name: "High-Converting Websites", description: "Sleek, responsive, and search-optimized websites designed to turn visitors into paying customers." },
          { id: "2", name: "Performance Marketing (Ads)", description: "Targeted Facebook, Instagram, and Google ad campaigns to drive direct leads and foot traffic." },
          { id: "3", name: "WhatsApp Automation", description: "Smart, 24/7 automated chat assistants that handle booking tables, orders, and customer queries." }
        ],
        leads: []
      };
      await this.write(defaultData);
      return defaultData;
    }
  }

  async write(data) {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error writing to database.json:', error);
      throw error;
    }
  }

  async getConfig() {
    const db = await this.read();
    return db.config;
  }

  async updateConfig(newConfig) {
    const db = await this.read();
    db.config = { ...db.config, ...newConfig };
    await this.write(db);
    return db.config;
  }

  async getServices() {
    const db = await this.read();
    return db.services || [];
  }

  async updateServices(servicesList) {
    const db = await this.read();
    db.services = servicesList;
    await this.write(db);
    return db.services;
  }

  async getLeads() {
    const db = await this.read();
    return db.leads || [];
  }

  async addLead(lead) {
    const db = await this.read();
    const newLead = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      service: lead.service,
      source: lead.source || 'Web Form',
      timestamp: new Date().toISOString()
    };
    db.leads.unshift(newLead); // Add new lead to the beginning
    await this.write(db);
    return newLead;
  }
}

export default new DatabaseService();
