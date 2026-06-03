import axios from 'axios';
import NodeCache from 'node-cache';
import { getDatabasePassword } from '../config/databasePasswords.js';
import { fetchHunterStockList } from './hunterStockService.js';

const cache = new NodeCache({ stdTTL: 300 });

const HUNTER_QUERY_TIMEOUT_MS = Number(process.env.HUNTER_DB_QUERY_TIMEOUT_MS || 3500);
const STOCK_PERIOD_TABLES = {
  '1min': 'stock_1min',
  '5min': 'stock_1min',
  '15min': 'stock_1min',
  '30min': 'stock_1min',
  '60min': 'stock_1h',
  daily: 'stock_daily',
  weekly: 'stock_daily',
  monthly: 'stock_daily'
};
const STOCK_PERIOD_LIMITS = {
  '1min': 400,
  '5min': 1200,
  '15min': 1800,
  '30min': 1800,
  '60min': 400,
  daily: 300,
  weekly: 900,
  monthly: 1200
};

const fetchHunterStockListWithTimeout = options => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Hunter MySQL query timed out')), HUNTER_QUERY_TIMEOUT_MS);
  });

  return Promise.race([fetchHunterStockList(options), timeout])
    .finally(() => clearTimeout(timeoutId));
};

const escapeSqlString = value => String(value || '').replaceAll('\\', '\\\\').replaceAll("'", "''");

const normalizeSymbol = symbol => String(symbol || '').trim();

const normalizeStockTsCode = symbol => {
  const value = normalizeSymbol(symbol).toUpperCase();
  if (!value) return '';
  if (value.includes('.')) return value;
  if (value.startsWith('6')) return `${value}.SH`;
  if (value.startsWith('8') || value.startsWith('4')) return `${value}.BJ`;
  return `${value}.SZ`;
};

const normalizeLimit = (value, fallback) =>
  Math.min(Math.max(Number(value) || fallback, 1), 5000);

const getTaosAuthHeader = () => {
  const user = process.env.HUNTER_TAOS_USER || 'hunter';
  const password = getDatabasePassword('hunterTaos');
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
};

const queryTaos = async sql => {
  const response = await axios.post(process.env.HUNTER_TAOS_REST_URL || 'http://192.168.1.48:6041/rest/sql', sql, {
    timeout: Number(process.env.HUNTER_TAOS_TIMEOUT_MS || 6000),
    headers: {
      Authorization: getTaosAuthHeader(),
      'Content-Type': 'text/plain'
    }
  });
  if (response.data?.code !== 0) {
    throw new Error(response.data?.desc || 'TDengine query failed');
  }
  return response.data?.data || [];
};

const normalizeTaosTime = value => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 19).replace('T', ' ');
};

const normalizeTaosRow = row => ({
  time: normalizeTaosTime(row[0]),
  open: Number(row[1]),
  high: Number(row[2]),
  low: Number(row[3]),
  close: Number(row[4]),
  volume: Number(row[5]),
  amount: Number(row[6]),
  change: Number(row[7]),
  pctChange: Number(row[8]),
  source: 'tdengine'
});

const parseLocalTimeParts = time => {
  const match = String(time || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] || 0),
    minute: Number(match[5] || 0),
    second: Number(match[6] || 0)
  };
};

const pad2 = value => String(value).padStart(2, '0');

