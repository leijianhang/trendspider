export const scannerOverlayIndicatorOptions = [
  'Volume',
  'VWAP',
  'MA(5)',
  'MA(10)',
  'MA(20)',
  'MA(60)',
  'EMA(12)',
  'EMA(21)',
  'EMA(26)',
  'Bollinger Upper',
  'Bollinger Middle',
  'Bollinger Lower',
  'Ichimoku Tenkan',
  'Ichimoku Kijun',
  'Ichimoku Senkou A',
  'Ichimoku Senkou B',
  'New High',
  'New Low'
];

export const scannerLowerIndicatorOptions = [
  'MACD Line',
  'MACD Signal',
  'MACD Histogram',
  'RSI(14)',
  'KDJ K',
  'KDJ D',
  'KDJ J',
  'Stochastic %K',
  'Stochastic %D',
  'CCI(20)',
  'ATR(14)',
  'OBV',
  'MFI(14)',
  'ADX(14)'
];

export const getScannerIndicatorFamily = operand => {
  if (scannerLowerIndicatorOptions.includes(operand)) return 'lower';
  if (scannerOverlayIndicatorOptions.includes(operand)) return 'overlay';
  return null;
};
