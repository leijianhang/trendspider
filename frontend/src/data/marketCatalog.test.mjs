import assert from 'node:assert/strict';
import {
  findSymbol,
  getAlertRows,
  getHappeningRows,
  getScannerRows,
  getStrategyRows,
  getWatchlistRows,
  searchSymbols
} from './marketCatalog.js';

const maotai = findSymbol('600519');
assert.equal(maotai.name, '贵州茅台');
assert.equal(maotai.type, 'stock');

const futuresResults = searchSymbols('if', 'futures');
assert.equal(futuresResults[0].symbol, 'IF2405');
assert.equal(futuresResults[0].name, '沪深主力');

const scannerRows = getScannerRows();
assert.equal(scannerRows.some(row => row.symbol === 'AU2406' && row.type === 'futures'), true);

const futuresWatchlist = getWatchlistRows('futures');
assert.deepEqual(futuresWatchlist.map(row => row.symbol), ['CU2406', 'AU2406', 'IF2405']);

const maotaiAlerts = getAlertRows('600519');
assert.equal(maotaiAlerts[0].name.includes('600519'), true);
assert.equal(maotaiAlerts[0].target, '1698.00');

const ifFeed = getHappeningRows('IF2405');
assert.equal(ifFeed[0].title.includes('IF2405'), true);
assert.equal(ifFeed[0].source, 'Scanner');

const auStrategies = getStrategyRows('AU2406');
assert.equal(auStrategies[0].symbol, 'AU2406');
assert.equal(auStrategies[0].status, 'Passing');

console.log('marketCatalog tests passed');
