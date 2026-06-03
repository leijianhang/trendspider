const STORAGE_VERSION = 1;

export const STRATEGY_STORAGE_KEY = 'trendspider.strategyTester.strategies.v1';

export const strategyTimeframeOptions = ['1min', '2min', '3min', '4min', '5min', '6min', '10min', '12min', '15min', '30min', '45min', '1hr', '65min', '90min', '2hr', '4hr', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
export const strategyFieldOptions = ['Close', 'Open', 'High', 'Low', 'Volume', 'SMA(20)', 'SMA(50)', 'EMA(21)', 'RSI(14)', '4 Green Candles', 'Stop Loss', 'Take Profit', 'Bars in trade'];
export const strategyOperatorOptions = ['is above', 'is below', 'crosses above', 'crosses below', 'is detected', 'equals', 'reaches'];
export const strategyTargetOptions = ['SMA(20)', 'SMA(50)', 'EMA(21)', 'RSI 50', 'Current Candle', '2.0%', '4.0%', '8 candles', 'Previous High', 'Previous Low'];
export const strategyNoteOptions = ['last', 'next open', 'next close', 'current candle'];
export const exitModeOptions = ['Script', 'Take Profit', 'Stop Loss', 'Trailing Stop', 'Entry Invalidated', '# Candles Passed', 'List of Signals'];

const makeId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;

const formatPercent = value => `${value >= 0 ? '+' : ''}${round(value, 1)}%`;

const formatR = value => `${value >= 0 ? '+' : ''}${round(value, 1)}R`;

const getBarPrice = (bar, tradeBy = 'Next Open') => {
  if (!bar) return 0;
  if (tradeBy === 'Next Close') return Number(bar.close || bar.open || 0);
  if (tradeBy === 'High') return Number(bar.high || bar.close || 0);
  if (tradeBy === 'Low') return Number(bar.low || bar.close || 0);
  return Number(bar.open || bar.close || 0);
};

const normalizeMarkerTime = time => {
  if (typeof time === 'number') return time;
  if (typeof time === 'string') {
    const parsed = Date.parse(time);
    return Number.isNaN(parsed) ? time : Math.floor(parsed / 1000);
  }
  return time;
};

const normalizeDirection = direction => direction === 'Short' ? 'Short' : 'Long';

const calculateReturn = ({ entryPrice, exitPrice, direction, tradeCostPercent }) => {
  if (!entryPrice) return 0;
  const raw = direction === 'Short'
    ? ((entryPrice - exitPrice) / entryPrice) * 100
    : ((exitPrice - entryPrice) / entryPrice) * 100;
  return round(raw - Number(tradeCostPercent || 0), 2);
};

const getRuleReason = script => {
  const enabledRules = script?.rules?.filter(rule => rule.enabled !== false) || [];
  if (!enabledRules.length) return script?.mode || 'No active rules';
  return enabledRules.map(rule => `${rule.left} ${rule.operator} ${rule.right}`).join(' + ');
};

const createRule = overrides => ({
  id: makeId('rule'),
  type: 'Condition',
  timeframe: 'Daily',
  left: 'Close',
  operator: 'is above',
  right: 'SMA(20)',
  note: 'last',
  enabled: true,
  ...overrides
});

const createRuleGroup = (timeframe = 'Daily') => ({
  id: makeId('rule-group'),
  type: 'Condition Group',
  logic: 'All of the following',
  timing: 'happened',
  symbolScope: 'On Current Symbol',
  symbol: '',
  rules: [createRule({ timeframe })]
});

const appendToRuleGroup = (rules, groupId, child) => rules.map(rule => {
  if (rule.id === groupId && rule.type === 'Condition Group') {
    return { ...rule, rules: [...(rule.rules || []), child] };
  }
  if (rule.type === 'Condition Group') {
    return { ...rule, rules: appendToRuleGroup(rule.rules || [], groupId, child) };
  }
  return rule;
});

const updateRuleGroupById = (rules, groupId, patch) => rules.map(rule => {
  if (rule.id === groupId && rule.type === 'Condition Group') return { ...rule, ...patch };
  if (rule.type === 'Condition Group') return { ...rule, rules: updateRuleGroupById(rule.rules || [], groupId, patch) };
  return rule;
});

const updateRuleById = (rules, ruleId, patch) => rules.map(rule => {
  if (rule.id === ruleId) return { ...rule, ...patch };
  if (rule.type === 'Condition Group') return { ...rule, rules: updateRuleById(rule.rules || [], ruleId, patch) };
  return rule;
});

const removeRuleById = (rules, ruleId) => rules
  .filter(rule => rule.id !== ruleId)
  .map(rule => rule.type === 'Condition Group'
    ? { ...rule, rules: removeRuleById(rule.rules || [], ruleId) }
    : rule);

const cloneRuleTree = rules => (rules || []).map(rule => {
  const next = {
    ...structuredClone(rule),
    id: makeId(rule.type === 'Condition Group' ? 'rule-group' : 'rule')
  };
  if (next.type === 'Condition Group') next.rules = cloneRuleTree(next.rules || []);
  return next;
});

const createScript = (kind, overrides = {}) => ({
  id: makeId(kind === 'entry' ? 'entry-script' : 'exit-script'),
  name: kind === 'entry' ? 'Entry Script 1' : 'Exit Script 1',
  mode: 'Script',
  logic: kind === 'entry' ? 'All of the following' : 'Any of the following',
  signalList: '',
  exitConfig: {},
  rules: kind === 'entry'
    ? [
        createRule({ left: 'Close', operator: 'is above', right: 'SMA(20)' }),
        createRule({ left: '4 Green Candles', operator: 'is detected', right: 'Current Candle' })
      ]
    : [
        createRule({ left: 'SMA(20)', operator: 'crosses below', right: 'SMA(50)', note: 'next open' }),
        createRule({ timeframe: 'Risk', left: 'Stop Loss', operator: 'equals', right: '2.0%', note: 'next open' })
      ],
  ...overrides
});

const getTags = name => (name.match(/#[a-z0-9_-]+/gi) || []).map(tag => tag.toLowerCase());

const migrateStrategy = strategy => {
  if (!strategy || typeof strategy !== 'object') return null;
  const name = strategy.name || 'Untitled Strategy';
  return {
    id: strategy.id || makeId('strategy'),
    name,
    tags: Array.isArray(strategy.tags) ? strategy.tags : getTags(name),
    symbol: strategy.symbol || '',
    timeframe: strategy.timeframe || 'Daily',
    depthMode: strategy.depthMode || 'candles',
    candleDepth: Number(strategy.candleDepth || 300),
    dateRange: strategy.dateRange || { start: '', end: '' },
    direction: normalizeDirection(strategy.direction),
    tradeBy: strategy.tradeBy || 'Next Open',
    tradeCostPercent: Number(strategy.tradeCostPercent || 0.03),
    chartSource: strategy.chartSource || 'Candles',
    extendedHours: Boolean(strategy.extendedHours),
    entryScripts: Array.isArray(strategy.entryScripts) ? strategy.entryScripts : [createScript('entry')],
    exitScripts: Array.isArray(strategy.exitScripts) ? strategy.exitScripts : [createScript('exit')],
    updatedAt: strategy.updatedAt || new Date().toISOString()
  };
};

export const createDefaultStrategy = ({ symbol = '', timeframe = 'Daily' } = {}) => migrateStrategy({
  id: makeId('strategy'),
  name: 'Trendline Breakout Strategy',
  symbol,
  timeframe: timeframe === 'daily' ? 'Daily' : timeframe,
  depthMode: 'candles',
  candleDepth: 300,
  direction: 'Long',
  tradeBy: 'Next Open',
  tradeCostPercent: 0.03,
  entryScripts: [createScript('entry')],
  exitScripts: [createScript('exit')]
});

export const createNewStrategy = ({ symbol = '', timeframe = 'Daily' } = {}) => migrateStrategy({
  id: makeId('strategy'),
  name: 'New Strategy',
  symbol,
  timeframe: timeframe === 'daily' ? 'Daily' : timeframe,
  depthMode: 'candles',
  candleDepth: 300,
  direction: 'Long',
  tradeBy: 'Next Open',
  tradeCostPercent: 0.03,
  entryScripts: [],
  exitScripts: []
});

export const cloneStrategy = strategy => migrateStrategy({
  ...structuredClone(migrateStrategy(strategy)),
  id: makeId('strategy'),
  name: `${strategy.name || 'Untitled Strategy'} Copy`,
  updatedAt: new Date().toISOString()
});

export const addStrategyRule = (strategy, kind, scriptId, overrides = {}) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId
    ? { ...script, rules: [...script.rules, createRule({ timeframe: next.timeframe, ...overrides })] }
    : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const addStrategyRuleGroup = (strategy, kind, scriptId) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId
    ? { ...script, rules: [...script.rules, createRuleGroup(next.timeframe)] }
    : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const addStrategyNestedRule = (strategy, kind, scriptId, groupId, overrides = {}) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId
    ? { ...script, rules: appendToRuleGroup(script.rules, groupId, createRule({ timeframe: next.timeframe, ...overrides })) }
    : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const addStrategyNestedRuleGroup = (strategy, kind, scriptId, groupId) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId
    ? { ...script, rules: appendToRuleGroup(script.rules, groupId, createRuleGroup(next.timeframe)) }
    : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const updateStrategyRuleGroup = (strategy, kind, scriptId, groupId, patch) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId
    ? { ...script, rules: updateRuleGroupById(script.rules, groupId, patch) }
    : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const addStrategyScript = (strategy, kind, mode = 'Script') => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  const index = next[key].length + 1;
  const title = kind === 'entry' ? 'Entry Script' : mode === 'Script' ? 'Exit Script' : mode;
  next[key] = [
    ...next[key],
    createScript(kind, {
      name: `${title} ${index}`,
      mode,
      logic: kind === 'entry' ? 'All of the following' : 'Any of the following',
      rules: mode === 'Script' ? [createRule({ timeframe: next.timeframe })] : []
    })
  ];
  next.updatedAt = new Date().toISOString();
  return next;
};

export const duplicateStrategyScript = (strategy, kind, scriptId) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  const source = next[key].find(script => script.id === scriptId);
  if (!source) return next;
  const copy = {
    ...structuredClone(source),
    id: makeId(kind === 'entry' ? 'entry-script' : 'exit-script'),
    name: `${source.name || (kind === 'entry' ? 'Entry Script' : 'Exit Script')} Copy`,
    rules: cloneRuleTree(source.rules || [])
  };
  const index = next[key].findIndex(script => script.id === scriptId);
  next[key] = [
    ...next[key].slice(0, index + 1),
    copy,
    ...next[key].slice(index + 1)
  ];
  next.updatedAt = new Date().toISOString();
  return next;
};

export const removeStrategyScript = (strategy, kind, scriptId) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  const remaining = next[key].filter(script => script.id !== scriptId);
  next[key] = remaining.length ? remaining : [createScript(kind)];
  next.updatedAt = new Date().toISOString();
  return next;
};

