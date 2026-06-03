const toPatternKey = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const isHiddenPattern = (group, patternName, patternType) => {
  const hiddenKeys = (group?.hidden || []).map(toPatternKey);
  return hiddenKeys.includes(toPatternKey(patternName)) || hiddenKeys.includes(toPatternKey(patternType));
};

const isSelectedPattern = (group, patternName, patternType) => {
  const selected = group?.selected || [];
  if (selected.length === 0) return false;

  const selectedKeys = selected.map(toPatternKey);
  return selectedKeys.includes(toPatternKey(patternName)) || selectedKeys.includes(toPatternKey(patternType));
};

const shouldRenderPattern = (group, patternName, patternType) => (
  isSelectedPattern(group, patternName, patternType) && !isHiddenPattern(group, patternName, patternType)
);

export const getPatternMarkers = (patterns = {}) => {
  const markers = [];

  patterns.candlePatterns?.patterns?.forEach(item => {
    item.patterns?.forEach(pattern => {
      if (!shouldRenderPattern(patterns.candlePatterns, pattern.name, pattern.type)) return;
      const signal = pattern.signal;
      markers.push({
        time: item.time,
        position: signal === 'bearish' ? 'aboveBar' : 'belowBar',
        color: signal === 'bearish' ? '#ff6b7a' : '#4ee093',
        shape: signal === 'bearish' ? 'arrowDown' : 'arrowUp',
        text: pattern.type || pattern.name || 'Candle'
      });
    });
  });

  patterns.chartPatterns?.patterns?.forEach(item => {
    if (!shouldRenderPattern(patterns.chartPatterns, item.name, item.type)) return;
    const signal = item.signal;
    markers.push({
      time: item.time,
      position: signal === 'bearish' ? 'aboveBar' : 'belowBar',
      color: signal === 'bearish' ? '#ff6b7a' : '#4ee093',
      shape: signal === 'bearish' ? 'arrowDown' : 'arrowUp',
      text: item.type || item.name || 'Chart'
    });
  });

  patterns.theStratPatterns?.patterns?.forEach(item => {
    if (!shouldRenderPattern(patterns.theStratPatterns, item.pattern?.name, item.pattern?.type)) return;
    const signal = item.pattern?.signal;
    markers.push({
      time: item.time,
      position: signal === 'bearish' ? 'aboveBar' : 'belowBar',
      color: signal === 'bearish' ? '#ff6b7a' : '#4ee093',
      shape: signal === 'bearish' ? 'arrowDown' : 'arrowUp',
      text: item.pattern?.type || item.pattern?.name || 'TheStrat'
    });
  });

  return markers;
};

const countCandleMatches = (candlePatterns, selectedName) => {
  const selectedKey = toPatternKey(selectedName);
  return (candlePatterns?.patterns || []).reduce((count, row) => (
    count + (row.patterns || []).filter(pattern => (
      toPatternKey(pattern.name) === selectedKey || toPatternKey(pattern.type) === selectedKey
    )).length
  ), 0);
};

const countChartMatches = (chartPatterns, selectedName) => {
  const selectedKey = toPatternKey(selectedName);
  return (chartPatterns?.patterns || []).filter(pattern => (
    toPatternKey(pattern.name) === selectedKey || toPatternKey(pattern.type) === selectedKey
  )).length;
};

const countTheStratMatches = (theStratPatterns, selectedName) => (
  (theStratPatterns?.patterns || []).filter(item => item.pattern?.name === selectedName).length
);

const getSelectedLegendItems = ({ groupKey, groupName, group, selected = [], countMatches }) => (
  selected.map(name => ({
    key: `${groupKey}-${name}`,
    groupKey,
    name,
    groupName,
    count: countMatches(name),
    visible: !isHiddenPattern(group, name)
  }))
);

export const getPatternLegendItems = (patterns = {}) => [
  ...getSelectedLegendItems({
    groupKey: 'candlestick',
    groupName: 'Candlestick',
    group: patterns.candlePatterns,
    selected: patterns.candlePatterns?.selected,
    countMatches: name => countCandleMatches(patterns.candlePatterns, name)
  }),
  ...getSelectedLegendItems({
    groupKey: 'chart',
    groupName: 'Chart Pattern',
    group: patterns.chartPatterns,
    selected: patterns.chartPatterns?.selected,
    countMatches: name => countChartMatches(patterns.chartPatterns, name)
  }),
  ...getSelectedLegendItems({
    groupKey: 'thestrat',
    groupName: 'TheStrat',
    group: patterns.theStratPatterns,
    selected: patterns.theStratPatterns?.selected,
    countMatches: name => countTheStratMatches(patterns.theStratPatterns, name)
  })
];

export const hasActivePatterns = (patterns = {}) => (
  Boolean(patterns.candlePatterns?.selected?.length)
  || Boolean(patterns.chartPatterns?.selected?.length)
  || Boolean(patterns.theStratPatterns?.selected?.length)
);
