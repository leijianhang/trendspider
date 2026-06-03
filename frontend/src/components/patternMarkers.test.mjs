import assert from 'node:assert/strict';
import test from 'node:test';
import { getPatternLegendItems, getPatternMarkers, hasActivePatterns } from './patternMarkers.js';

test('maps TheStrat scan results to chart markers', () => {
  const markers = getPatternMarkers({
    candlePatterns: {
      selected: ['Hammer'],
      patterns: [
        {
          time: '2026-05-17',
          patterns: [{ type: 'hammer', name: 'Hammer', signal: 'bullish' }]
        }
      ]
    },
    chartPatterns: {
      selected: ['Double Top'],
      patterns: [
        {
          time: '2026-05-16',
          type: 'double_top',
          name: 'Double Top',
          signal: 'bearish'
        }
      ]
    },
    theStratPatterns: {
      selected: ['1-2D-2U Reversal', '2U-2D Reversal'],
      patterns: [
        {
          time: '2026-05-18',
          pattern: { type: '1-2D-2U', name: '1-2D-2U Reversal', signal: 'bullish' }
        },
        {
          time: '2026-05-19',
          pattern: { type: '2U-2D', name: '2U-2D Reversal', signal: 'bearish' }
        }
      ]
    }
  });

  assert.deepEqual(markers, [
    {
      time: '2026-05-17',
      position: 'belowBar',
      color: '#4ee093',
      shape: 'arrowUp',
      text: 'hammer'
    },
    {
      time: '2026-05-16',
      position: 'aboveBar',
      color: '#ff6b7a',
      shape: 'arrowDown',
      text: 'double_top'
    },
    {
      time: '2026-05-18',
      position: 'belowBar',
      color: '#4ee093',
      shape: 'arrowUp',
      text: '1-2D-2U'
    },
    {
      time: '2026-05-19',
      position: 'aboveBar',
      color: '#ff6b7a',
      shape: 'arrowDown',
      text: '2U-2D'
    }
  ]);
});

test('does not show pattern markers after the selected pattern is removed', () => {
  const markers = getPatternMarkers({
    candlePatterns: {
      selected: [],
      patterns: [
        {
          time: '2026-05-17',
          patterns: [{ type: 'hammer', name: 'Hammer', signal: 'bullish' }]
        }
      ]
    }
  });

  assert.deepEqual(markers, []);
});

test('shows each applied pattern name in the chart legend even with no matches', () => {
  const legendItems = getPatternLegendItems({
    candlePatterns: {
      count: 0,
      patterns: [],
      selected: ['Hammer', 'Doji']
    },
    chartPatterns: {
      count: 0,
      patterns: [],
      selected: ['Double Top']
    },
    theStratPatterns: {
      count: 0,
      patterns: [],
      selected: ['2U-2D Reversal']
    }
  });

  assert.deepEqual(
    legendItems.map(item => item.name),
    ['Hammer', 'Doji', 'Double Top', '2U-2D Reversal']
  );
});

test('detects active applied patterns from selected pattern groups', () => {
  assert.equal(hasActivePatterns({
    candlePatterns: { selected: ['Hammer'] },
    chartPatterns: null,
    theStratPatterns: null
  }), true);

  assert.equal(hasActivePatterns({
    candlePatterns: { selected: [] },
    chartPatterns: null,
    theStratPatterns: null
  }), false);
});

test('hides individual applied patterns from legend and markers', () => {
  const patterns = {
    candlePatterns: {
      selected: ['Hammer', 'Doji'],
      hidden: ['Hammer'],
      patterns: [
        {
          time: '2026-05-17',
          patterns: [
            { type: 'hammer', name: 'Hammer', signal: 'bullish' },
            { type: 'doji', name: 'Doji', signal: 'neutral' }
          ]
        }
      ]
    }
  };

  assert.deepEqual(
    getPatternLegendItems(patterns).map(item => ({ name: item.name, visible: item.visible })),
    [
      { name: 'Hammer', visible: false },
      { name: 'Doji', visible: true }
    ]
  );
  assert.deepEqual(getPatternMarkers(patterns).map(item => item.text), ['doji']);
});
