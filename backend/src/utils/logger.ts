import fs from 'fs';
import path from 'path';

const logDir = path.join(__dirname, '../../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logger = {
  info: (message: string, meta?: any) => {
    const log = `[INFO] ${new Date().toISOString()} - ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(path.join(logDir, 'app.log'), log);
    console.log(log);
  },
  error: (message: string, meta?: any) => {
    const log = `[ERROR] ${new Date().toISOString()} - ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(path.join(logDir, 'error.log'), log);
    console.error(log);
  },
  warn: (message: string, meta?: any) => {
    const log = `[WARN] ${new Date().toISOString()} - ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(path.join(logDir, 'app.log'), log);
    console.warn(log);
  }
};