const getBucketStart = (time, period) => {
  const parts = parseLocalTimeParts(time);
  if (!parts) return time;

  if (period === 'weekly') {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    return date.toISOString().slice(0, 10);
  }

  if (period === 'monthly') {
    return `${parts.year}-${pad2(parts.month)}-01`;
  }

  const minuteMap = { '5min': 5, '15min': 15, '30min': 30 };
  const bucketMinutes = minuteMap[period];
  if (!bucketMinutes) return time;
  const localMinutes = parts.hour * 60 + parts.minute;
  const bucketLocalMinutes = Math.floor(localMinutes / bucketMinutes) * bucketMinutes;
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(Math.floor(bucketLocalMinutes / 60))}:${pad2(bucketLocalMinutes % 60)}:00`;
};

const aggregateRows = (rows, period) => {
  if (!['5min', '15min', '30min', 'weekly', 'monthly'].includes(period)) return rows;

  const grouped = new Map();
  rows.forEach(row => {
    const bucket = getBucketStart(row.time, period);
    const current = grouped.get(bucket);
    if (!current) {
      grouped.set(bucket, { ...row, time: bucket });
      return;
    }
    current.high = Math.max(current.high, row.high);
    current.low = Math.min(current.low, row.low);
    current.close = row.close;
    current.volume += row.volume;
    current.amount += row.amount;
  });

  return Array.from(grouped.values());
};

const appendChangeFields = rows => rows.map((row, index) => {
  const previousClose = Number(rows[index - 1]?.close);
  const close = Number(row.close);
  const rowChange = Number(row.change);
  const rowPctChange = Number(row.pctChange);
  const change = Number.isFinite(rowChange)
    ? rowChange
    : Number.isFinite(close) && Number.isFinite(previousClose)
    ? close - previousClose
    : 0;
  const pctChange = Number.isFinite(rowPctChange)
    ? rowPctChange
    : Number.isFinite(previousClose) && previousClose !== 0
    ? (change / previousClose) * 100
    : 0;
  return {
    ...row,
    change,
    pctChange
  };
});

const fetchStockDataFromTaos = async (symbol, period, { limit: requestedLimit, before } = {}) => {
  const table = STOCK_PERIOD_TABLES[period] || STOCK_PERIOD_TABLES.daily;
  const limit = normalizeLimit(requestedLimit, STOCK_PERIOD_LIMITS[period] || STOCK_PERIOD_LIMITS.daily);
  const database = process.env.HUNTER_TAOS_DATABASE || 'hunter_db';
  const normalizedSymbol = normalizeStockTsCode(symbol);
  if (!normalizedSymbol) return [];

  const conditions = [`ts_code='${escapeSqlString(normalizedSymbol)}'`];
  if (before) {
    conditions.push(`trade_time < '${escapeSqlString(before)}'`);
  }

  const selectFields = period === 'daily'
    ? 'SELECT trade_time, open, high, low, close, vol, amount, change, pct_chg'
    : 'SELECT trade_time, open, high, low, close, vol, amount';
  const sql = [
    selectFields,
    `FROM ${database}.${table}`,
    `WHERE ${conditions.join(' AND ')}`,
    'ORDER BY trade_time DESC',
    `LIMIT ${limit}`
  ].join(' ');
  const rows = (await queryTaos(sql))
    .map(normalizeTaosRow)
    .filter(item => (
      item.time &&
      Number.isFinite(item.open) &&
      Number.isFinite(item.high) &&
      Number.isFinite(item.low) &&
      Number.isFinite(item.close)
    ))
    .reverse();

  return appendChangeFields(aggregateRows(rows, period));
};

export const fetchStockList = async ({ market = 'all', limit = 500 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 5000);
  const cacheKey = `stock_list_${market}_${safeLimit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchHunterStockListWithTimeout({ market, limit: safeLimit });
    cache.set(cacheKey, data, 60);
    return data;
  } catch (error) {
    console.error('Failed to fetch hunter stock list:', error.message);
    return [];
  }
};

export const fetchStockSearch = async (keyword, { market = 'all', limit = 500 } = {}) => {
  const query = String(keyword || '').trim().toLowerCase();
  if (!query) return [];

  try {
    return await fetchHunterStockListWithTimeout({ market, limit, keyword: query });
  } catch (error) {
    console.error('Failed to search hunter stock list:', error.message);
    return [];
  }
};

export const fetchStockData = async (symbol, period = 'daily', start, end, adjust = 'qfq', options = {}) => {
  const cacheKey = `stock_${symbol}_${period}_${adjust}_${options.limit || ''}_${options.before || ''}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchStockDataFromTaos(symbol, period, options);
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Failed to fetch stock kline from TDengine:', error.message);
    cache.set(cacheKey, []);
    return [];
  }
};
