import assert from 'node:assert/strict';
import {
  anchorToPoint,
  coordinateToAnchor,
  formatMeasureLabel
} from './drawingGeometry.js';

const chart = {
  timeScale: () => ({
    coordinateToTime: x => (x === 25 ? 1714465800 : null),
    timeToCoordinate: time => (time === 1714465800 ? 25 : null)
  })
};

const series = {
  coordinateToPrice: y => (y === 40 ? 10.5 : null),
  priceToCoordinate: price => (price === 10.5 ? 40 : null)
};

assert.deepEqual(
  coordinateToAnchor({ point: { x: 25, y: 40 }, chart, series }),
  { time: 1714465800, price: 10.5 }
);

assert.equal(
  coordinateToAnchor({ point: { x: 10, y: 40 }, chart, series }),
  null
);

assert.deepEqual(
  anchorToPoint({ anchor: { time: 1714465800, price: 10.5 }, chart, series }),
  { x: 25, y: 40 }
);

assert.equal(
  anchorToPoint({ anchor: { time: 1714469400, price: 10.5 }, chart, series }),
  null
);

assert.equal(
  formatMeasureLabel({ price: 10, time: 1 }, { price: 12.5, time: 2 }),
  '+2.50 (+25.00%)'
);

assert.equal(
  formatMeasureLabel({ price: 10, time: 1 }, { price: 8, time: 2 }),
  '-2.00 (-20.00%)'
);

console.log('drawingGeometry tests passed');
