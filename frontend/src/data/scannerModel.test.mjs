import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deleteSavedScanner,
  executeScannerScan,
  filterScannerLibrary,
  getVisibleScannerRows,
  shouldShowScannerResults,
  loadSavedScanners,
  mergeScannerLibrary,
  normalizeSavedScanners,
  saveScanner
} from './scannerModel.js';

const condition = { id: 'c1', type: 'Condition', left: 'Close' };
const settings = {
  scanUniverse: 'stock-default',
  scanChartType: 'candles',
  scanExtHours: false,
  scanCurrentCandle: true,
  groupLogic: 'all',
  groupTimingMode: 'happened',
  groupTimingCandles: 20,
  groupComment: ''
};

test('saving a new scanner creates a Mine saved scanner', () => {
  const result = saveScanner([], {
    name: 'My Momentum Scan',
    conditions: [condition],
    settings
  });

  assert.equal(result.scanner.owner, 'Mine');
  assert.equal(result.scanner.type, 'Saved');
  assert.equal(result.scanner.name, 'My Momentum Scan');
  assert.equal(result.scanners.length, 1);
});

test('saving an existing Mine scanner overwrites the same id', () => {
  const existing = [{
    id: 'saved-my-scan',
    name: 'My Scan',
    owner: 'Mine',
    type: 'Saved',
    conditions: [],
    settings: { ...settings, groupComment: 'old' },
    matches: 0
  }];

  const result = saveScanner(existing, {
    id: 'saved-my-scan',
    name: 'My Scan Updated',
    conditions: [condition],
    settings: { ...settings, groupComment: 'new' }
  });

  assert.equal(result.scanners.length, 1);
  assert.equal(result.scanner.id, 'saved-my-scan');
  assert.equal(result.scanner.name, 'My Scan Updated');
  assert.deepEqual(result.scanner.conditions, [condition]);
  assert.equal(result.scanner.settings.groupComment, 'new');
});

test('saving a TrendSpider pre-built scanner creates a user copy', () => {
  const result = saveScanner([], {
    id: 'prebuilt-breakout',
    owner: 'TrendSpider',
    type: 'Pre-built',
    name: 'Breakout With Volume',
    conditions: [condition],
    settings
  });

  assert.notEqual(result.scanner.id, 'prebuilt-breakout');
  assert.equal(result.scanner.owner, 'Mine');
  assert.equal(result.scanner.type, 'Saved');
  assert.equal(result.scanner.name, 'Breakout With Volume');
});

test('delete only removes saved Mine scanners', () => {
  const saved = [
    { id: 'saved-one', name: 'One', owner: 'Mine', type: 'Saved' },
    { id: 'prebuilt-one', name: 'Prebuilt', owner: 'TrendSpider', type: 'Pre-built' }
  ];

  assert.deepEqual(deleteSavedScanner(saved, 'saved-one'), [
    { id: 'prebuilt-one', name: 'Prebuilt', owner: 'TrendSpider', type: 'Pre-built' }
  ]);
  assert.deepEqual(deleteSavedScanner(saved, 'prebuilt-one'), saved);
});

test('merge keeps pre-built scanners and appends valid saved scanners', () => {
  const prebuilt = [{ id: 'prebuilt-one', name: 'Prebuilt', owner: 'TrendSpider', type: 'Pre-built' }];
  const saved = normalizeSavedScanners([
    { id: 'saved-one', name: 'Mine', owner: 'Mine', type: 'Saved', conditions: [condition], settings }
  ]);

  assert.deepEqual(mergeScannerLibrary(prebuilt, saved).map(item => item.id), ['prebuilt-one', 'saved-one']);
});

test('loading saved scanners falls back to empty when storage is invalid', () => {
  const storage = {
    getItem: () => '{bad json'
  };

  assert.deepEqual(loadSavedScanners(storage), []);
});

test('filter scanner library by ownership tab and query', () => {
  const scanners = [
    { id: 'prebuilt-one', name: 'Breakout', owner: 'TrendSpider', type: 'Pre-built' },
    { id: 'saved-one', name: 'My Momentum', owner: 'Mine', type: 'Saved' },
    { id: 'saved-two', name: 'My Reversal', owner: 'Mine', type: 'Saved' }
  ];

  assert.deepEqual(filterScannerLibrary(scanners, 'all', '').map(scanner => scanner.id), [
    'prebuilt-one',
    'saved-one',
    'saved-two'
  ]);
  assert.deepEqual(filterScannerLibrary(scanners, 'yours', '').map(scanner => scanner.id), [
    'saved-one',
    'saved-two'
  ]);
  assert.deepEqual(filterScannerLibrary(scanners, 'prebuilt', '').map(scanner => scanner.id), [
    'prebuilt-one'
  ]);
  assert.deepEqual(filterScannerLibrary(scanners, 'yours', 'reversal').map(scanner => scanner.id), [
    'saved-two'
  ]);
});

