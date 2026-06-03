import assert from 'node:assert/strict';
import {
  getWorkspaceLayout,
  getWorkspacePaneCount,
  workspaceLayoutOptions
} from './workspaceLayoutOptions.js';

assert.equal(workspaceLayoutOptions.length, 6);
assert.equal(getWorkspaceLayout('single').label, '1 图表');
assert.equal(getWorkspaceLayout('unknown').value, 'single');
assert.equal(getWorkspacePaneCount('single'), 1);
assert.equal(getWorkspacePaneCount('two-column'), 2);
assert.equal(getWorkspacePaneCount('three-column'), 3);
assert.equal(getWorkspacePaneCount('four-grid'), 4);
assert.equal(getWorkspacePaneCount('nine-grid'), 9);

console.log('workspaceLayoutOptions tests passed');
