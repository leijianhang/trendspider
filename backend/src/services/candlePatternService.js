/**
 * K线形态识别服务
 * 识别经典的K线形态（Candle Patterns）
 */

/**
 * 判断是否为锤子线 (Hammer)
 * 特征：实体小，下影线长（至少是实体的2倍），上影线很短或没有
 */
export const isHammer = (candle, prevCandle) => {
  const body = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const range = candle.high - candle.low;

  // 实体小于整个范围的30%
  const smallBody = body < range * 0.3;
  // 下影线至少是实体的2倍
  const longLowerShadow = lowerShadow >= body * 2;
  // 上影线很短
  const shortUpperShadow = upperShadow < body * 0.5;
  // 出现在下跌趋势中
  const inDowntrend = prevCandle && candle.close < prevCandle.close;

  return smallBody && longLowerShadow && shortUpperShadow && inDowntrend;
};

/**
 * 判断是否为倒锤子线 (Inverted Hammer)
 */
export const isInvertedHammer = (candle, prevCandle) => {
  const body = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const range = candle.high - candle.low;

  const smallBody = body < range * 0.3;
  const longUpperShadow = upperShadow >= body * 2;
  const shortLowerShadow = lowerShadow < body * 0.5;
  const inDowntrend = prevCandle && candle.close < prevCandle.close;

  return smallBody && longUpperShadow && shortLowerShadow && inDowntrend;
};

/**
 * 判断是否为射击之星 (Shooting Star)
 */
export const isShootingStar = (candle, prevCandle) => {
  const body = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const range = candle.high - candle.low;

  const smallBody = body < range * 0.3;
  const longUpperShadow = upperShadow >= body * 2;
  const shortLowerShadow = lowerShadow < body * 0.5;
  const inUptrend = prevCandle && candle.close > prevCandle.close;

  return smallBody && longUpperShadow && shortLowerShadow && inUptrend;
};

/**
 * 判断是否为上吊线 (Hanging Man)
 */
export const isHangingMan = (candle, prevCandle) => {
  const body = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const range = candle.high - candle.low;

  const smallBody = body < range * 0.3;
  const longLowerShadow = lowerShadow >= body * 2;
  const shortUpperShadow = upperShadow < body * 0.5;
  const inUptrend = prevCandle && candle.close > prevCandle.close;

  return smallBody && longLowerShadow && shortUpperShadow && inUptrend;
};

/**
 * 判断是否为十字星 (Doji)
 */
export const isDoji = (candle) => {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;

  // 实体非常小，小于整个范围的5%
  return body < range * 0.05;
};

/**
 * 判断是否为蜻蜓十字星 (Dragonfly Doji)
 */
export const isDragonflyDoji = (candle) => {
  const body = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const range = candle.high - candle.low;

  const verySmallBody = body < range * 0.05;
  const noUpperShadow = upperShadow < range * 0.05;
  const longLowerShadow = lowerShadow > range * 0.6;

  return verySmallBody && noUpperShadow && longLowerShadow;
};

/**
 * 判断是否为墓碑十字星 (Gravestone Doji)
 */
export const isGravestoneDoji = (candle) => {
  const body = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const range = candle.high - candle.low;

  const verySmallBody = body < range * 0.05;
  const longUpperShadow = upperShadow > range * 0.6;
  const noLowerShadow = lowerShadow < range * 0.05;

  return verySmallBody && longUpperShadow && noLowerShadow;
};

/**
 * 判断是否为看涨吞没 (Bullish Engulfing)
 */
export const isBullishEngulfing = (candle, prevCandle) => {
  if (!prevCandle) return false;

  const prevBearish = prevCandle.close < prevCandle.open;
  const currentBullish = candle.close > candle.open;
  const engulfs = candle.open < prevCandle.close && candle.close > prevCandle.open;

  return prevBearish && currentBullish && engulfs;
};

/**
 * 判断是否为看跌吞没 (Bearish Engulfing)
 */
export const isBearishEngulfing = (candle, prevCandle) => {
  if (!prevCandle) return false;

  const prevBullish = prevCandle.close > prevCandle.open;
  const currentBearish = candle.close < candle.open;
  const engulfs = candle.open > prevCandle.close && candle.close < prevCandle.open;

  return prevBullish && currentBearish && engulfs;
};

/**
 * 判断是否为启明星 (Morning Star)
 * 三根K线形态：大阴线 + 小实体 + 大阳线
 */
