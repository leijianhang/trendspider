import assert from 'node:assert/strict';
import {
  clampLogicalRange,
  getLogicalRangeKeepingIndexVisible,
  getNextCrosshairIndex,
  getZoomedLogicalRange
} from './chartKeyboardNavigation.js';

assert.equal(getNextCrosshairIndex({ currentIndex: null, direction: 'left', length: 5 }), 4);
assert.equal(getNextCrosshairIndex({ currentIndex: 2, direction: 'left', length: 5 }), 1);
assert.equal(getNextCrosshairIndex({ currentIndex: 0, direction: 'left', length: 5 }), 0);
assert.equal(getNextCrosshairIndex({ currentIndex: 2, direction: 'right', length: 5 }), 3);
assert.equal(getNextCrosshairIndex({ currentIndex: 4, direction: 'right', length: 5 }), 4);

assert.deepEqual(getZoomedLogicalRange({ from: 0, to: 100 }, 'in'), { from: 10, to: 90 });
assert.deepEqual(getZoomedLogicalRange({ from: 10, to: 90 }, 'out'), { from: 2, to: 98 });
assert.deepEqual(getZoomedLogicalRange({ from: 0, to: 100 }, 'in', 20), { from: 4, to: 84 });
assert.deepEqual(getZoomedLogicalRange({ from: 0, to: 100 }, 'out', 20), { from: -4, to: 116 });
assert.deepEqual(clampLogicalRange({ from: -20, to: 80 }, 100), { from: 0, to: 99 });
assert.deepEqual(clampLogicalRange({ from: 30, to: 120 }, 100), { from: 9, to: 99 });
assert.deepEqual(clampLogicalRange({ from: -30, to: 130 }, 100), { from: 0, to: 99 });

assert.deepEqual(
  getLogicalRangeKeepingIndexVisible({
    range: { from: 10, to: 20 },
    index: 8,
    length: 100,
    padding: 2
  }),
  { from: 6, to: 16 }
);
assert.deepEqual(
  getLogicalRangeKeepingIndexVisible({
    range: { from: 10, to: 20 },
    index: 21,
    length: 100,
    padding: 2
  }),
  { from: 13, to: 23 }
);
assert.deepEqual(
  getLogicalRangeKeepingIndexVisible({
    range: { from: 10, to: 20 },
    index: 15,
    length: 100,
    padding: 2
  }),
  { from: 10, to: 20 }
);
assert.deepEqual(
  getLogicalRangeKeepingIndexVisible({
    range: { from: 10, to: 20 },
    index: 0,
    length: 100,
    padding: 2
  }),
  { from: 0, to: 10 }
);
assert.deepEqual(
  getLogicalRangeKeepingIndexVisible({
    range: { from: 80, to: 90 },
    index: 99,
    length: 100,
    padding: 2
  }),
  { from: 89, to: 99 }
);
assert.deepEqual(
  getLogicalRangeKeepingIndexVisible({
    range: { from: 10.5, to: 20.5 },
    index: 10,
    length: 100,
    padding: 0
  }),
  { from: 10, to: 20 }
);
assert.deepEqual(
  getLogicalRangeKeepingIndexVisible({
    range: { from: 10.5, to: 20.5 },
    index: 21,
    length: 100,
    padding: 0
  }),
  { from: 11, to: 21 }
);

console.log('chartKeyboardNavigation tests passed');
