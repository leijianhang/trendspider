import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_CONFIG_PATH = path.resolve(__dirname, '../../config/backend-config.json');

const normalizeEnvironment = value => {
  const env = String(value || 'dev').trim().toLowerCase();
  return env || 'dev';
};

let backendConfig;

const loadBackendConfig = () => {
  if (backendConfig) return backendConfig;
  const raw = fs.readFileSync(BACKEND_CONFIG_PATH, 'utf8');
  backendConfig = JSON.parse(raw);
  return backendConfig;
};

export const getBackendConfig = () => {
  const env = normalizeEnvironment(process.env.NODE_ENV);
  const config = loadBackendConfig()[env];

  if (!config) {
    throw new Error(`Backend config is not configured for environment "${env}"`);
  }

  return config;
};

export const getBackendConfigSection = key => {
  const section = getBackendConfig()[key];

  if (!section) {
    throw new Error(`Backend config section "${key}" is not configured`);
  }

  return section;
};
