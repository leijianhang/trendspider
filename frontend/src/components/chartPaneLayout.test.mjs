import assert from 'node:assert/strict';
import { getChartPaneLayout } from './chartPaneLayout.js';

assert.deepEqual(getChartPaneLayout(true), {
  priceRows: 'minmax(0, 7fr) minmax(54px, 2fr)',
  volumeVisible: true,
  lowerVisible: false
});

assert.deepEqual(getChartPaneLayout(false), {
  priceRows: 'minmax(0, 7fr)',
  volumeVisible: false,
  lowerVisible: false
});

assert.deepEqual(getChartPaneLayout(true, 2), {
  priceRows: 'minmax(0, 7fr) minmax(54px, 2fr) minmax(64px, 2.5fr) minmax(64px, 2.5fr)',
  volumeVisible: true,
  lowerVisible: true
});

console.log('chartPaneLayout tests passed');
