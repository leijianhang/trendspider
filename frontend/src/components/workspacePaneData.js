export const getPaneDataKey = ({ paneId, symbol, period, adjust }) =>
  [paneId, symbol || '', period || '', adjust || ''].join('|');

export const getPaneKlineData = (cache, params) => {
  const key = getPaneDataKey(params);
  return cache[key] || null;
};

export const setPaneKlineData = (cache, params) => {
  const key = getPaneDataKey(params);
  return {
    ...cache,
    [key]: params.data
  };
};
