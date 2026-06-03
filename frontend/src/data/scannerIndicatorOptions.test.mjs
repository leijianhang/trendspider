import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getScannerIndicatorFamily,
  scannerLowerIndicatorOptions,
  scannerOverlayIndicatorOptions
} from './scannerIndicatorOptions.js';

test('scanner overlay indicators include full Bollinger band lines and common overlays', () => {
  assert.equal(scannerOverlayIndicatorOptions.includes('Bollinger Upper'), true);
  assert.equal(scannerOverlayIndicatorOptions.includes('Bollinger Middle'), true);
  assert.equal(scannerOverlayIndicatorOptions.includes('Bollinger Lower'), true);
  assert.equal(scannerOverlayIndicatorOptions.includes('MA(5)'), true);
  assert.equal(scannerOverlayIndicatorOptions.includes('MA(60)'), true);
  assert.equal(scannerOverlayIndicatorOptions.includes('EMA(12)'), true);
  assert.equal(scannerOverlayIndicatorOptions.includes('EMA(26)'), true);
  assert.equal(scannerOverlayIndicatorOptions.includes('VWAP'), true);
});

test('scanner lower indicators include chart lower pane indicators', () => {
  assert.equal(scannerLowerIndicatorOptions.includes('MACD Signal'), true);
  assert.equal(scannerLowerIndicatorOptions.includes('KDJ J'), true);
  assert.equal(scannerLowerIndicatorOptions.includes('ATR(14)'), true);
  assert.equal(scannerLowerIndicatorOptions.includes('MFI(14)'), true);
  assert.equal(scannerLowerIndicatorOptions.includes('ADX(14)'), true);
});

test('scanner indicator family classifies expanded indicator options', () => {
  assert.equal(getScannerIndicatorFamily('Bollinger Upper'), 'overlay');
  assert.equal(getScannerIndicatorFamily('KDJ J'), 'lower');
});
