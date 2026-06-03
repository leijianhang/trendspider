import assert from 'node:assert/strict';
import { marketSymbols } from './marketCatalog.js';
import { getSymbolSearchPage } from './symbolSearchModel.js';

const firstStockPage = getSymbolSearchPage({
  symbols: marketSymbols,
  type: 'stock',
  query: '',
  page: 1,
  pageSize: 2
});

assert.equal(firstStockPage.total, 3);
assert.equal(firstStockPage.page, 1);
assert.deepEqual(firstStockPage.items.map(item => item.symbol), ['600519', '000858']);

const secondStockPage = getSymbolSearchPage({
  symbols: marketSymbols,
  type: 'stock',
  query: '',
  page: 2,
  pageSize: 2
});

assert.deepEqual(secondStockPage.items.map(item => item.symbol), ['600036']);

const futuresSearch = getSymbolSearchPage({
  symbols: marketSymbols,
  type: 'futures',
  query: 'IF',
  page: 1,
  pageSize: 5
});

assert.equal(futuresSearch.total, 1);
assert.equal(futuresSearch.items[0].symbol, 'IF2405');

const correctedPage = getSymbolSearchPage({
  symbols: marketSymbols,
  type: 'futures',
  query: '',
  page: 9,
  pageSize: 2
});

assert.equal(correctedPage.page, 2);
assert.deepEqual(correctedPage.items.map(item => item.symbol), ['IF2405']);

console.log('symbolSearchModel tests passed');
