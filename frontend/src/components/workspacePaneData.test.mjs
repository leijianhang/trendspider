import assert from 'node:assert/strict';
import {
  getPaneDataKey,
  getPaneKlineData,
  setPaneKlineData
} from './workspacePaneData.js';

assert.equal(getPaneDataKey({
  paneId: 'pane-2',
  symbol: '600519',
  period: '60min',
  adjust: 'qfq'
}), 'pane-2|600519|60min|qfq');

const cache = setPaneKlineData({}, {
  paneId: 'pane-2',
  symbol: '600519',
  period: '60min',
  adjust: 'qfq',
  data: [{ time: '2025-01-01', close: 1 }]
});

assert.deepEqual(getPaneKlineData(cache, {
  paneId: 'pane-2',
  symbol: '600519',
  period: '60min',
  adjust: 'qfq'
}), [{ time: '2025-01-01', close: 1 }]);

assert.equal(getPaneKlineData(cache, {
  paneId: 'pane-1',
  symbol: '600519',
  period: '60min',
  adjust: 'qfq'
}), null);

console.log('workspacePaneData tests passed');
