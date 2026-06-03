import mysql from 'mysql2/promise';
import { getBackendConfigSection } from '../config/backendConfig.js';

let pool;

export const getHunterDbConfig = () => {
  const config = getBackendConfigSection('hunterDb');
  return {
    host: config.host,
    port: Number(config.port || 3306),
    database: config.database,
    user: config.user,
    password: config.password,
    waitForConnections: true,
    connectionLimit: Number(config.connectionLimit || 5),
    connectTimeout: Number(config.connectTimeoutMs || 3000),
    charset: 'utf8mb4'
  };
};

export const getHunterDbPool = () => {
  if (pool) return pool;

  const config = getHunterDbConfig();
  pool = mysql.createPool(config);
  return pool;
};