export const removeStrategyRule = (strategy, kind, scriptId, ruleId) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId
    ? { ...script, rules: removeRuleById(script.rules, ruleId) }
    : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const removeStrategyNestedRule = (strategy, kind, scriptId, groupId, ruleId) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId
    ? { ...script, rules: removeRuleById(script.rules, ruleId) }
    : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const updateStrategyRule = (strategy, kind, scriptId, ruleId, patch) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId
    ? { ...script, rules: updateRuleById(script.rules, ruleId, patch) }
    : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const updateStrategyNestedRule = (strategy, kind, scriptId, groupId, ruleId, patch) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId
    ? { ...script, rules: updateRuleById(script.rules, ruleId, patch) }
    : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const updateStrategyScript = (strategy, kind, scriptId, patch) => {
  const key = kind === 'entry' ? 'entryScripts' : 'exitScripts';
  const next = structuredClone(migrateStrategy(strategy));
  next[key] = next[key].map(script => script.id === scriptId ? { ...script, ...patch } : script);
  next.updatedAt = new Date().toISOString();
  return next;
};

export const updateStrategySettings = (strategy, patch) => {
  const next = migrateStrategy({ ...strategy, ...patch, updatedAt: new Date().toISOString() });
  next.tags = getTags(next.name);
  return next;
};

