import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addWatchlistGroup,
  cloneWatchlistGroup,
  createDefaultWatchlistGroups,
  createDefaultWatchlistSymbols,
  deleteWatchlistGroup,
  getWatchlistCsv,
  getWatchlistRowsFromGroups,
  getWatchlistRowsFromSymbols,
  isSymbolWatched,
  normalizeWatchlistGroups,
  renameWatchlistGroup,
  setGroupSymbolColor,
  toggleGroupSymbol,
  toggleWatchlistSymbol
} from './watchlistModel.js';

test('toggles symbols in and out of a typed watchlist', () => {
  const watchlist = createDefaultWatchlistSymbols();

  const added = toggleWatchlistSymbol(watchlist, { symbol: '300750', type: 'stock' });
  assert.equal(isSymbolWatched(added, { symbol: '300750', type: 'stock' }), true);

  const removed = toggleWatchlistSymbol(added, { symbol: '300750', type: 'stock' });
  assert.equal(isSymbolWatched(removed, { symbol: '300750', type: 'stock' }), false);
});

test('builds watchlist rows from watched symbols', () => {
  const rows = getWatchlistRowsFromSymbols({
    stock: ['600519', '000858'],
    futures: ['CU2406']
  }, 'stock');

  assert.deepEqual(rows.map(row => row.symbol), ['600519', '000858']);
});

test('creates custom watchlist groups and adds symbols to a selected group', () => {
  const groups = addWatchlistGroup(createDefaultWatchlistGroups(), {
    name: '突破池',
    type: 'stock'
  });
  const customGroup = groups.find(group => group.name === '突破池');

  const updated = toggleGroupSymbol(groups, customGroup.id, { symbol: '600519', type: 'stock' });
  const rows = getWatchlistRowsFromGroups(updated, customGroup.id);

  assert.deepEqual(rows.map(row => row.symbol), ['600519']);
});

test('creates custom watchlist groups with initial symbols', () => {
  const groups = addWatchlistGroup(createDefaultWatchlistGroups(), {
    name: 'Momentum',
    type: 'stock',
    symbols: ['600519', '000858']
  });
  const customGroup = groups.find(group => group.name === 'Momentum');

  assert.deepEqual(
    getWatchlistRowsFromGroups(groups, customGroup.id).map(row => row.symbol),
    ['600519', '000858']
  );
});

test('custom watchlist groups can mix symbols from different asset classes', () => {
  const groups = addWatchlistGroup(createDefaultWatchlistGroups(), {
    name: 'Mixed',
    symbols: ['600519', 'CU2406']
  });
  const customGroup = groups.find(group => group.name === 'Mixed');

  assert.equal(customGroup.type, 'mixed');
  assert.deepEqual(
    getWatchlistRowsFromGroups(groups, customGroup.id).map(row => row.symbol),
    ['600519', 'CU2406']
  );

  const updated = toggleGroupSymbol(groups, customGroup.id, { symbol: 'AU2406', type: 'futures' });
  assert.deepEqual(
    getWatchlistRowsFromGroups(updated, customGroup.id).map(row => row.symbol),
    ['600519', 'CU2406', 'AU2406']
  );
});

test('global watchlist toggle removes a symbol from every watched group', () => {
  const groups = addWatchlistGroup(createDefaultWatchlistGroups(), {
    name: 'Mixed',
    symbols: ['600519', 'CU2406']
  });

  assert.equal(isSymbolWatched(groups, { symbol: '600519', type: 'stock' }), true);

  const updated = toggleWatchlistSymbol(groups, { symbol: '600519', type: 'stock' });

  assert.equal(isSymbolWatched(updated, { symbol: '600519', type: 'stock' }), false);
  assert.deepEqual(getWatchlistRowsFromGroups(updated, 'stock-default').map(row => row.symbol), ['000858', '600036']);
  assert.deepEqual(
    getWatchlistRowsFromGroups(updated, updated.find(group => group.name === 'Mixed').id).map(row => row.symbol),
    ['CU2406']
  );
});

test('deletes custom watchlist groups but keeps default groups', () => {
  const groups = addWatchlistGroup(createDefaultWatchlistGroups(), {
    name: '临时列表',
    type: 'futures'
  });
  const customGroup = groups.find(group => group.name === '临时列表');

  assert.equal(deleteWatchlistGroup(groups, customGroup.id).some(group => group.id === customGroup.id), false);
  assert.equal(deleteWatchlistGroup(groups, 'stock-default').some(group => group.id === 'stock-default'), true);
});

test('normalizes missing or legacy watchlist state into groups with rows', () => {
  const groups = normalizeWatchlistGroups(undefined, {
    stock: ['600519'],
    futures: ['CU2406']
  });

  assert.deepEqual(getWatchlistRowsFromGroups(groups, 'stock-default').map(row => row.symbol), ['600519']);
});

test('renames and clones custom watchlists', () => {
  const groups = addWatchlistGroup(createDefaultWatchlistGroups(), { name: '观察', type: 'stock' });
  const customGroup = groups.find(group => group.name === '观察');
  const withSymbol = toggleGroupSymbol(groups, customGroup.id, { symbol: '600519', type: 'stock' });
  const renamed = renameWatchlistGroup(withSymbol, customGroup.id, '核心观察');
  const cloned = cloneWatchlistGroup(renamed, customGroup.id, '核心观察 Copy');

  assert.equal(renamed.find(group => group.id === customGroup.id).name, '核心观察');
  assert.deepEqual(
    getWatchlistRowsFromGroups(cloned, cloned.find(group => group.name === '核心观察 Copy').id).map(row => row.symbol),
    ['600519']
  );
});

test('cloned watchlists become mixed custom lists and can add other asset classes', () => {
  const groups = cloneWatchlistGroup(createDefaultWatchlistGroups(), 'futures-default', 'Futures Copy');
  const clonedGroup = groups.find(group => group.name === 'Futures Copy');

  assert.equal(clonedGroup.type, 'mixed');

  const updated = toggleGroupSymbol(groups, clonedGroup.id, { symbol: '600519', type: 'stock' });

  assert.deepEqual(
    getWatchlistRowsFromGroups(updated, clonedGroup.id).map(row => row.symbol),
    ['CU2406', 'AU2406', 'IF2405', '600519']
  );
});

test('stores color flags and exports csv', () => {
  const groups = setGroupSymbolColor(createDefaultWatchlistGroups(), 'stock-default', '600519', 'green');
  const rows = getWatchlistRowsFromGroups(groups, 'stock-default');
  const csv = getWatchlistCsv(groups, 'stock-default');

  assert.equal(rows.find(row => row.symbol === '600519').colorFlag, 'green');
  assert.equal(csv.includes('"600519"'), true);
  assert.equal(csv.includes('"green"'), true);
});
