import databaseService from './database.js';

class GoogleSheetsService {
  async syncLeadToGoogleSheets(lead) {
    try {
      const config = await databaseService.getConfig();
      const webhookUrl = config.googleSheetsWebhook;

      if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
        console.log('Google Sheets sync skipped: Webhook URL is not configured.');
        return false;
      }

      console.log(`Syncing lead to Google Sheets webhook: ${webhookUrl}`);
      
      // Perform a POST request to the Google Apps Script Web App
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          service: lead.service,
          source: lead.source,
          timestamp: lead.timestamp
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Google Sheets sync result:', result);
      return result.result === 'success';
    } catch (error) {
      console.error('Error syncing lead to Google Sheets:', error);
      return false;
    }
  }
}

export default new GoogleSheetsService();