test('scanner results are hidden while creating a new scanner or before conditions exist', () => {
  const rows = [{ symbol: '600519' }];

  assert.equal(shouldShowScannerResults({ editorMode: 'start', activeScannerId: null, scannedScannerId: null, conditions: [condition] }), false);
  assert.equal(shouldShowScannerResults({ editorMode: 'point', activeScannerId: null, scannedScannerId: null, conditions: [condition] }), false);
  assert.equal(shouldShowScannerResults({
    editorMode: 'saved',
    activeScannerId: 'saved-one',
    scannedScannerId: null,
    conditions: [condition]
  }), false);
  assert.equal(shouldShowScannerResults({
    editorMode: 'saved',
    activeScannerId: 'saved-one',
    scannedScannerId: 'saved-one',
    conditions: [condition]
  }), true);
  assert.deepEqual(getVisibleScannerRows(rows, { editorMode: 'start', activeScannerId: null, scannedScannerId: null, conditions: [condition] }), []);
  assert.deepEqual(getVisibleScannerRows(rows, { editorMode: 'point', activeScannerId: null, scannedScannerId: null, conditions: [] }), []);
  assert.deepEqual(getVisibleScannerRows(rows, { editorMode: 'point', activeScannerId: null, scannedScannerId: null, conditions: [condition] }), []);
  assert.deepEqual(getVisibleScannerRows(rows, {
    editorMode: 'saved',
    activeScannerId: 'saved-one',
    scannedScannerId: null,
    conditions: [condition]
  }), []);
  assert.deepEqual(getVisibleScannerRows(rows, {
    editorMode: 'saved',
    activeScannerId: 'saved-one',
    scannedScannerId: 'saved-one',
    conditions: [condition]
  }), rows);
});

test('executing scanner scans only the selected watchlist universe', () => {
  const rows = [
    { symbol: 'AAA', score: 92 },
    { symbol: 'BBB', score: 84 },
    { symbol: 'CCC', score: 80 }
  ];
  const watchlistGroups = [
    { id: 'list-one', name: 'List One', symbols: ['AAA', 'CCC'] },
    { id: 'list-two', name: 'List Two', symbols: ['BBB'] }
  ];

  assert.deepEqual(
    executeScannerScan({
      rows,
      watchlistGroups,
      scanUniverse: 'list-one',
      conditions: [{
        id: 'score-over-70',
        type: 'Condition',
        leftSource: 'Indicators',
        rightSource: 'Value',
        left: 'Volume',
        operator: 'is above',
        right: '70'
      }],
      logic: 'all'
    }).map(row => row.symbol),
    ['AAA', 'CCC']
  );
});

test('executing scanner returns no rows without conditions', () => {
  assert.deepEqual(executeScannerScan({
    rows: [{ symbol: 'AAA', score: 92 }],
    watchlistGroups: [{ id: 'list-one', symbols: ['AAA'] }],
    scanUniverse: 'list-one',
    conditions: [],
    logic: 'all'
  }), []);
});

test('executing scanner evaluates value comparison conditions per row', () => {
  const rows = [
    { symbol: 'AAA', score: 92 },
    { symbol: 'BBB', score: 78 },
    { symbol: 'CCC', score: 63 }
  ];
  const watchlistGroups = [{ id: 'list-one', name: 'List One', symbols: ['AAA', 'BBB', 'CCC'] }];
  const conditions = [{
    id: 'volume-over-80',
    type: 'Condition',
    leftSource: 'Indicators',
    rightSource: 'Value',
    left: 'Volume',
    operator: 'is above',
    right: '80'
  }];

  assert.deepEqual(
    executeScannerScan({ rows, watchlistGroups, scanUniverse: 'list-one', conditions, logic: 'all' })
      .map(row => row.symbol),
    ['AAA']
  );
});

test('executing scanner respects all any and none condition logic', () => {
  const rows = [
    { symbol: 'AAA', score: 92, setup: 'Trendline Breakout' },
    { symbol: 'BBB', score: 78, setup: 'Pullback' },
    { symbol: 'CCC', score: 63, setup: 'Weak breadth' }
  ];
  const watchlistGroups = [{ id: 'list-one', name: 'List One', symbols: ['AAA', 'BBB', 'CCC'] }];
  const strongScore = {
    id: 'score-over-80',
    type: 'Condition',
    leftSource: 'Indicators',
    rightSource: 'Value',
    left: 'Volume',
    operator: 'is above',
    right: '80'
  };
  const breakout = {
    id: 'breakout-detected',
    type: 'Condition',
    leftSource: 'Patterns',
    source: 'Patterns',
    left: 'Trendline Breakout',
    operator: 'is detected',
    rightSource: 'Price',
    right: 'Close'
  };

  assert.deepEqual(
    executeScannerScan({ rows, watchlistGroups, scanUniverse: 'list-one', conditions: [strongScore, breakout], logic: 'all' })
      .map(row => row.symbol),
    ['AAA']
  );
  assert.deepEqual(
    executeScannerScan({ rows, watchlistGroups, scanUniverse: 'list-one', conditions: [strongScore, breakout], logic: 'none' })
      .map(row => row.symbol),
    ['BBB', 'CCC']
  );
});