export const isMorningStar = (candle, prevCandle, prevPrevCandle) => {
  if (!prevCandle || !prevPrevCandle) return false;

  // 第一根：大阴线
  const firstBearish = prevPrevCandle.close < prevPrevCandle.open;
  const firstLargeBody = Math.abs(prevPrevCandle.close - prevPrevCandle.open) >
    (prevPrevCandle.high - prevPrevCandle.low) * 0.6;

  // 第二根：小实体（星）
  const secondSmallBody = Math.abs(prevCandle.close - prevCandle.open) <
    (prevCandle.high - prevCandle.low) * 0.3;
  const secondGap = prevCandle.high < prevPrevCandle.close;

  // 第三根：大阳线
  const thirdBullish = candle.close > candle.open;
  const thirdLargeBody = Math.abs(candle.close - candle.open) >
    (candle.high - candle.low) * 0.6;
  const thirdCloseAboveFirst = candle.close > (prevPrevCandle.open + prevPrevCandle.close) / 2;

  return firstBearish && firstLargeBody && secondSmallBody && secondGap &&
         thirdBullish && thirdLargeBody && thirdCloseAboveFirst;
};

/**
 * 判断是否为黄昏星 (Evening Star)
 */
export const isEveningStar = (candle, prevCandle, prevPrevCandle) => {
  if (!prevCandle || !prevPrevCandle) return false;

  // 第一根：大阳线
  const firstBullish = prevPrevCandle.close > prevPrevCandle.open;
  const firstLargeBody = Math.abs(prevPrevCandle.close - prevPrevCandle.open) >
    (prevPrevCandle.high - prevPrevCandle.low) * 0.6;

  // 第二根：小实体（星）
  const secondSmallBody = Math.abs(prevCandle.close - prevCandle.open) <
    (prevCandle.high - prevCandle.low) * 0.3;
  const secondGap = prevCandle.low > prevPrevCandle.close;

  // 第三根：大阴线
  const thirdBearish = candle.close < candle.open;
  const thirdLargeBody = Math.abs(candle.close - candle.open) >
    (candle.high - candle.low) * 0.6;
  const thirdCloseBelowFirst = candle.close < (prevPrevCandle.open + prevPrevCandle.close) / 2;

  return firstBullish && firstLargeBody && secondSmallBody && secondGap &&
         thirdBearish && thirdLargeBody && thirdCloseBelowFirst;
};

/**
 * 判断是否为三只乌鸦 (Three Black Crows)
 */
export const isThreeBlackCrows = (candle, prevCandle, prevPrevCandle) => {
  if (!prevCandle || !prevPrevCandle) return false;

  const allBearish =
    prevPrevCandle.close < prevPrevCandle.open &&
    prevCandle.close < prevCandle.open &&
    candle.close < candle.open;

  const consecutiveLower =
    prevCandle.close < prevPrevCandle.close &&
    candle.close < prevCandle.close;

  const allLargeBodies =
    Math.abs(prevPrevCandle.close - prevPrevCandle.open) > (prevPrevCandle.high - prevPrevCandle.low) * 0.6 &&
    Math.abs(prevCandle.close - prevCandle.open) > (prevCandle.high - prevCandle.low) * 0.6 &&
    Math.abs(candle.close - candle.open) > (candle.high - candle.low) * 0.6;

  return allBearish && consecutiveLower && allLargeBodies;
};

/**
 * 判断是否为三个白兵 (Three White Soldiers)
 */
export const isThreeWhiteSoldiers = (candle, prevCandle, prevPrevCandle) => {
  if (!prevCandle || !prevPrevCandle) return false;

  const allBullish =
    prevPrevCandle.close > prevPrevCandle.open &&
    prevCandle.close > prevCandle.open &&
    candle.close > candle.open;

  const consecutiveHigher =
    prevCandle.close > prevPrevCandle.close &&
    candle.close > prevCandle.close;

  const allLargeBodies =
    Math.abs(prevPrevCandle.close - prevPrevCandle.open) > (prevPrevCandle.high - prevPrevCandle.low) * 0.6 &&
    Math.abs(prevCandle.close - prevCandle.open) > (prevCandle.high - prevCandle.low) * 0.6 &&
    Math.abs(candle.close - candle.open) > (candle.high - candle.low) * 0.6;

  return allBullish && consecutiveHigher && allLargeBodies;
};

/**
 * 判断是否为刺透形态 (Piercing Pattern)
 */
