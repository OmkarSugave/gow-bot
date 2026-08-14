import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root paths
export const ROOT_DIR = path.resolve(__dirname, '..');

// Support persistent storage volume (e.g., Render / Railway mount)
export const DATA_DIR = process.env.DATA_DIR || ROOT_DIR;

// Make sure DATA_DIR exists
if (process.env.DATA_DIR && !fs.existsSync(process.env.DATA_DIR)) {
  fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'database.json');
export const EXCEL_PATH = path.join(DATA_DIR, 'leads.xlsx');

// Server configuration
export const PORT = process.env.PORT || 5000;
