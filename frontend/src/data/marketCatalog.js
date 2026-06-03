export const marketSymbols = [
  {
    symbol: '600519',
    name: '贵州茅台',
    type: 'stock',
    market: 'A-Shares',
    last: '1680.00',
    change: '+2.18%',
    tone: 'up',
    score: 92,
    setup: 'Trendline breakout + volume expansion',
    time: '09:42',
    timing: {
      daily: { label: 'Daily Trend', value: 'Strong', score: 88, detail: 'Higher highs confirmed' },
      hourly: { label: '60m Momentum', value: 'Turning Up', score: 82, detail: 'MACD slope rising' },
      intraday: { label: '15m Pullback', value: 'Confirming', score: 69, detail: 'Support retest in progress' },
      risk: { label: 'Risk / Reward', value: '2.4 : 1', score: 74, detail: 'Stop below last pivot' }
    }
  },
  {
    symbol: '000858',
    name: '五粮液',
    type: 'stock',
    market: 'A-Shares',
    last: '168.50',
    change: '+0.74%',
    tone: 'up',
    score: 84,
    setup: 'MA alignment on daily chart',
    time: '09:58',
    timing: {
      daily: { label: 'Daily Trend', value: 'Constructive', score: 79, detail: 'Price holding above MA20' },
      hourly: { label: '60m Momentum', value: 'Stable', score: 73, detail: 'Volume confirms pullback' },
      intraday: { label: '15m Pullback', value: 'Neutral', score: 61, detail: 'Waiting for range break' },
      risk: { label: 'Risk / Reward', value: '1.8 : 1', score: 67, detail: 'Stop below morning low' }
    }
  },
  {
    symbol: '600036',
    name: '招商银行',
    type: 'stock',
    market: 'A-Shares',
    last: '34.20',
    change: '-0.42%',
    tone: 'down',
    score: 63,
    setup: 'Breadth lagging near MA20',
    time: '10:02',
    timing: {
      daily: { label: 'Daily Trend', value: 'Sideways', score: 57, detail: 'Price testing MA20' },
      hourly: { label: '60m Momentum', value: 'Soft', score: 49, detail: 'Lower highs forming' },
      intraday: { label: '15m Pullback', value: 'Weak', score: 44, detail: 'Needs reversal volume' },
      risk: { label: 'Risk / Reward', value: '1.2 : 1', score: 51, detail: 'Support not confirmed' }
    }
  },
  {
    symbol: 'CU2406',
    name: '沪铜',
    type: 'futures',
    market: 'Futures',
    last: '78620',
    change: '+1.06%',
    tone: 'up',
    score: 81,
    setup: 'Volatility rank moved above 80',
    time: '10:09',
    timing: {
      daily: { label: 'Daily Trend', value: 'Strong', score: 84, detail: 'Commodity trend remains bid' },
      hourly: { label: '60m Momentum', value: 'Expanding', score: 86, detail: 'Range expansion confirmed' },
      intraday: { label: '15m Pullback', value: 'Shallow', score: 72, detail: 'Buyers defending VWAP' },
      risk: { label: 'Risk / Reward', value: '2.1 : 1', score: 71, detail: 'Stop below last range base' }
    }
  },
  {
    symbol: 'AU2406',
    name: '沪金',
    type: 'futures',
    market: 'Futures',
    last: '553.12',
    change: '+1.44%',
    tone: 'up',
    score: 78,
    setup: 'Volatility expansion setup',
    time: '10:11',
    timing: {
      daily: { label: 'Daily Trend', value: 'Bullish', score: 80, detail: 'Breakout remains intact' },
      hourly: { label: '60m Momentum', value: 'Rising', score: 77, detail: 'Momentum slope improving' },
      intraday: { label: '15m Pullback', value: 'Orderly', score: 70, detail: 'Support retest holding' },
      risk: { label: 'Risk / Reward', value: '1.9 : 1', score: 68, detail: 'Stop below breakout shelf' }
    }
  },
  {
    symbol: 'IF2405',
    name: '沪深主力',
    type: 'futures',
    market: 'Futures',
    last: '3542.6',
    change: '+0.31%',
    tone: 'up',
    score: 76,
    setup: 'Pullback into support zone',
    time: '10:06',
    timing: {
      daily: { label: 'Daily Trend', value: 'Constructive', score: 76, detail: 'Index above rising support' },
      hourly: { label: '60m Momentum', value: 'Recovering', score: 72, detail: 'MACD histogram improving' },
      intraday: { label: '15m Pullback', value: 'Confirming', score: 66, detail: 'Buyers active near support' },
      risk: { label: 'Risk / Reward', value: '1.7 : 1', score: 64, detail: 'Stop below support zone' }
    }
  }
];

