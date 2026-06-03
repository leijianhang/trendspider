import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

const RECENT_GET_CACHE_TTL_MS = 500;
const pendingGetRequests = new Map();
const recentGetResponses = new Map();

const getDedupeKey = (url, params = {}) => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right));
  return `${url}?${JSON.stringify(entries)}`;
};

const dedupedGet = (url, config = {}) => {
  const key = getDedupeKey(url, config.params);
  if (pendingGetRequests.has(key)) return pendingGetRequests.get(key);

  const cached = recentGetResponses.get(key);
  if (cached && Date.now() - cached.timestamp <= RECENT_GET_CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  const request = apiClient.get(url, config)
    .then(data => {
      recentGetResponses.set(key, { timestamp: Date.now(), data });
      return data;
    })
    .finally(() => {
      pendingGetRequests.delete(key);
    });
  pendingGetRequests.set(key, request);
  return request;
};

export const stockAPI = {
  getAll: (limit = 500) => {
    return dedupedGet('/stock/list', { params: { market: 'all', limit } });
  },

  search: (keyword, limit = 10) => {
    return dedupedGet('/stock/search', { params: { keyword, limit } });
  },

  getKline: (symbol, period = 'daily', adjust = 'qfq', options = {}) => {
    return dedupedGet(`/stock/kline/${symbol}`, {
      params: { period, adjust, ...options }
    });
  }
};

export const futuresAPI = {
  getAll: (limit) => {
    return dedupedGet('/futures/list', { params: limit ? { limit } : {} });
  },

  search: (keyword, limit = 12) => {
    return dedupedGet('/futures/search', { params: { keyword, limit } });
  },

  getKline: (symbol, period = 'daily', options = {}) => {
    return dedupedGet(`/futures/kline/${symbol}`, {
      params: { period, ...options }
    });
  }
};

export const patternAPI = {
  scanTheStrat: (data, patternType) => {
    return apiClient.post('/pattern/the-strat', {
      data,
      patternType
    });
  },

  scanAll: (data, window) => {
    return apiClient.post('/pattern/all', {
      data,
      window
    });
  }
};

export const authAPI = {
  login: ({ username, password }) => {
    return apiClient.post('/auth/login', { username, password });
  }
};

export default apiClient;
