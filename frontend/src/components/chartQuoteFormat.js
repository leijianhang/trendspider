export const formatPrice = value => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return number >= 1000 ? number.toFixed(2) : number.toFixed(3).replace(/0$/, '');
};

export const formatChange = value => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '+0.00%';
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
};

export const formatPriceChange = value => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '+0.00';
  return `${number >= 0 ? '+' : '-'}${formatPrice(Math.abs(number))}`;
};

const getChangeTone = value => {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return 'neutral';
  return number > 0 ? 'up' : 'down';
};

export const getQuoteSnapshot = data => {
  const rows = Array.isArray(data) ? data : [];
  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const previousClose = Number(previous?.close ?? latest?.open);
  const latestClose = Number(latest?.close);
  const change = latestClose - previousClose;
  const changePercent = Number.isFinite(previousClose) && previousClose !== 0
    ? (change / previousClose) * 100
    : 0;

  return {
    open: formatPrice(latest?.open),
    high: formatPrice(latest?.high),
    low: formatPrice(latest?.low),
    close: formatPrice(latest?.close),
    change: formatPriceChange(change),
    pctChange: formatChange(changePercent),
    tone: getChangeTone(change)
  };
};

export const getQuoteSnapshotForBar = (data, bar) => {
  const rows = Array.isArray(data) ? data : [];
  if (!bar) return getQuoteSnapshot(rows);

  const index = rows.findIndex(item => item === bar);
  const previous = index > 0 ? rows[index - 1] : null;
  const previousClose = Number(previous?.close ?? bar.open);
  const close = Number(bar.close);
  const change = close - previousClose;
  const changePercent = Number.isFinite(previousClose) && previousClose !== 0
    ? (change / previousClose) * 100
    : 0;

  return {
    open: formatPrice(bar.open),
    high: formatPrice(bar.high),
    low: formatPrice(bar.low),
    close: formatPrice(bar.close),
    change: formatPriceChange(change),
    pctChange: formatChange(changePercent),
    tone: getChangeTone(change)
  };
};
