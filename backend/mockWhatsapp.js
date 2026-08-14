import databaseService from './services/database.js';
import excelService from './services/excel.js';
import emailService from './services/email.js';

const mockSessions = new Map();

class MockWhatsAppService {
  async processSimulatedMessage(userId, messageText) {
    const body = messageText.trim();
    const bodyLower = body.toLowerCase();
    const replies = [];

    // Initialize or reset session
    if (bodyLower === 'reset' || bodyLower === 'menu' || !mockSessions.has(userId)) {
      mockSessions.set(userId, { state: 'IDLE', service: null, name: null, email: null });
    }

    const session = mockSessions.get(userId);
    const config = await databaseService.getConfig();
    const services = await databaseService.getServices();

    const renderServicesList = () => {
      return services.map((s, index) => `${index + 1}. *${s.name}* - ${s.description}`).join('\n');
    };

    switch (session.state) {
      case 'IDLE': {
        const welcomeText = config.welcomeMessage.replace('{services}', renderServicesList());
        replies.push(welcomeText);
        session.state = 'AWAITING_SERVICE_SELECTION';
        mockSessions.set(userId, session);
        break;
      }

      case 'AWAITING_SERVICE_SELECTION': {
        let matchedService = null;
        const parsedIndex = parseInt(body);
        
        if (!isNaN(parsedIndex) && parsedIndex >= 1 && parsedIndex <= services.length) {
          matchedService = services[parsedIndex - 1];
        } else {
          matchedService = services.find(s => 
            bodyLower.includes(s.name.toLowerCase()) || 
            s.name.toLowerCase().includes(bodyLower)
          );
        }

        if (matchedService) {
          session.service = matchedService.name;
          const cleanPhone = "+919850774901"; // Simulated phone number
          const formUrl = `http://localhost:5173/form?service=${encodeURIComponent(session.service)}&phone=${encodeURIComponent(cleanPhone)}`;

          replies.push(`Great! You selected: *${session.service}*.\n\nTo complete your registration, click the link to fill out our quick form:\n🔗 ${formUrl}\n\nOr, if you prefer to register directly here in chat, reply with *'chat'*.\n\nType *'menu'* to start over.`);
          session.state = 'AWAITING_REGISTRATION_METHOD';
          mockSessions.set(userId, session);
        } else {
          replies.push(`Sorry, I didn't catch that. Please select a service by replying with its number (e.g. 1, 2, or 3) or name:\n\n${renderServicesList()}`);
        }
        break;
      }

      case 'AWAITING_REGISTRATION_METHOD': {
        if (bodyLower === 'chat') {
          session.state = 'AWAITING_NAME';
          mockSessions.set(userId, session);
          replies.push('Please reply with your *Full Name*:');
        } else {
          replies.push(`Reply with *'chat'* to register directly here, or click the form link in the previous message.\n\nType *'menu'* to start over.`);
        }
        break;
      }

      case 'AWAITING_NAME': {
        if (body.length < 2) {
          replies.push('Please enter a valid Full Name:');
          return replies;
        }
        session.name = body;
        session.state = 'AWAITING_EMAIL';
        mockSessions.set(userId, session);
        replies.push(`Thanks *${session.name}*! Now, please reply with your *Email Address*:`);
        break;
      }

      case 'AWAITING_EMAIL': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(bodyLower)) {
          replies.push('That email address looks invalid. Please reply with a valid email address (e.g., yourname@domain.com):');
          return replies;
        }

        session.email = body;
        const phone = "+919850774901"; // Simulated phone number

        // Save Lead to DB
        const lead = await databaseService.addLead({
          name: session.name,
          email: session.email,
          phone: phone,
          service: session.service,
          source: 'Simulator'
        });

        // Update Excel Sheet
        await excelService.addLeadToExcel(lead);

        // Send Email Notifications
        await emailService.sendLeadNotificationEmails(lead);

        // Send Success Message
        const successMsg = config.registrationSuccessMessage || 
          "Thank you! Your registration is complete. Our team will contact you for further details and procedures within the next 6-9 working hours. 🚀";
        replies.push(successMsg);

        // Reset session state
        session.state = 'IDLE';
        session.service = null;
        session.name = null;
        session.email = null;
        mockSessions.set(userId, session);
        break;
      }
    }

    return replies;
  }
}

export default new MockWhatsAppService();
