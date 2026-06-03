import assert from 'node:assert/strict';
import {
  cloneStrategy,
  createDefaultStrategy,
  deserializeStrategies,
  exportBacktestCsv,
  getStrategyTradeMarkers,
  runStrategyBacktest,
  serializeStrategies,
  updateStrategyRule
} from './strategyTesterModel.js';

const sampleBars = [
  { time: '2026-01-01', open: 10, high: 10.6, low: 9.8, close: 10.2, volume: 1000 },
  { time: '2026-01-02', open: 10.3, high: 11.4, low: 10.1, close: 11.1, volume: 1200 },
  { time: '2026-01-03', open: 11.2, high: 12.1, low: 11, close: 11.9, volume: 1300 },
  { time: '2026-01-04', open: 11.8, high: 12, low: 10.8, close: 11, volume: 1500 },
  { time: '2026-01-05', open: 11.1, high: 12.6, low: 11, close: 12.3, volume: 1700 },
  { time: '2026-01-06', open: 12.4, high: 13.1, low: 12.2, close: 12.8, volume: 1600 },
  { time: '2026-01-07', open: 12.7, high: 13, low: 11.6, close: 11.9, volume: 1900 },
  { time: '2026-01-08', open: 12, high: 13.4, low: 11.9, close: 13.1, volume: 2100 },
  { time: '2026-01-09', open: 13.2, high: 13.5, low: 12.1, close: 12.4, volume: 2000 },
  { time: '2026-01-10', open: 12.5, high: 13.8, low: 12.3, close: 13.6, volume: 2300 }
];

const strategy = createDefaultStrategy({ symbol: '600519', timeframe: 'daily' });

assert.equal(strategy.name, 'Trendline Breakout Strategy');
assert.equal(strategy.direction, 'Long');
assert.equal(strategy.tradeBy, 'Next Open');
assert.equal(strategy.entryScripts[0].rules.length >= 2, true);
assert.equal(strategy.exitScripts[0].mode, 'Script');

const edited = updateStrategyRule(strategy, 'entry', strategy.entryScripts[0].id, strategy.entryScripts[0].rules[0].id, {
  operator: 'crosses above',
  right: 'EMA(21)'
});
assert.equal(edited.entryScripts[0].rules[0].operator, 'crosses above');
assert.equal(strategy.entryScripts[0].rules[0].operator, 'is above');

const cloned = cloneStrategy(strategy);
assert.notEqual(cloned.id, strategy.id);
assert.equal(cloned.name, `${strategy.name} Copy`);
assert.equal(cloned.entryScripts[0].rules.length, strategy.entryScripts[0].rules.length);

const serialized = serializeStrategies([strategy, cloned]);
const restored = deserializeStrategies(serialized);
assert.equal(restored.length, 2);
assert.equal(restored[0].name, strategy.name);
assert.deepEqual(deserializeStrategies('not json'), []);

const result = runStrategyBacktest({ strategy, bars: sampleBars, symbol: '600519' });
assert.equal(result.status, 'done');
assert.equal(result.symbol, '600519');
assert.equal(result.trades.length > 0, true);
assert.equal(result.metrics.trades, String(result.trades.length));
assert.equal(result.performance.length, result.trades.length + 1);
assert.equal(result.pbe.all.length > 0, true);
assert.equal(result.markers.length, result.trades.length * 2);
assert.equal(result.trades[0].entryReason.length > 0, true);

const repeat = runStrategyBacktest({ strategy, bars: sampleBars, symbol: '600519' });
assert.deepEqual(
  repeat.trades.map(trade => [trade.entryTime, trade.exitTime, trade.returnPercent]),
  result.trades.map(trade => [trade.entryTime, trade.exitTime, trade.returnPercent])
);

const markers = getStrategyTradeMarkers(result);
assert.deepEqual(markers, result.markers);
assert.deepEqual(getStrategyTradeMarkers([]), []);

const empty = runStrategyBacktest({ strategy, bars: [], symbol: '600519' });
assert.equal(empty.status, 'empty');
assert.equal(empty.trades.length, 0);
assert.equal(empty.warnings.length > 0, true);

const csv = exportBacktestCsv(result);
assert.equal(csv.split('\n')[0].includes('Entry Price'), true);
assert.equal(csv.includes('600519'), true);
assert.equal(csv.includes('Entry Reason'), true);

console.log('strategyTesterModel tests passed');
