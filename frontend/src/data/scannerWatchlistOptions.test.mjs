import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getScannerWatchlistOptions,
  resolveScannerWatchlistSelection
} from './scannerWatchlistOptions.js';

test('scanner list options come from watchlist groups', () => {
  const groups = [
    { id: 'stock-default', name: 'China Large Caps', symbols: ['600519', '000858'] },
    { id: 'futures-default', name: 'Futures Movers', symbols: ['CU2406'] }
  ];

  assert.deepEqual(getScannerWatchlistOptions(groups), [
    { value: 'stock-default', label: 'China Large Caps', count: 2 },
    { value: 'futures-default', label: 'Futures Movers', count: 1 }
  ]);
});

test('scanner list selection falls back to the first watchlist when current list is missing', () => {
  const groups = [
    { id: 'stock-default', name: 'China Large Caps', symbols: [] },
    { id: 'futures-default', name: 'Futures Movers', symbols: [] }
  ];

  assert.equal(resolveScannerWatchlistSelection('deleted-list', groups), 'stock-default');
});

test('scanner list selection is empty when there are no watchlists', () => {
  assert.equal(resolveScannerWatchlistSelection('deleted-list', []), '');
});
