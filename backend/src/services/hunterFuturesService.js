import { getHunterDbPool } from './hunterDb.js';

const FUTURE_CONTRACT_TABLE = 'future_contract';

const normalizeRow = row => ({
  symbol: String(row.symbol || '').trim(),
  name: String(row.name || row.symbol || '').trim(),
  type: 'futures',
  market: row.mkt_name || row.mkt_code || 'Futures',
  exchange: row.mkt_code || row.mkt_name || '',
  setup: row.main_flag ? 'Main futures contract' : 'Futures contract',
  change: '0.00%',
  changePercent: 0,
  tone: 'up',
  source: 'mysql-hunter',
  mainFlag: Boolean(row.main_flag),
  mktName: row.mkt_name || '',
  mktCode: row.mkt_code || '',
  varietyCode: row.v_code || '',
  varietyName: row.v_name || ''
});

export const fetchHunterFuturesList = async ({ limit = 5000, keyword = '', mainOnly = true } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 5000, 1), 5000);
  const query = String(keyword || '').trim();
  const conditions = [];
  const params = [];

  if (mainOnly) {
    conditions.push('main_flag = 1');
  }

  if (query) {
    conditions.push('(symbol LIKE ? OR name LIKE ? OR v_code LIKE ? OR v_name LIKE ? OR mkt_name LIKE ? OR mkt_code LIKE ?)');
    params.push(...Array(6).fill(`%${query}%`));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = query
    ? 'ORDER BY main_flag DESC, name ASC, symbol ASC'
    : 'ORDER BY name ASC, symbol ASC';

  const [rows] = await getHunterDbPool().query(
    `SELECT symbol, name, main_flag, v_name, v_code, mkt_name, mkt_code
     FROM ${FUTURE_CONTRACT_TABLE}
     ${where}
     ${orderBy}
     LIMIT ?`,
    [...params, safeLimit]
  );

  return rows
    .map(normalizeRow)
    .filter(item => item.symbol);
};
