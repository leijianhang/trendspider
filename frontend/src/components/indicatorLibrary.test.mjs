import assert from 'node:assert/strict';
import {
  getActiveIndicatorRows,
  getFilteredIndicatorRows,
  hasActiveIndicators,
  indicatorTypeOptions
} from './indicatorLibrary.js';

const indicators = {
  ma: { enabled: true },
  ema: { enabled: false },
  macd: { enabled: true },
  rsi: { enabled: false },
  boll: { enabled: false }
};

assert.equal(indicatorTypeOptions[0].value, 'all');

assert.deepEqual(
  getActiveIndicatorRows(indicators).map(item => item.key),
  ['ma', 'macd']
);

assert.deepEqual(
  getActiveIndicatorRows({
    ma: {
      enabled: true,
      instances: [
        { id: 'ma-1', enabled: true },
        { id: 'ma-2', enabled: true }
      ]
    }
  }).map(item => item.instanceId),
  ['ma-1', 'ma-2']
);

assert.equal(hasActiveIndicators(indicators), true);
assert.equal(hasActiveIndicators({ ma: { enabled: false } }), false);

assert.deepEqual(
  getFilteredIndicatorRows({ indicators, type: 'technical', query: 'macd' }).map(item => item.key),
  ['macd']
);

assert.deepEqual(
  getFilteredIndicatorRows({ indicators, type: 'favorites', query: '' }).map(item => item.key),
  ['ma', 'macd']
);

assert.deepEqual(
  getFilteredIndicatorRows({ indicators, type: 'market-breadth', query: 'high' }).map(item => item.key),
  ['newHighLow']
);

console.log('indicatorLibrary tests passed');
