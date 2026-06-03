const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

export const coordinateToAnchor = ({ point, chart, series }) => {
  if (!point || !chart || !series) return null;
  const time = chart.timeScale().coordinateToTime(point.x);
  const price = series.coordinateToPrice(point.y);

  if (!isFiniteNumber(time) || !isFiniteNumber(price)) return null;

  return {
    time,
    price
  };
};

export const anchorToPoint = ({ anchor, chart, series }) => {
  if (!anchor || !chart || !series) return null;
  const x = chart.timeScale().timeToCoordinate(anchor.time);
  const y = series.priceToCoordinate(anchor.price);

  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  return {
    x,
    y
  };
};

export const getPointerPoint = (event, element) => {
  const rect = element?.getBoundingClientRect();
  if (!rect) return null;

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};

export const formatMeasureLabel = (start, end) => {
  const startPrice = Number(start?.price);
  const endPrice = Number(end?.price);
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice) || startPrice === 0) return '';

  const delta = endPrice - startPrice;
  const percent = (delta / startPrice) * 100;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
};
