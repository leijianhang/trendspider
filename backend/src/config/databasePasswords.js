import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PASSWORD_CONFIG_PATH = path.resolve(__dirname, '../../config/database-passwords.json');

const normalizeEnvironment = value => {
  const env = String(value || 'dev').trim().toLowerCase();
  if (env === 'production') return 'prod';
  if (env === 'development') return 'dev';
  return env || 'dev';
};

let passwordConfig;

const loadPasswordConfig = () => {
  if (passwordConfig) return passwordConfig;
  const raw = fs.readFileSync(PASSWORD_CONFIG_PATH, 'utf8');
  passwordConfig = JSON.parse(raw);
  return passwordConfig;
};

export const getDatabasePassword = key => {
  const env = normalizeEnvironment(process.env.NODE_ENV);
  const config = loadPasswordConfig();
  const password = config[env]?.[key];

  if (!password) {
    throw new Error(`Database password "${key}" is not configured for environment "${env}"`);
  }

  return password;
};
