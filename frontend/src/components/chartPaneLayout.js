export const getChartPaneLayout = (showVolume, lowerIndicatorCount = 0) => {
  const rows = ['minmax(0, 7fr)'];
  if (showVolume) rows.push('minmax(54px, 2fr)');
  for (let index = 0; index < lowerIndicatorCount; index += 1) {
    rows.push('minmax(64px, 2.5fr)');
  }

  return {
    priceRows: rows.join(' '),
    volumeVisible: Boolean(showVolume),
    lowerVisible: lowerIndicatorCount > 0
  };
};
