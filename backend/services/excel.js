import xlsx from 'xlsx';
import fs from 'fs';
import { EXCEL_PATH } from '../config.js';

class ExcelService {
  async addLeadToExcel(lead) {
    try {
      let workbook;
      let worksheet;
      let data = [];

      const newRow = {
        'Lead ID': lead.id,
        'Name': lead.name,
        'Email': lead.email,
        'Phone': lead.phone,
        'Service Selected': lead.service,
        'Registration Source': lead.source,
        'Timestamp': new Date(lead.timestamp).toLocaleString()
      };

      // Check if Excel file exists
      if (fs.existsSync(EXCEL_PATH)) {
        // Read existing workbook
        workbook = xlsx.readFile(EXCEL_PATH);
        const sheetName = workbook.SheetNames[0] || 'Leads';
        worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet data to JSON array
        data = xlsx.utils.sheet_to_json(worksheet);
        // Append new row
        data.push(newRow);
        
        // Recreate worksheet
        worksheet = xlsx.utils.json_to_sheet(data);
        workbook.Sheets[sheetName] = worksheet;
      } else {
        // Create new workbook and worksheet
        workbook = xlsx.utils.book_new();
        data.push(newRow);
        worksheet = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');
      }

      // Set column widths for better readability
      const colWidths = [
        { wch: 15 }, // Lead ID
        { wch: 20 }, // Name
        { wch: 25 }, // Email
        { wch: 18 }, // Phone
        { wch: 25 }, // Service Selected
        { wch: 18 }, // Registration Source
        { wch: 22 }  // Timestamp
      ];
      worksheet['!cols'] = colWidths;

      // Write workbook back to disk
      xlsx.writeFile(workbook, EXCEL_PATH);
      console.log(`Excel sheet updated successfully at: ${EXCEL_PATH}`);
      return true;
    } catch (error) {
      console.error('Error updating Excel sheet:', error);
      // Don't throw, just log so it doesn't break the main thread/bot response
      return false;
    }
  }
}

export default new ExcelService();
