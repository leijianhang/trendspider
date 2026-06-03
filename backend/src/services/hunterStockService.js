import { getHunterDbPool } from './hunterDb.js';

const STOCK_INFO_TABLE = 'stock_info';
const COLUMN_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedColumns;
let cachedColumnsAt = 0;

const symbolFields = ['symbol', 'stock_code', 'code', 'ts_code', 'sec_code', 'security_code'];
const nameFields = ['name', 'stock_name', 'sec_name', 'security_name', 'short_name'];
const marketFields = ['market', 'exchange', 'exchange_code', 'stock_exchange', 'area'];
const industryFields = ['industry', 'sector', 'industry_name'];
const priceFields = ['last', 'price', 'close', 'last_price', 'latest_price'];
const changePercentFields = ['change_percent', 'pct_chg', 'change_pct', 'increase_rate'];

const quoteIdentifier = identifier => `\`${String(identifier).replaceAll('`', '``')}\``;

const pickColumn = (columns, candidates) =>
  candidates.find(candidate => columns.includes(candidate));

const normalizeSymbol = value => {
  const raw = String(value || '').trim();
  const match = raw.match(/\d{6}/);
  return match ? match[0] : raw;
};

const inferMarket = (symbol, rawMarket) => {
  const market = String(rawMarket || '').trim().toLowerCase();
  if (['sh', 'sse', 'xshg', '上交所', '上海'].includes(market) || symbol.startsWith('6')) return 'sh';
  if (['bj', 'bse', 'xbj', '北交所', '北京'].includes(market) || symbol.startsWith('8') || symbol.startsWith('4')) return 'bj';
  return 'sz';
};

const formatPercent = value => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00%';
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`;
};

const getColumns = async () => {
  const now = Date.now();
  if (cachedColumns && now - cachedColumnsAt < COLUMN_CACHE_TTL_MS) return cachedColumns;

  const [rows] = await getHunterDbPool().query(
    `SELECT COLUMN_NAME AS columnName
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [STOCK_INFO_TABLE]
  );

  cachedColumns = rows.map(row => row.columnName);
  cachedColumnsAt = now;
  return cachedColumns;
};

const buildQuery = ({ columns, market, keyword, limit }) => {
  const symbolColumn = pickColumn(columns, symbolFields);
  const nameColumn = pickColumn(columns, nameFields);
  const marketColumn = pickColumn(columns, marketFields);

  if (!symbolColumn || !nameColumn) {
    throw new Error('stock_info must include stock code and name columns');
  }

  const conditions = [];
  const params = [];

  if (market !== 'all' && marketColumn) {
    conditions.push(`LOWER(${quoteIdentifier(marketColumn)}) LIKE ?`);
    params.push(`%${String(market).toLowerCase()}%`);
  }

  if (keyword) {
    const industryColumn = pickColumn(columns, industryFields);
    const searchableColumns = [symbolColumn, nameColumn, marketColumn, industryColumn].filter(Boolean);
    conditions.push(`(${searchableColumns.map(column => `${quoteIdentifier(column)} LIKE ?`).join(' OR ')})`);
    params.push(...searchableColumns.map(() => `%${keyword}%`));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return {
    sql: `SELECT * FROM ${quoteIdentifier(STOCK_INFO_TABLE)} ${where} LIMIT ?`,
    params: [...params, limit]
  };
};

const normalizeRow = (row, columns) => {
  const symbolColumn = pickColumn(columns, symbolFields);
  const nameColumn = pickColumn(columns, nameFields);
  const marketColumn = pickColumn(columns, marketFields);
  const industryColumn = pickColumn(columns, industryFields);
  const priceColumn = pickColumn(columns, priceFields);
  const changePercentColumn = pickColumn(columns, changePercentFields);
  const symbol = normalizeSymbol(row[symbolColumn]);
  const changePercent = Number(row[changePercentColumn]);
  const last = Number(row[priceColumn]);
  const market = String(row[marketColumn] || '').trim();
  const industry = String(row[industryColumn] || '').trim();

  return {
    symbol,
    name: String(row[nameColumn] || symbol),
    type: 'stock',
    market: market || inferMarket(symbol, row[marketColumn]),
    exchange: inferMarket(symbol, row[marketColumn]),
    industry,
    last: Number.isFinite(last) ? last : null,
    change: formatPercent(changePercent),
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
    tone: changePercent < 0 ? 'down' : 'up',
    source: 'mysql-hunter'
  };
};

export const fetchHunterStockList = async ({ market = 'all', limit = 500, keyword = '' } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 5000);
  const columns = await getColumns();
  const { sql, params } = buildQuery({
    columns,
    market,
    keyword: String(keyword || '').trim(),
    limit: safeLimit
  });
  const [rows] = await getHunterDbPool().query(sql, params);

  return rows
    .map(row => normalizeRow(row, columns))
    .filter(item => item.symbol);
};
