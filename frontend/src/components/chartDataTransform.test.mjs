import assert from 'node:assert/strict';
import {
  normalizeKlineRows,
  normalizeChartTime,
  toCandleData,
  toLineData,
  toVolumeData
} from './chartDataTransform.js';

const dailyTime = normalizeChartTime('2025-04-30');
const intradayTime = normalizeChartTime('2025-04-30 10:30:00');

assert.equal(typeof dailyTime, 'number');
assert.equal(typeof intradayTime, 'number');
assert.equal(intradayTime > dailyTime, true);

const rows = [
  { time: '2025-04-30 10:30:00', open: 10, high: 11, low: 9, close: 10.5, volume: 1000 },
  { time: '2025-04-30 11:30:00', open: 10.5, high: 12, low: 10, close: 11.5, volume: 1200 }
];

assert.equal(toCandleData(rows)[0].time, intradayTime);
assert.deepEqual(Object.keys(toLineData(rows)[0]), ['time', 'value']);
assert.equal(toVolumeData(rows)[1].value, 1200);

const normalizedRows = normalizeKlineRows([
  rows[1],
  { time: 'not-a-date', open: 1, high: 1, low: 1, close: 1, volume: 1 },
  { ...rows[0], close: 10.8 },
  rows[0]
]);

assert.deepEqual(normalizedRows.map(row => row.time), ['2025-04-30 10:30:00', '2025-04-30 11:30:00']);
assert.equal(normalizedRows[0].close, 10.5);

assert.throws(() => normalizeChartTime('not-a-date'), /Invalid chart time/);

console.log('chartDataTransform tests passed');