const normalize = value => String(value || '').trim().toLowerCase();

export const findSymbol = (symbol) => {
  const target = normalize(symbol);
  return marketSymbols.find(item => normalize(item.symbol) === target) || null;
};

export const searchSymbols = (keyword, type) => {
  const query = normalize(keyword);
  if (!query) return [];

  return marketSymbols.filter(item => {
    const matchesType = type ? item.type === type : true;
    const matchesKeyword =
      normalize(item.symbol).includes(query) ||
      normalize(item.name).includes(query) ||
      normalize(item.setup).includes(query);

    return matchesType && matchesKeyword;
  });
};

export const getScannerRows = (symbols = marketSymbols) => symbols
  .filter(item => item.score >= 70)
  .sort((a, b) => b.score - a.score);

export const getWatchlistRows = (type, symbols = marketSymbols) => {
  const targetType = type === 'futures' || type === 'Futures' ? 'futures' : 'stock';
  return symbols.filter(item => item.type === targetType).slice(0, 3);
};

export const getAlertRows = (symbol) => {
  const active = findSymbol(symbol) || marketSymbols[0];
  const triggerPrice = active.symbol === '600519'
    ? '1698.00'
    : active.type === 'futures'
      ? active.last
      : active.last;

  return [
    {
      name: `${active.symbol} breaks active trendline`,
      type: 'Price Alert',
      target: triggerPrice,
      status: active.score >= 80 ? 'Triggered' : 'Armed'
    },
    {
      name: `${active.symbol} timing score above 70`,
      type: 'Scanner Bot',
      target: `Score > ${Math.max(70, active.score - 4)}`,
      status: active.score >= 76 ? 'Armed' : 'Waiting'
    },
    {
      name: `${active.symbol} MA momentum confirmation`,
      type: 'Indicator Bot',
      target: active.type === 'futures' ? '60m MACD' : 'Daily MA20',
      status: 'Waiting'
    }
  ];
};

export const getHappeningRows = (symbol) => {
  const active = findSymbol(symbol) || marketSymbols[0];
  const sectorLabel = active.type === 'futures' ? active.name : `${active.name} group`;

  return [
    {
      title: `${active.symbol} ${active.setup}`,
      time: active.time,
      source: 'Scanner',
      tone: active.tone === 'down' ? 'warn' : 'good'
    },
    {
      title: `${sectorLabel} timing score is ${active.score}`,
      time: '10:12',
      source: 'Timing',
      tone: active.score >= 70 ? 'good' : 'warn'
    },
    {
      title: `${active.market} watchlist context updated`,
      time: '10:33',
      source: 'Watchlist',
      tone: 'neutral'
    }
  ];
};

export const getStrategyRows = (symbol) => {
  const active = findSymbol(symbol) || marketSymbols[0];
  const baseProfit = active.score >= 85 ? '+18.4%' : active.score >= 75 ? '+12.7%' : '+4.6%';

  return [
    {
      symbol: active.symbol,
      name: `${active.symbol} Trendline Breakout`,
      trades: active.type === 'futures' ? 38 : 42,
      winRate: active.score >= 80 ? '61.9%' : '56.8%',
      avg: active.score >= 80 ? '2.1R' : '1.5R',
      profit: baseProfit,
      status: active.score >= 70 ? 'Passing' : 'Review'
    },
    {
      symbol: active.symbol,
      name: `${active.symbol} MA Pullback`,
      trades: active.type === 'futures' ? 31 : 36,
      winRate: active.score >= 80 ? '58.3%' : '52.6%',
      avg: '1.7R',
      profit: active.score >= 70 ? '+9.8%' : '+1.9%',
      status: active.score >= 70 ? 'Passing' : 'Review'
    },
    {
      symbol: active.symbol,
      name: `${active.symbol} RSI Reversal`,
      trades: 28,
      winRate: '46.4%',
      avg: '0.8R',
      profit: '-3.2%',
      status: 'Review'
    }
  ];
};

export const getTimingRows = (symbol) => {
  const active = findSymbol(symbol) || marketSymbols[0];
  return Object.values(active.timing);
};
