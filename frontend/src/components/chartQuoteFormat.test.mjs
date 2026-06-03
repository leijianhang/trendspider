import assert from 'node:assert/strict';
import {
  formatChange,
  formatPriceChange,
  formatPrice,
  getQuoteSnapshot,
  getQuoteSnapshotForBar
} from './chartQuoteFormat.js';

assert.equal(formatPrice(undefined), '--');
assert.equal(formatPrice(1680), '1680.00');
assert.equal(formatPrice(34.2), '34.20');
assert.equal(formatChange(1.234), '+1.23%');
assert.equal(formatChange(-0.456), '-0.46%');
assert.equal(formatPriceChange(1), '+1.00');
assert.equal(formatPriceChange(-0.12), '-0.12');

const snapshot = getQuoteSnapshot([
  { open: 10, high: 12, low: 9, close: 11 },
  { open: 11, high: 13, low: 10, close: 12 }
]);

assert.deepEqual(snapshot, {
  open: '11.00',
  high: '13.00',
  low: '10.00',
  close: '12.00',
  change: '+1.00',
  pctChange: '+9.09%',
  tone: 'up'
});

const hoveredSnapshot = getQuoteSnapshotForBar(
  [
    { open: 10, high: 12, low: 9, close: 11 },
    { open: 11, high: 13, low: 10, close: 9 }
  ],
  { open: 10, high: 12, low: 9, close: 11 }
);

assert.deepEqual(hoveredSnapshot, {
  open: '10.00',
  high: '12.00',
  low: '9.00',
  close: '11.00',
  change: '+1.00',
  pctChange: '+10.00%',
  tone: 'up'
});

assert.deepEqual(getQuoteSnapshot([
  { open: 10, high: 12, low: 9, close: 11 },
  { open: 11, high: 12, low: 8, close: 10 }
]), {
  open: '11.00',
  high: '12.00',
  low: '8.00',
  close: '10.00',
  change: '-1.00',
  pctChange: '-9.09%',
  tone: 'down'
});

assert.deepEqual(getQuoteSnapshotForBar({ data: [] }, null), {
  open: '--',
  high: '--',
  low: '--',
  close: '--',
  change: '+0.00',
  pctChange: '+0.00%',
  tone: 'neutral'
});

console.log('chartQuoteFormat tests passed');