export const isPiercingPattern = (candle, prevCandle) => {
  if (!prevCandle) return false;

  const prevBearish = prevCandle.close < prevCandle.open;
  const currentBullish = candle.close > candle.open;

  // 当前K线开盘低于前一根收盘
  const gapDown = candle.open < prevCandle.close;

  // 当前K线收盘在前一根实体的中点以上
  const piercing = candle.close > (prevCandle.open + prevCandle.close) / 2 &&
                   candle.close < prevCandle.open;

  return prevBearish && currentBullish && gapDown && piercing;
};

/**
 * 判断是否为乌云盖顶 (Dark Cloud Cover)
 */
export const isDarkCloudCover = (candle, prevCandle) => {
  if (!prevCandle) return false;

  const prevBullish = prevCandle.close > prevCandle.open;
  const currentBearish = candle.close < candle.open;

  // 当前K线开盘高于前一根收盘
  const gapUp = candle.open > prevCandle.close;

  // 当前K线收盘在前一根实体的中点以下
  const covering = candle.close < (prevCandle.open + prevCandle.close) / 2 &&
                   candle.close > prevCandle.open;

  return prevBullish && currentBearish && gapUp && covering;
};

/**
 * 扫描所有K线形态
 * @param {Array} data - K线数据
 * @returns {Array} 识别到的形态列表
 */
export const scanCandlePatterns = (data) => {
  const patterns = [];

  for (let i = 2; i < data.length; i++) {
    const candle = data[i];
    const prevCandle = data[i - 1];
    const prevPrevCandle = data[i - 2];

    const detectedPatterns = [];

    // 单根K线形态
    if (isHammer(candle, prevCandle)) {
      detectedPatterns.push({ type: 'hammer', signal: 'bullish', name: '锤子线' });
    }
    if (isInvertedHammer(candle, prevCandle)) {
      detectedPatterns.push({ type: 'inverted_hammer', signal: 'bullish', name: '倒锤子线' });
    }
    if (isShootingStar(candle, prevCandle)) {
      detectedPatterns.push({ type: 'shooting_star', signal: 'bearish', name: '射击之星' });
    }
    if (isHangingMan(candle, prevCandle)) {
      detectedPatterns.push({ type: 'hanging_man', signal: 'bearish', name: '上吊线' });
    }
    if (isDoji(candle)) {
      detectedPatterns.push({ type: 'doji', signal: 'neutral', name: '十字星' });
    }
    if (isDragonflyDoji(candle)) {
      detectedPatterns.push({ type: 'dragonfly_doji', signal: 'bullish', name: '蜻蜓十字星' });
    }
    if (isGravestoneDoji(candle)) {
      detectedPatterns.push({ type: 'gravestone_doji', signal: 'bearish', name: '墓碑十字星' });
    }

    // 两根K线形态
    if (isBullishEngulfing(candle, prevCandle)) {
      detectedPatterns.push({ type: 'bullish_engulfing', signal: 'bullish', name: '看涨吞没' });
    }
    if (isBearishEngulfing(candle, prevCandle)) {
      detectedPatterns.push({ type: 'bearish_engulfing', signal: 'bearish', name: '看跌吞没' });
    }
    if (isPiercingPattern(candle, prevCandle)) {
      detectedPatterns.push({ type: 'piercing_pattern', signal: 'bullish', name: '刺透形态' });
    }
    if (isDarkCloudCover(candle, prevCandle)) {
      detectedPatterns.push({ type: 'dark_cloud_cover', signal: 'bearish', name: '乌云盖顶' });
    }

    // 三根K线形态
    if (isMorningStar(candle, prevCandle, prevPrevCandle)) {
      detectedPatterns.push({ type: 'morning_star', signal: 'bullish', name: '启明星' });
    }
    if (isEveningStar(candle, prevCandle, prevPrevCandle)) {
      detectedPatterns.push({ type: 'evening_star', signal: 'bearish', name: '黄昏星' });
    }
    if (isThreeBlackCrows(candle, prevCandle, prevPrevCandle)) {
      detectedPatterns.push({ type: 'three_black_crows', signal: 'bearish', name: '三只乌鸦' });
    }
    if (isThreeWhiteSoldiers(candle, prevCandle, prevPrevCandle)) {
      detectedPatterns.push({ type: 'three_white_soldiers', signal: 'bullish', name: '三个白兵' });
    }

    if (detectedPatterns.length > 0) {
      patterns.push({
        index: i,
        time: candle.time,
        patterns: detectedPatterns
      });
    }
  }

  return patterns;
};
