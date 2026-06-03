import { futuresAPI, stockAPI } from '../services/api';
import { marketSymbols } from './marketCatalog';

const normalizeNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeChange = item => {
  if (typeof item.change === 'string' && item.change.includes('%')) return item.change;
  const percent = Number(item.changePercent ?? item.change);
  if (!Number.isFinite(percent)) return '0.00%';
  return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
};

export const normalizeMarketItem = item => {
  const symbol = String(item?.symbol || '').trim();
  const change = normalizeChange(item || {});
  const changePercent = parseFloat(change);

  return {
    ...item,
    symbol,
    name: item?.name || symbol,
    type: item?.type || 'stock',
    market: item?.market || item?.exchange || 'A-Shares',
    exchange: item?.exchange || item?.market || '',
    last: normalizeNumber(item?.last ?? item?.price)?.toString() || item?.last || '',
    change,
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
    tone: item?.tone || (changePercent < 0 ? 'down' : 'up'),
    setup: item?.setup || (item?.source === 'eastmoney' ? 'Live quote from Eastmoney' : 'Live market quote'),
    score: Number.isFinite(Number(item?.score)) ? Number(item.score) : Math.max(50, Math.min(95, 70 + Math.round((Number(changePercent) || 0) * 4))),
    time: item?.time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  };
};

export const normalizeMarketItems = items => (
  (items || []).map(normalizeMarketItem).filter(item => item.symbol)
);

export const getFallbackMarketSymbols = () => marketSymbols.map(normalizeMarketItem);

export const loadLiveMarketSymbols = async ({ limit = 10 } = {}) => {
  try {
    const [stockResponse, futuresResponse] = await Promise.all([
      stockAPI.getAll(limit),
      futuresAPI.getAll()
    ]);
    const stockRows = normalizeMarketItems(stockResponse?.data || []);
    const futuresRows = normalizeMarketItems(futuresResponse?.data || []);
    if (!stockRows.length && !futuresRows.length) return getFallbackMarketSymbols();

    const fallbackItems = getFallbackMarketSymbols();
    return [
      ...(stockRows.length ? stockRows : fallbackItems.filter(item => item.type === 'stock').slice(0, limit)),
      ...(futuresRows.length ? futuresRows : fallbackItems.filter(item => item.type === 'futures'))
    ];
  } catch {
    return getFallbackMarketSymbols();
  }
};

export const loadLiveFutures = async () => {
  try {
    const response = await futuresAPI.getAll();
    const rows = normalizeMarketItems(response?.data || []);
    if (rows.length) return rows;
  } catch {
    // Fall through to static futures symbols.
  }

  return getFallbackMarketSymbols().filter(item => item.type === 'futures');
};

export const searchLiveStocks = async (keyword, { limit = 10 } = {}) => {
  try {
    const response = await stockAPI.search(keyword, limit);
    return normalizeMarketItems(response?.data || []).slice(0, limit);
  } catch {
    const query = String(keyword || '').trim().toLowerCase();
    return getFallbackMarketSymbols().filter(item => (
      item.type === 'stock' &&
      (item.symbol.toLowerCase().includes(query) || item.name.toLowerCase().includes(query))
    )).slice(0, limit);
  }
};

export const searchLiveFutures = async (keyword, { limit = 12 } = {}) => {
  try {
    const response = await futuresAPI.search(keyword, limit);
    return normalizeMarketItems(response?.data || []).slice(0, limit);
  } catch {
    const query = String(keyword || '').trim().toLowerCase();
    return getFallbackMarketSymbols().filter(item => (
      item.type === 'futures' &&
      (item.symbol.toLowerCase().includes(query) || item.name.toLowerCase().includes(query))
    )).slice(0, limit);
  }
};
