import assert from 'node:assert/strict';
import {
  getDrawingOverlayClassName,
  getSelectedDrawingControlPoint
} from './drawingOverlayState.js';

assert.equal(getDrawingOverlayClassName('select'), 'drawing-overlay selection-mode');
assert.equal(getDrawingOverlayClassName('segment'), 'drawing-overlay drawing-mode');

assert.deepEqual(
  getSelectedDrawingControlPoint([
    { x: 30, y: 90 },
    { x: 80, y: 40 }
  ]),
  { x: 88, y: 32 }
);

assert.equal(getSelectedDrawingControlPoint([]), null);

console.log('drawingOverlayState tests passed');
