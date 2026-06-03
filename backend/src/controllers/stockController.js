import { fetchStockData, fetchStockList, fetchStockSearch } from '../services/stockService.js';

export const getStockList = async (req, res) => {
  try {
    const { market = 'all', limit = 500 } = req.query;
    const stocks = await fetchStockList({ market, limit });
    res.json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const searchStock = async (req, res) => {
  try {
    const { keyword = '', market = 'all', limit = 500 } = req.query;
    if (!String(keyword).trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a search keyword' });
    }

    const results = await fetchStockSearch(keyword, { market, limit });
    return res.json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getStockKline = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = 'daily', start, end, adjust = 'qfq', limit, before } = req.query;

    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Please provide a stock symbol' });
    }

    const klineData = await fetchStockData(symbol, period, start, end, adjust, { limit, before });
    return res.json({ success: true, data: klineData });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
