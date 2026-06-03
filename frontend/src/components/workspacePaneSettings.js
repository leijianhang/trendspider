export const createWorkspacePaneSettings = ({
  id,
  symbol,
  name,
  type,
  period,
  chartStyle,
  showVolume
}) => ({
  id,
  symbol,
  name,
  type,
  period,
  chartStyle,
  showVolume
});

export const reconcileWorkspacePaneSettings = ({ previous = [], count, defaults }) => {
  const safeCount = Math.max(1, Number(count) || 1);

  return Array.from({ length: safeCount }).map((_, index) => {
    const existing = previous[index];
    if (existing) {
      return {
        ...existing,
        symbol: existing.symbol || defaults.symbol,
        name: existing.name || defaults.name,
        type: existing.type || defaults.type
      };
    }

    return createWorkspacePaneSettings({
      id: `pane-${index + 1}`,
      symbol: defaults.symbol,
      name: defaults.name,
      type: defaults.type,
      period: defaults.period,
      chartStyle: defaults.chartStyle,
      showVolume: defaults.showVolume
    });
  });
};

export const syncAllPaneSymbols = (panes, symbolInfo) =>
  panes.map(pane => ({
    ...pane,
    symbol: symbolInfo.symbol,
    name: symbolInfo.name,
    type: symbolInfo.type
  }));
