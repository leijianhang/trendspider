import mysql from 'mysql2/promise';

let pool;

export const getHunterDbConfig = () => ({
  host: process.env.HUNTER_DB_HOST || '192.168.1.78',
  port: Number(process.env.HUNTER_DB_PORT || 3306),
  database: process.env.HUNTER_DB_NAME || 'hunter_db',
  user: process.env.HUNTER_DB_USER || 'hunter',
  password: process.env.HUNTER_DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: Number(process.env.HUNTER_DB_CONNECTION_LIMIT || 5),
  connectTimeout: Number(process.env.HUNTER_DB_CONNECT_TIMEOUT_MS || 3000),
  charset: 'utf8mb4'
});

export const getHunterDbPool = () => {
  if (pool) return pool;

  const config = getHunterDbConfig();
  if (!config.password) {
    throw new Error('HUNTER_DB_PASSWORD is not configured');
  }

  pool = mysql.createPool(config);
  return pool;
};
