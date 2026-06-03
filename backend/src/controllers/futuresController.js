import { fetchFuturesData, fetchFuturesList, fetchFuturesSearch } from '../services/futuresService.js';

export const getFuturesList = async (req, res) => {
  try {
    const { limit = 5000 } = req.query;
    const futures = await fetchFuturesList({ limit });
    return res.json({ success: true, data: futures });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const searchFutures = async (req, res) => {
  try {
    const { keyword = '', limit = 12 } = req.query;
    if (!String(keyword).trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a search keyword' });
    }

    const results = await fetchFuturesSearch(keyword, { limit });
    return res.json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getFuturesKline = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = 'daily', start, end, limit, before } = req.query;

    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Missing futures symbol' });
    }

    const klineData = await fetchFuturesData(symbol, period, start, end, { limit, before });
    res.json({ success: true, data: klineData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
