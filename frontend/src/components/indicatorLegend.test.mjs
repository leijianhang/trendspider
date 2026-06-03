import assert from 'node:assert/strict';
import {
  getOverlayIndicatorEditorRows,
  getOverlayIndicatorLegendItems,
  getOverlayIndicatorSeriesColors,
  withOverlayIndicatorValues
} from './indicatorLegend.js';

const indicators = {
  ma: { enabled: true, periods: [5, 10, 20, 60] },
  ema: { enabled: true, visible: false, periods: [12, 26] },
  boll: { enabled: true, params: { period: 20, stdDev: 2 } },
  vwap: { enabled: true },
  macd: { enabled: true, params: { fast: 12, slow: 26, signal: 9 } },
  rsi: { enabled: true, period: 14 }
};

assert.deepEqual(
  getOverlayIndicatorLegendItems(indicators).map(({ key, name, paramsLabel, label, colors, visible }) => ({
    key,
    name,
    paramsLabel,
    label,
    colors,
    visible
  })),
  [
    { key: 'ma', name: 'MA', paramsLabel: '5 10 20 60', label: 'MA 5 10 20 60', colors: ['#2196f3', '#ff9800', '#9c27b0', '#4caf50'], visible: true },
    { key: 'ema', name: 'EMA', paramsLabel: '12 26', label: 'EMA 12 26', colors: ['#00bcd4', '#ffc107'], visible: false },
    { key: 'boll', name: 'BOLL', paramsLabel: '20 2', label: 'BOLL 20 2', colors: ['#7c8cff', '#8d9aa7', '#7c8cff'], visible: true },
    { key: 'vwap', name: 'VWAP', paramsLabel: '', label: 'VWAP', colors: ['#e2a044'], visible: true }
  ]
);

assert.deepEqual(
  getOverlayIndicatorLegendItems({ macd: { enabled: true }, rsi: { enabled: true } }),
  []
);

assert.deepEqual(
  getOverlayIndicatorLegendItems({
    ma: {
      enabled: true,
      instances: [
        { id: 'ma-1', enabled: true, periods: [5] },
        { id: 'ma-2', enabled: true, periods: [20] }
      ]
    }
  }).map(item => ({ key: item.key, baseKey: item.baseKey, paramsLabel: item.paramsLabel })),
  [
    { key: 'ma-1', baseKey: 'ma', paramsLabel: '5' },
    { key: 'ma-2', baseKey: 'ma', paramsLabel: '20' }
  ]
);

console.log('indicatorLegend tests passed');

const data = [
  { time: '2024-01-01', close: 10 },
  { time: '2024-01-02', close: 12 },
  { time: '2024-01-03', close: 14 },
  { time: '2024-01-04', close: 16 },
  { time: '2024-01-05', close: 18 }
];

assert.deepEqual(
  withOverlayIndicatorValues(
    [{ key: 'ma', name: 'MA', paramsLabel: '3', label: 'MA 3', visible: true }],
    { ma: { enabled: true, periods: [3] } },
    data
  ),
  [{
    key: 'ma',
    name: 'MA',
    paramsLabel: '3',
    label: 'MA 3',
    visible: true,
    valueLabel: '16.00',
    valueItems: [{ label: 'MA3', value: '16.00', color: '#2196f3' }]
  }]
);

assert.deepEqual(
  withOverlayIndicatorValues(
    [{ key: 'ema', name: 'EMA', paramsLabel: '3', label: 'EMA 3', visible: true }],
    { ema: { enabled: true, periods: [3] } },
    data
  )[0].valueLabel,
  '16.00'
);

assert.deepEqual(
  withOverlayIndicatorValues(
    [{ key: 'ma', name: 'MA', paramsLabel: '3', label: 'MA 3', colors: ['#2196f3'], visible: true }],
    { ma: { enabled: true, periods: [3] } },
    data,
    data[3]
  ),
  [{ key: 'ma', name: 'MA', paramsLabel: '3', label: 'MA 3', colors: ['#2196f3'], visible: true, valueItems: [{ label: 'MA3', value: '14.00', color: '#2196f3' }], valueLabel: '14.00' }]
);

assert.deepEqual(
  withOverlayIndicatorValues(
    [{ key: 'boll', name: 'BOLL', paramsLabel: '3 2', label: 'BOLL 3 2', colors: ['#7c8cff', '#8d9aa7', '#7c8cff'], visible: true }],
    { boll: { enabled: true, params: { period: 3, stdDev: 2 } } },
    data
  )[0].valueItems.map(item => item.label),
  ['Upper', 'Middle', 'Lower']
);

console.log('indicatorLegend value tests passed');

assert.deepEqual(getOverlayIndicatorSeriesColors('ma', 4), ['#2196f3', '#ff9800', '#9c27b0', '#4caf50']);
assert.deepEqual(getOverlayIndicatorSeriesColors('ema', 2), ['#00bcd4', '#ffc107']);
assert.deepEqual(getOverlayIndicatorSeriesColors('boll', 3), ['#7c8cff', '#8d9aa7', '#7c8cff']);

const earlyBarLegend = withOverlayIndicatorValues(
  getOverlayIndicatorLegendItems({ ma: { enabled: true, periods: [5, 10, 20, 60] } }),
  { ma: { enabled: true, periods: [5, 10, 20, 60] } },
  data,
  data[4]
)[0];

assert.deepEqual(
  earlyBarLegend.valueItems.map(item => item.label),
  ['MA5', 'MA10', 'MA20', 'MA60']
);

assert.deepEqual(
  earlyBarLegend.valueItems.map(item => item.value),
  ['14.00', '-', '-', '-']
);

assert.deepEqual(
  getOverlayIndicatorEditorRows(earlyBarLegend).map(item => item.label),
  ['MA5', 'MA10', 'MA20', 'MA60']
);

assert.deepEqual(
  withOverlayIndicatorValues(
    getOverlayIndicatorLegendItems({ boll: { enabled: true, params: { period: 20, stdDev: 2 } } }),
    { boll: { enabled: true, params: { period: 20, stdDev: 2 } } },
    data,
    data[4]
  )[0].valueItems.map(item => item.value),
  ['-', '-', '-']
);

assert.deepEqual(
  getOverlayIndicatorEditorRows(
    getOverlayIndicatorLegendItems({ boll: { enabled: true, params: { period: 20, stdDev: 2 } } })[0]
  ).map(item => item.label),
  ['Upper', 'Middle', 'Lower']
);

console.log('indicatorLegend editor row tests passed');
