export const SCANNER_STORAGE_KEY = 'trendspider.savedScanners';

const clone = value => JSON.parse(JSON.stringify(value || null));

const normalizeScannerName = name => String(name || '').trim() || 'New Scanner';

const slugify = value => String(value || 'scanner')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'scanner';

const createScannerId = (name, scanners = []) => {
  const base = `saved-${slugify(name)}`;
  let candidate = base;
  let index = 2;

  while (scanners.some(scanner => scanner.id === candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
};

export const normalizeSavedScanners = value => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(scanner => scanner?.id && scanner?.name && scanner.owner !== 'TrendSpider' && scanner.type !== 'Pre-built')
    .map(scanner => ({
      id: scanner.id,
      name: normalizeScannerName(scanner.name),
      owner: 'Mine',
      type: 'Saved',
      conditions: Array.isArray(scanner.conditions) ? scanner.conditions : [],
      settings: scanner.settings || {},
      matches: Number.isFinite(scanner.matches) ? scanner.matches : 0
    }));
};

export const loadSavedScanners = (storage = globalThis?.localStorage) => {
  if (!storage) return [];

  try {
    return normalizeSavedScanners(JSON.parse(storage.getItem(SCANNER_STORAGE_KEY) || '[]'));
  } catch {
    return [];
  }
};

export const persistSavedScanners = (scanners, storage = globalThis?.localStorage) => {
  if (!storage) return;

  try {
    storage.setItem(SCANNER_STORAGE_KEY, JSON.stringify(normalizeSavedScanners(scanners)));
  } catch {
    // Ignore storage failures; the in-memory scanner library still works.
  }
};

export const mergeScannerLibrary = (prebuilt = [], saved = []) => [
  ...prebuilt,
  ...normalizeSavedScanners(saved)
];

export const filterScannerLibrary = (scanners = [], filter = 'all', query = '') => {
  const normalizedQuery = String(query || '').trim().toLowerCase();

  return scanners.filter(scanner => {
    const matchesFilter = filter === 'yours'
      ? scanner.owner === 'Mine' && scanner.type === 'Saved'
      : filter === 'prebuilt'
        ? scanner.owner === 'TrendSpider' && scanner.type === 'Pre-built'
        : true;

    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;

    return scanner.name.toLowerCase().includes(normalizedQuery);
  });
};

export const shouldShowScannerResults = ({
  editorMode = 'saved',
  activeScannerId = null,
  scannedScannerId = null,
  conditions = []
} = {}) => {
  if (editorMode === 'start') return false;
  if (!activeScannerId) return false;
  if (activeScannerId !== scannedScannerId) return false;
  return Array.isArray(conditions) && conditions.length > 0;
};

export const getVisibleScannerRows = (
  rows = [],
  state = {}
) => {
  if (!shouldShowScannerResults(state)) return [];
  return rows;
};

const collectConditionCount = conditions => (
  (conditions || []).reduce((count, item) => {
    if (item?.type === 'Condition Group') return count + collectConditionCount(item.conditions);
    return count + 1;
  }, 0)
);

const getTimingScore = (row, key, fallback = row?.score || 0) => (
  Number(row?.timing?.[key]?.score ?? fallback)
);

const getChangeValue = row => Number(String(row?.change || '0').replace('%', '')) || 0;

const getOperandValue = (row, source, operand) => {
  if (source === 'Value') return Number(operand);

  if (source === 'Patterns') {
    return String(row?.setup || '').toLowerCase().includes(String(operand || '').toLowerCase());
  }

  if (source === 'Indicators') {
    const indicator = String(operand || '').toLowerCase();
    if (indicator.includes('volume')) return Number(row?.score || 0);
    if (indicator.includes('rsi')) return getTimingScore(row, 'hourly');
    if (indicator.includes('macd')) return Number(row?.score || 0) - 70;
    if (indicator.includes('kdj')) return getTimingScore(row, 'intraday');
    if (indicator.includes('stochastic')) return getTimingScore(row, 'intraday');
    if (indicator.includes('atr')) return Math.abs(getChangeValue(row)) * 20;
    if (indicator.includes('obv')) return Number(row?.score || 0);
    if (indicator.includes('mfi')) return getTimingScore(row, 'hourly');
    if (indicator.includes('cci')) return Number(row?.score || 0) - 50;
    if (indicator.includes('adx')) return getTimingScore(row, 'daily');
    if (indicator.includes('vwap')) return getTimingScore(row, 'intraday');
    if (indicator.includes('ema')) return getTimingScore(row, 'daily');
    if (indicator.includes('ma(')) return getTimingScore(row, 'daily');
    if (indicator.includes('bollinger')) return 65;
    if (indicator.includes('ichimoku')) return getTimingScore(row, 'daily');
    if (indicator.includes('new high')) return Number(row?.score || 0);
    if (indicator.includes('new low')) return 100 - Number(row?.score || 0);
    return Number(row?.score || 0);
  }

  const price = Number(row?.score || 0);
  const change = getChangeValue(row);
  if (operand === 'Open') return price - change;
  if (operand === 'High') return price + Math.max(1, Math.abs(change));
  if (operand === 'Low') return price - Math.max(1, Math.abs(change));
  return price;
};

const compareValues = (left, operator, right) => {
  if (operator === 'is detected') return Boolean(left);
  if (operator === 'is not detected') return !left;

  const leftValue = Number(left);
  const rightValue = Number(right);
  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return false;

  if (operator === 'is above' || operator === 'crossed above') return leftValue > rightValue;
  if (operator === 'is below' || operator === 'crossed below') return leftValue < rightValue;
  if (operator === 'is equal to') return leftValue === rightValue;
  if (operator === 'is not equal to') return leftValue !== rightValue;
  return false;
};

const evaluateCondition = (row, condition) => {
  if (condition?.type === 'Condition Group') {
    return evaluateConditions(row, condition.conditions, condition.logic);
  }

  const leftSource = condition?.leftSource || condition?.source || 'Price';
  const rightSource = condition?.rightSource || 'Value';
  const left = getOperandValue(row, leftSource, condition?.left);
  const right = getOperandValue(row, rightSource, condition?.right);
  return compareValues(left, condition?.operator, right);
};

const evaluateConditions = (row, conditions = [], logic = 'all') => {
  const evaluations = conditions.map(condition => evaluateCondition(row, condition));
  if (!evaluations.length) return false;
  if (logic === 'any') return evaluations.some(Boolean);
  if (logic === 'none') return evaluations.every(value => !value);
  return evaluations.every(Boolean);
};

export const executeScannerScan = ({
  rows = [],
  watchlistGroups = [],
  scanUniverse = '',
  conditions = [],
  logic = 'all'
} = {}) => {
  const conditionCount = collectConditionCount(conditions);
  if (!conditionCount) return [];

  const selectedGroup = watchlistGroups.find(group => group.id === scanUniverse) || watchlistGroups[0];
  if (!selectedGroup) return [];

  const symbols = new Set((selectedGroup.symbols || []).map(symbol => String(symbol).toUpperCase()));

  return rows
    .filter(row => symbols.has(String(row.symbol).toUpperCase()))
    .filter(row => evaluateConditions(row, conditions, logic))
    .sort((a, b) => b.score - a.score);
};

export const saveScanner = (savedScanners = [], payload = {}) => {
  const normalizedSaved = normalizeSavedScanners(savedScanners);
  const name = normalizeScannerName(payload.name);
  const existingSaved = normalizedSaved.find(scanner => scanner.id === payload.id);
  const scanner = {
    id: existingSaved ? existingSaved.id : createScannerId(name, normalizedSaved),
    name,
    owner: 'Mine',
    type: 'Saved',
    conditions: clone(payload.conditions) || [],
    settings: clone(payload.settings) || {},
    matches: Number.isFinite(payload.matches) ? payload.matches : existingSaved?.matches || 0
  };

  if (existingSaved) {
    return {
      scanner,
      scanners: normalizedSaved.map(item => (item.id === scanner.id ? scanner : item))
    };
  }

  return {
    scanner,
    scanners: [...normalizedSaved, scanner]
  };
};

export const deleteSavedScanner = (savedScanners = [], scannerId) => (
  savedScanners.filter(scanner => (
    scanner.id !== scannerId || scanner.owner !== 'Mine' || scanner.type !== 'Saved'
  ))
);
