import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyTheStratBar,
  scanTheStratPatterns
} from './theStratPatternService.js';

const candle = (time, open, high, low, close) => ({ time, open, high, low, close, volume: 1000 });

test('classifies TheStrat inside directional and outside bars', () => {
  const previous = candle('t0', 10, 12, 8, 11);

  assert.equal(classifyTheStratBar(candle('inside', 9, 11, 9, 10), previous), '1');
  assert.equal(classifyTheStratBar(candle('up', 10, 13, 8.5, 12.5), previous), '2U');
  assert.equal(classifyTheStratBar(candle('down', 10, 11.5, 7, 7.5), previous), '2D');
  assert.equal(classifyTheStratBar(candle('outside', 10, 13, 7, 12), previous), '3');
});

test('detects documented TheStrat pattern sequences ending on the active candle', () => {
  const data = [
    candle('base', 10, 12, 8, 11),
    candle('inside', 10, 11, 9, 10.5),
    candle('down', 10, 10.5, 8.5, 9),
    candle('up', 9, 11, 8.7, 10.8)
  ];

  const result = scanTheStratPatterns(data);
  const last = result.find(item => item.pattern.type === '1-2D-2U');

  assert.equal(last.time, 'up');
  assert.deepEqual(last.sequence, ['1', '2D', '2U']);
  assert.equal(last.pattern.type, '1-2D-2U');
  assert.equal(last.pattern.name, '1-2D-2U Reversal');
  assert.equal(last.pattern.signal, 'bullish');
});

test('detects volatility expansion and broadening reversal patterns', () => {
  const expansion = scanTheStratPatterns([
    candle('base', 10, 12, 8, 11),
    candle('inside', 10, 11, 9, 10.5),
    candle('outside', 10, 13, 7, 12),
    candle('inside2', 10, 12, 8, 11),
    candle('down', 10, 11.5, 7.5, 8)
  ]);
  assert.equal(expansion.at(-1).pattern.name, '1-3-1-2D Volatility Expansion');

  const broadening = scanTheStratPatterns([
    candle('base', 10, 12, 8, 11),
    candle('outside', 10, 13, 7, 12),
    candle('down', 11, 12.5, 6.5, 7),
    candle('up', 7.5, 13, 7, 12.5)
  ]);
  assert.equal(broadening.at(-1).pattern.name, '3-2D-2U Broadening Reversal');
});