export const serializeStrategies = strategies => JSON.stringify({
  version: STORAGE_VERSION,
  strategies: (strategies || []).map(migrateStrategy).filter(Boolean)
});

export const deserializeStrategies = raw => {
  try {
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed) ? parsed : parsed?.strategies;
    return Array.isArray(source) ? source.map(migrateStrategy).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const filterBarsByDepth = (bars, strategy) => {
  if (!Array.isArray(bars)) return [];
  if (strategy.depthMode === 'dateRange' && strategy.dateRange?.start && strategy.dateRange?.end) {
    return bars.filter(bar => String(bar.time) >= strategy.dateRange.start && String(bar.time) <= strategy.dateRange.end);
  }
  const depth = Math.max(8, Number(strategy.candleDepth || 300));
  return bars.slice(Math.max(0, bars.length - depth));
};

const shouldEnter = (bars, index, direction) => {
  const previous = bars[index - 1];
  const current = bars[index];
  if (!previous || !current) return false;
  const close = Number(current.close || 0);
  const prevClose = Number(previous.close || 0);
  const volume = Number(current.volume || 0);
  const prevVolume = Number(previous.volume || 0);
  return direction === 'Short'
    ? close < prevClose && volume >= prevVolume * 0.85
    : close > prevClose && volume >= prevVolume * 0.85;
};

const shouldExit = (bars, entryIndex, index, direction) => {
  const entry = bars[entryIndex];
  const previous = bars[index - 1];
  const current = bars[index];
  if (!entry || !previous || !current) return false;
  const held = index - entryIndex;
  const move = direction === 'Short'
    ? ((Number(entry.close) - Number(current.close)) / Number(entry.close)) * 100
    : ((Number(current.close) - Number(entry.close)) / Number(entry.close)) * 100;
  const reversed = direction === 'Short'
    ? Number(current.close) > Number(previous.close)
    : Number(current.close) < Number(previous.close);
  return held >= 3 || move >= 4 || move <= -2 || (held >= 1 && reversed);
};

const buildPerformance = trades => trades.reduce((points, trade, index) => {
  const last = points[points.length - 1]?.value || 100;
  points.push({ label: `Trade ${index + 1}`, value: round(last * (1 + trade.returnPercent / 100), 2) });
  return points;
}, [{ label: 'Start', value: 100 }]);

const buildPbe = trades => {
  const all = trades.map(trade => ({ x: trade.lengthCandles, y: trade.returnPercent }));
  const winners = all.filter((_, index) => trades[index].status === 'Win');
  const losers = all.filter((_, index) => trades[index].status === 'Loss');
  return { all, winners, losers };
};

const buildMetrics = (trades, performance, bars) => {
  const wins = trades.filter(trade => trade.status === 'Win');
  const losses = trades.filter(trade => trade.status === 'Loss');
  const netProfit = performance[performance.length - 1]?.value - 100 || 0;
  const peakDrawdown = performance.reduce((state, point) => {
    const peak = Math.max(state.peak, point.value);
    return { peak, drawdown: Math.min(state.drawdown, ((point.value - peak) / peak) * 100) };
  }, { peak: 100, drawdown: 0 }).drawdown;
  const averageReturn = trades.length ? trades.reduce((sum, trade) => sum + trade.returnPercent, 0) / trades.length : 0;
  const exposureCandles = trades.reduce((sum, trade) => sum + trade.lengthCandles, 0);

  return {
    netProfit: formatPercent(netProfit),
    winRate: trades.length ? `${round((wins.length / trades.length) * 100, 1)}%` : '0%',
    maxDrawdown: formatPercent(peakDrawdown),
    trades: String(trades.length),
    avgR: formatR(averageReturn / 2),
    exposure: bars.length ? `${round((exposureCandles / bars.length) * 100, 1)}%` : '0%',
    expectancy: formatPercent(averageReturn),
    winners: String(wins.length),
    losers: String(losses.length)
  };
};

const buildMarkers = trades => trades.flatMap(trade => [
  {
    time: normalizeMarkerTime(trade.entryTime),
    position: trade.direction === 'Short' ? 'aboveBar' : 'belowBar',
    color: trade.direction === 'Short' ? '#ff8a5c' : '#4ee093',
    shape: trade.direction === 'Short' ? 'arrowDown' : 'arrowUp',
    text: trade.direction === 'Short' ? 'Short' : 'Buy'
  },
  {
    time: normalizeMarkerTime(trade.exitTime),
    position: trade.direction === 'Short' ? 'belowBar' : 'aboveBar',
    color: trade.status === 'Win' ? '#4ee093' : '#ff8a9a',
    shape: trade.direction === 'Short' ? 'arrowUp' : 'arrowDown',
    text: 'Exit'
  }
]);

export const runStrategyBacktest = ({ strategy, bars = [], symbol = '' }) => {
  const normalized = migrateStrategy(strategy || createDefaultStrategy({ symbol }));
  const scopedBars = filterBarsByDepth(bars, normalized);
  const warnings = [];

  if (scopedBars.length < 4) {
    return {
      runId: makeId('run'),
      strategyId: normalized.id,
      symbol: symbol || normalized.symbol || 'Active chart',
      startedAt: new Date().toISOString(),
      status: 'empty',
      metrics: buildMetrics([], [{ label: 'Start', value: 100 }], scopedBars),
      trades: [],
      performance: [{ label: 'Start', value: 100 }],
      pbe: { all: [], winners: [], losers: [] },
      markers: [],
      warnings: ['Not enough chart history to run a backtest.']
    };
  }

  const direction = normalizeDirection(normalized.direction);
  const entryScript = normalized.entryScripts[0];
  const exitScript = normalized.exitScripts[0];
  const trades = [];
  let index = 1;

  while (index < scopedBars.length - 2) {
    if (!shouldEnter(scopedBars, index, direction)) {
      index += 1;
      continue;
    }

    const entryIndex = Math.min(index + 1, scopedBars.length - 1);
    let exitIndex = Math.min(entryIndex + 1, scopedBars.length - 1);

    while (exitIndex < scopedBars.length - 1 && !shouldExit(scopedBars, entryIndex, exitIndex, direction)) {
      exitIndex += 1;
    }

    const entryBar = scopedBars[entryIndex];
    const exitBar = scopedBars[exitIndex];
    const entryPrice = getBarPrice(entryBar, normalized.tradeBy);
    const exitPrice = getBarPrice(exitBar, normalized.tradeBy);
    const returnPercent = calculateReturn({
      entryPrice,
      exitPrice,
      direction,
      tradeCostPercent: normalized.tradeCostPercent
    });
    const span = scopedBars.slice(entryIndex, exitIndex + 1);
    const maxHigh = Math.max(...span.map(bar => Number(bar.high || bar.close || 0)));
    const minLow = Math.min(...span.map(bar => Number(bar.low || bar.close || 0)));
    const maxGain = direction === 'Short'
      ? ((entryPrice - minLow) / entryPrice) * 100
      : ((maxHigh - entryPrice) / entryPrice) * 100;
    const maxDrawdown = direction === 'Short'
      ? ((entryPrice - maxHigh) / entryPrice) * 100
      : ((minLow - entryPrice) / entryPrice) * 100;

    trades.push({
      id: `trade-${trades.length + 1}`,
      symbol: symbol || normalized.symbol || 'Active chart',
      direction,
      entryTriggerTime: scopedBars[index].time,
      entryTime: entryBar.time,
      exitTriggerTime: scopedBars[Math.max(entryIndex, exitIndex - 1)]?.time || exitBar.time,
      exitTime: exitBar.time,
      entryPrice: round(entryPrice, 3),
      exitPrice: round(exitPrice, 3),
      closed: true,
      entryReason: getRuleReason(entryScript),
      exitReason: getRuleReason(exitScript),
      lengthCandles: Math.max(1, exitIndex - entryIndex + 1),
      returnPercent,
      result: formatR(returnPercent / 2),
      status: returnPercent >= 0 ? 'Win' : 'Loss',
      maxGainPercent: round(maxGain, 2),
      maxDrawdownPercent: round(maxDrawdown, 2),
      maxGainAfterCandles: span.findIndex(bar => Number(bar.high || bar.close || 0) === maxHigh),
      maxDrawdownAfterCandles: span.findIndex(bar => Number(bar.low || bar.close || 0) === minLow)
    });

    index = exitIndex + 1;
  }

  if (!trades.length) warnings.push('No qualifying positions were generated for this strategy and data range.');

  const performance = buildPerformance(trades);
  const markers = buildMarkers(trades);

  return {
    runId: makeId('run'),
    strategyId: normalized.id,
    symbol: symbol || normalized.symbol || 'Active chart',
    startedAt: new Date().toISOString(),
    status: 'done',
    metrics: buildMetrics(trades, performance, scopedBars),
    trades,
    performance,
    pbe: buildPbe(trades),
    markers,
    warnings
  };
};

export const getStrategyTradeMarkers = resultOrBars => {
  if (resultOrBars?.markers) return resultOrBars.markers;
  return [];
};

const csvColumns = [
  ['symbol', 'Symbol'],
  ['direction', 'Direction'],
  ['entryTriggerTime', 'Entry Triggering Candle Open Time'],
  ['entryTime', 'Entry Candle Open Time'],
  ['entryPrice', 'Entry Price'],
  ['exitTriggerTime', 'Exit Triggering Candle Open Time'],
  ['exitTime', 'Exit Candle Open Time'],
  ['exitPrice', 'Exit Price'],
  ['closed', 'Closed?'],
  ['entryReason', 'Entry Reason'],
  ['exitReason', 'Exit Reason'],
  ['lengthCandles', 'Length (candles)'],
  ['returnPercent', 'Return (%)'],
  ['maxGainPercent', 'Max Gain vs Entry (%)'],
  ['maxDrawdownPercent', 'Max Drawdown vs Entry (%)'],
  ['maxGainAfterCandles', 'Max Gain vs Entry After Candles'],
  ['maxDrawdownAfterCandles', 'Max Drawdown vs Entry After Candles']
];

const escapeCsv = value => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const exportBacktestCsv = result => {
  const header = csvColumns.map(([, label]) => label).join(',');
  const rows = (result?.trades || []).map(trade => csvColumns.map(([key]) => escapeCsv(trade[key])).join(','));
  return [header, ...rows].join('\n');
};

export const downloadBacktestCsv = result => {
  if (typeof document === 'undefined') return exportBacktestCsv(result);
  const blob = new Blob([exportBacktestCsv(result)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${result?.symbol || 'strategy'}-backtest.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return null;
};
