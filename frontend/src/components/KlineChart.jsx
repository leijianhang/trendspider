import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'antd';
import { createChart } from 'lightweight-charts';
import {
  CloseOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  MoreOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';
import {
  getChartTime,
  toCandleData,
  toLineData,
  toVolumeData
} from './chartDataTransform';
import {
  clampLogicalRange,
  getLogicalRangeKeepingIndexVisible,
  getNextCrosshairIndex,
  getZoomedLogicalRange
} from './chartKeyboardNavigation';
import { getChartPaneLayout } from './chartPaneLayout';
import {
  getOverlayIndicatorEditorRows,
  getOverlayIndicatorLegendItems,
  getOverlayIndicatorSeriesColors,
  withOverlayIndicatorValues
} from './indicatorLegend';
import DrawingOverlay from './DrawingOverlay';
import { getPatternLegendItems, getPatternMarkers } from './patternMarkers';
import { useChartStore } from '../store/chartStore';
import './KlineChart.css';

const DEFAULT_VISIBLE_BARS = 160;
const LOAD_OLDER_VISIBLE_THRESHOLD = 8;

const baseChartOptions = {
  layout: {
    background: { color: '#080b0f' },
    textColor: '#d1d8df',
  },
  grid: {
    vertLines: { color: '#17212a' },
    horzLines: { color: '#17212a' },
  },
  crosshair: {
    mode: 1,
    vertLine: {
      visible: false,
      labelVisible: false,
    },
    horzLine: {
      visible: false,
      labelVisible: false,
    },
  },
  rightPriceScale: {
    borderColor: '#2d3348',
    minimumWidth: 72,
  },
  timeScale: {
    borderColor: '#2d3348',
    timeVisible: true,
    secondsVisible: false,
    fixLeftEdge: true,
    fixRightEdge: true,
    barSpacing: 7,
  },
};

const chartThemeOptions = {
  night: {
    layout: {
      background: { color: '#080b0f' },
      textColor: '#d1d8df',
    },
    grid: {
      vertLines: { color: '#17212a' },
      horzLines: { color: '#17212a' },
    },
    borderColor: '#2d3348',
  },
  day: {
    layout: {
      background: { color: '#ffffff' },
      textColor: '#334155',
    },
    grid: {
      vertLines: { color: '#e7edf3' },
      horzLines: { color: '#e7edf3' },
    },
    borderColor: '#cfd7df',
  },
};

const getThemedChartOptions = theme => {
  const themeOptions = chartThemeOptions[theme] || chartThemeOptions.night;
  return {
    ...baseChartOptions,
    layout: themeOptions.layout,
    grid: themeOptions.grid,
    rightPriceScale: {
      ...baseChartOptions.rightPriceScale,
      borderColor: themeOptions.borderColor,
    },
    timeScale: {
      ...baseChartOptions.timeScale,
      borderColor: themeOptions.borderColor,
    },
  };
};

const hiddenTimeScaleOptions = {
  visible: false,
  timeVisible: false,
  secondsVisible: false,
  borderVisible: false,
};

const getVisibleTimeScaleOptions = theme => ({
  visible: true,
  timeVisible: true,
  secondsVisible: false,
  borderVisible: true,
  borderColor: (chartThemeOptions[theme] || chartThemeOptions.night).borderColor,
});

const patternGroupFields = {
  candlestick: 'candlePatterns',
  chart: 'chartPatterns',
  thestrat: 'theStratPatterns'
};

const lowerIndicatorColorSets = {
  macd: ['#4ea1ff', '#ffb84d', '#8d9aa7'],
  rsi: ['#b36bff'],
  kdj: ['#4ea1ff', '#ffb84d', '#e05cff'],
  obv: ['#4ee093']
};

const getLowerIndicatorColors = (indicatorKey, count = 1) => {
  const colors = lowerIndicatorColorSets[indicatorKey] || ['#88d4ff'];
  return Array.from({ length: count }, (_, index) => colors[index % colors.length]);
};

const KlineChart = ({
  data,
  currentSymbol,
  currentType = 'stock',
  period = 'daily',
  indicators = {},
  chartStyle = 'candles',
  showVolume = true,
  scaleMode = 'auto',
  patterns = {},
  strategyMarkers = [],
  activeDrawingTool,
  addDrawing,
  deleteDrawing,
  drawingsBySymbol = {},
  selectedDrawingId,
  selectDrawing,
  updateDrawing,
  lowerLegendCollapsed = {},
  onLowerLegendCollapsedChange,
  onHoverBar,
  onIndicatorSettings,
  onLoadOlderData,
  theme = 'night'
}) => {
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [activeLegendBar, setActiveLegendBar] = useState(null);
  const [editingLegendKey, setEditingLegendKey] = useState(null);
  const [legendDraft, setLegendDraft] = useState(null);
  const [editingLowerKey, setEditingLowerKey] = useState(null);
  const [lowerDraft, setLowerDraft] = useState(null);
  const [sharedCrosshairX, setSharedCrosshairX] = useState(null);
  const [sharedCrosshairY, setSharedCrosshairY] = useState(null);
  const [sharedCrosshairTimeLabel, setSharedCrosshairTimeLabel] = useState('');
  const containerRef = useRef(null);
  const pricePaneRef = useRef(null);
  const volumePaneRef = useRef(null);
  const lowerPaneRefs = useRef({});
  const priceChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  const lowerChartRefs = useRef({});
  const themedChartOptions = useMemo(() => getThemedChartOptions(theme), [theme]);
  const visibleTimeScaleOptions = useMemo(() => getVisibleTimeScaleOptions(theme), [theme]);
  const priceSeriesRef = useRef(null);
  const crosshairPriceLineRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const lowerSeriesRef = useRef({});
  const lowerSeriesDataRef = useRef({});
  const indicatorSeriesRef = useRef({});
  const syncingRangeRef = useRef(false);
  const syncingCrosshairRef = useRef(false);
  const clampingRangeRef = useRef(false);
  const activeIndexRef = useRef(null);
  const dataLengthRef = useRef(data?.length || 0);
  const previousDataMetaRef = useRef({ length: 0, firstTime: null, lastTime: null });
  const loadingOlderRef = useRef(false);
  const loadOlderDataRef = useRef(onLoadOlderData);
  const visibleRangeInitializedRef = useRef(false);
  const lowerIndicatorKeys = ['macd', 'rsi', 'kdj', 'obv'];
  const lowerIndicatorItems = useMemo(() => (
    lowerIndicatorKeys.flatMap(baseKey => {
      const indicator = indicators[baseKey];
      const activeInstances = indicator?.instances?.filter(instance => instance.enabled && instance.visible !== false);

      if (indicator?.instances) {
        return activeInstances.map((instance, index) => ({
          key: instance.id,
          baseKey,
          instanceIndex: index,
          state: instance
        }));
      }

      return indicator?.enabled && indicator?.visible !== false
        ? [{ key: baseKey, baseKey, instanceIndex: 0, state: indicator }]
        : [];
    })
  ), [indicators]);
  const lowerIndicatorKeySignature = lowerIndicatorItems.map(item => item.key).join('|');
  const bottomTimeScalePane = lowerIndicatorItems.length
    ? lowerIndicatorItems[lowerIndicatorItems.length - 1].key
    : (showVolume ? 'volume' : 'price');

  useEffect(() => {
    loadOlderDataRef.current = onLoadOlderData;
  }, [onLoadOlderData]);

  const scopedLowerData = useMemo(() => {
    if (!activeLegendBar) return data;
    const activeTime = getChartTime(activeLegendBar);
    const activeIndex = data.findIndex(item => item === activeLegendBar || getChartTime(item) === activeTime);
    return activeIndex >= 0 ? data.slice(0, activeIndex + 1) : data;
  }, [activeLegendBar, data]);
  const formatLowerValue = value => (Number.isFinite(value) ? Number(value).toFixed(2) : '-');
  const formatVolumeValue = value => {
    if (!Number.isFinite(value)) return '-';
    if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(2)}B`;
    if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(2)}W`;
    return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };
  const getLastValue = series => series?.[series.length - 1]?.value;
  const formatCrosshairTimeLabel = (bar) => {
    if (!bar?.time) return '';
    const raw = String(bar.time);
    if (raw.includes(' ')) return raw.slice(0, 16);
    if (raw.includes('T')) return raw.replace('T', ' ').slice(0, 16);
    return raw;
  };
  const getSharedXForTime = (time) => {
    const bottomChart = lowerChartRefs.current[bottomTimeScalePane]
      || (bottomTimeScalePane === 'volume' ? volumeChartRef.current : priceChartRef.current);
    const x = bottomChart?.timeScale().timeToCoordinate(time)
      ?? priceChartRef.current?.timeScale().timeToCoordinate(time);

    return Number.isFinite(x) ? x : null;
  };
  const buildLowerLegendItem = (item) => {
    const baseKey = item.baseKey || item.key;
    if (baseKey === 'macd') {
      const params = item.state.params || {};
      const colors = item.state.colors || getLowerIndicatorColors('macd', 3);
      const macdData = calculateMACD(scopedLowerData, params);
      return {
        key: item.key,
        baseKey,
        name: 'MACD',
        visible: item.state.visible !== false,
        state: item.state,
        colors,
        params: `${params.fast || 12} ${params.slow || 26} ${params.signal || 9}`,
        values: [
          { label: 'MACD', value: formatLowerValue(getLastValue(macdData.macd)), color: colors[0] },
          { label: 'Signal', value: formatLowerValue(getLastValue(macdData.signal)), color: colors[1] },
          { label: 'Hist', value: formatLowerValue(getLastValue(macdData.histogram)), color: colors[2] }
        ]
      };
    }
    if (baseKey === 'rsi') {
      const colors = item.state.colors || getLowerIndicatorColors('rsi', 1);
      const rsiData = calculateRSI(scopedLowerData, item.state.period || 14);
      return {
        key: item.key,
        baseKey,
        name: 'RSI',
        visible: item.state.visible !== false,
        state: item.state,
        colors,
        params: `${item.state.period || 14}`,
        values: [{ label: 'RSI', value: formatLowerValue(getLastValue(rsiData)), color: colors[0] }]
      };
    }
    if (baseKey === 'kdj') {
      const params = item.state.params || {};
      const colors = item.state.colors || getLowerIndicatorColors('kdj', 3);
      const kdjData = calculateKDJ(scopedLowerData, params);
      return {
        key: item.key,
        baseKey,
        name: 'KDJ',
        visible: item.state.visible !== false,
        state: item.state,
        colors,
        params: `${params.n || 9} ${params.m1 || 3} ${params.m2 || 3}`,
        values: [
          { label: 'K', value: formatLowerValue(getLastValue(kdjData.k)), color: colors[0] },
          { label: 'D', value: formatLowerValue(getLastValue(kdjData.d)), color: colors[1] },
          { label: 'J', value: formatLowerValue(getLastValue(kdjData.j)), color: colors[2] }
        ]
      };
    }
    const colors = item.state.colors || getLowerIndicatorColors('obv', 1);
    const obvData = calculateOBV(scopedLowerData);
    return {
      key: item.key,
      baseKey,
      name: 'OBV',
      visible: item.state.visible !== false,
      state: item.state,
      colors,
      params: '',
      values: [{ label: 'OBV', value: formatLowerValue(getLastValue(obvData)), color: colors[0] }]
    };
  };
  const lowerLegendItems = lowerIndicatorItems.map(buildLowerLegendItem);
  const hiddenLowerLegendItems = lowerIndicatorKeys.flatMap(baseKey => {
    const indicator = indicators[baseKey];
    const hiddenInstances = indicator?.instances?.filter(instance => instance.enabled && instance.visible === false);

    if (indicator?.instances) {
      return hiddenInstances.map((instance, index) => buildLowerLegendItem({
        key: instance.id,
        baseKey,
        instanceIndex: index,
        state: instance
      }));
    }

    return indicator?.enabled && indicator?.visible === false
      ? [buildLowerLegendItem({ key: baseKey, baseKey, instanceIndex: 0, state: indicator })]
      : [];
  });
  const activeVolumeBar = activeLegendBar || data?.[data.length - 1];
  const activeVolumeValue = Number(activeVolumeBar?.volume ?? activeVolumeBar?.vol);
  const volumeLegendValue = formatVolumeValue(activeVolumeValue);
  const paneLayout = getChartPaneLayout(showVolume, lowerIndicatorItems.length);
  const overlayLegendItems = withOverlayIndicatorValues(
    getOverlayIndicatorLegendItems(indicators),
    indicators,
    data,
    activeLegendBar
  );
  const visibleOverlayLegendItems = overlayLegendItems.filter(item => item.visible !== false);
  const hiddenOverlayLegendItems = overlayLegendItems.filter(item => item.visible === false);
  const patternLegendItems = patterns?.showPatterns === false ? [] : getPatternLegendItems(patterns);
  const setIndicatorVisible = useChartStore(state => state.setIndicatorVisible);
  const toggleIndicator = useChartStore(state => state.toggleIndicator);
  const updateIndicatorParams = useChartStore(state => state.updateIndicatorParams);
  const setPatterns = useChartStore(state => state.setPatterns);

  useEffect(() => {
    dataLengthRef.current = data?.length || 0;
  }, [data, bottomTimeScalePane, lowerIndicatorKeySignature]);

  useEffect(() => {
    activeIndexRef.current = null;
    previousDataMetaRef.current = { length: 0, firstTime: null, lastTime: null };
    visibleRangeInitializedRef.current = false;
    loadingOlderRef.current = false;
  }, [currentSymbol, period]);

  const updatePatternGroup = (item, updater) => {
    const field = patternGroupFields[item.groupKey];
    if (!field || !patterns?.[field]) return;

    setPatterns({
      ...patterns,
      [field]: updater(patterns[field])
    });
  };

  const togglePatternLegendItemVisible = (item) => {
    updatePatternGroup(item, group => ({
      ...group,
      hidden: item.visible
        ? [...new Set([...(group.hidden || []), item.name])]
        : (group.hidden || []).filter(name => name !== item.name)
    }));
  };

  const removePatternLegendItem = (item) => {
    updatePatternGroup(item, group => ({
      ...group,
      selected: (group.selected || []).filter(name => name !== item.name),
      hidden: (group.hidden || []).filter(name => name !== item.name)
    }));
  };

  const updateIndicatorItem = (item, patch) => {
    const baseKey = item.baseKey || item.key;
    const indicator = indicators[baseKey];

    if (indicator?.instances?.length) {
      updateIndicatorParams(baseKey, {
        instances: indicator.instances.map(instance =>
          instance.id === item.key ? { ...instance, ...patch } : instance
        ),
        enabled: indicator.instances.some(instance => instance.id === item.key ? patch.enabled !== false : instance.enabled)
      });
      return;
    }

    updateIndicatorParams(baseKey, patch);
  };

  const setIndicatorItemVisible = (item, visible) => {
    if (indicators[item.baseKey || item.key]?.instances?.length) {
      updateIndicatorItem(item, { visible });
      return;
    }
    setIndicatorVisible(item.key, visible);
  };

  const removeIndicatorItem = (item) => {
    const baseKey = item.baseKey || item.key;
    const indicator = indicators[baseKey];

    if (indicator?.instances?.length) {
      const nextInstances = indicator.instances.filter(instance => instance.id !== item.key);
      updateIndicatorParams(baseKey, {
        instances: nextInstances,
        enabled: nextInstances.length > 0
      });
      return;
    }

    toggleIndicator(item.key);
  };

  const openLegendEditor = (item) => {
    const indicatorState = item.state || indicators[item.baseKey || item.key] || {};
    setEditingLegendKey(item.key);
    setLegendDraft({
      colors: [...(indicatorState.colors || item.colors || [])],
      periods: indicatorState.periods ? [...indicatorState.periods] : null,
      params: indicatorState.params ? { ...indicatorState.params } : null,
      visible: item.visible
    });
  };

  const updateDraftLineColor = (index, color) => {
    const nextColors = [...(legendDraft?.colors || [])];
    nextColors[index] = color;
    setLegendDraft(draft => ({ ...draft, colors: nextColors }));
  };

  const updateDraftPeriod = (index, value) => {
    const periods = [...(legendDraft?.periods || [])];
    periods[index] = value || 1;
    setLegendDraft(draft => ({ ...draft, periods }));
  };

  const updateDraftBollParam = (paramName, value) => {
    setLegendDraft(draft => ({
      ...draft,
      params: {
        ...draft.params,
        [paramName]: value || (paramName === 'stdDev' ? 0.1 : 1)
      }
    }));
  };

  const closeLegendEditor = () => {
    setEditingLegendKey(null);
    setLegendDraft(null);
  };

  const confirmLegendEditor = (item) => {
    if (!legendDraft || !item) return;
    const patch = { colors: legendDraft.colors, visible: legendDraft.visible };
    if (legendDraft.periods) patch.periods = legendDraft.periods;
    if (legendDraft.params) patch.params = legendDraft.params;
    updateIndicatorItem(item, patch);
    closeLegendEditor();
  };

  const openLowerEditor = (item) => {
    const state = item.state || indicators[item.key] || {};
    const baseKey = item.baseKey || item.key;
    setEditingLowerKey(item.key);
    setLowerDraft({
      colors: [...(state.colors || item.colors || getLowerIndicatorColors(baseKey, item.values?.length || 1))],
      period: state.period || 14,
      params: state.params ? { ...state.params } : null,
      visible: state.visible !== false
    });
  };

  const closeLowerEditor = () => {
    setEditingLowerKey(null);
    setLowerDraft(null);
  };

  const updateLowerDraftParam = (paramName, value) => {
    setLowerDraft(draft => ({
      ...draft,
      params: {
        ...draft.params,
        [paramName]: value || 1
      }
    }));
  };

  const updateLowerDraftColor = (index, color) => {
    const nextColors = [...(lowerDraft?.colors || [])];
    nextColors[index] = color;
    setLowerDraft(draft => ({ ...draft, colors: nextColors }));
  };

  const confirmLowerEditor = (item) => {
    if (!item || !lowerDraft) return;
    const patch = { colors: lowerDraft.colors, visible: lowerDraft.visible };
    if (lowerDraft.params) patch.params = lowerDraft.params;
    if ((item.baseKey || item.key) === 'rsi') patch.period = lowerDraft.period || 1;
    updateLowerIndicatorItem(item, patch);
    closeLowerEditor();
  };

  const updateLowerIndicatorItem = (item, patch) => {
    const baseKey = item.baseKey || item.key;
    const indicator = indicators[baseKey];

    if (indicator?.instances?.length) {
      const nextInstances = indicator.instances.map(instance =>
        instance.id === item.key ? { ...instance, ...patch } : instance
      );
      updateIndicatorParams(baseKey, {
        instances: nextInstances,
        enabled: nextInstances.some(instance => instance.enabled)
      });
      return;
    }

    updateIndicatorParams(baseKey, patch);
  };

  const setLowerIndicatorVisible = (item, visible) => {
    updateLowerIndicatorItem(item, { visible });
  };

  const removeLowerIndicator = (item) => {
    const baseKey = item.baseKey || item.key;
    const indicator = indicators[baseKey];

    if (indicator?.instances?.length) {
      const nextInstances = indicator.instances.filter(instance => instance.id !== item.key);
      updateIndicatorParams(baseKey, {
        instances: nextInstances,
        enabled: nextInstances.length > 0
      });
      return;
    }

    updateIndicatorParams(baseKey, { enabled: false, visible: true, instances: [] });
  };

  const toggleLowerLegendCollapsed = (key) => {
    onLowerLegendCollapsedChange?.(current => ({
      ...current,
      [key]: !current[key]
    }));
  };

  const applyDefaultVisibleRange = () => {
    if (!priceChartRef.current || !data?.length) return;

    const lastIndex = data.length - 1;
    const firstIndex = Math.max(0, lastIndex - DEFAULT_VISIBLE_BARS + 1);
    const range = { from: firstIndex, to: lastIndex };
    priceChartRef.current.timeScale().setVisibleLogicalRange(range);
    volumeChartRef.current?.timeScale().setVisibleLogicalRange(range);
    Object.values(lowerChartRefs.current).forEach(lowerChart => {
      lowerChart?.timeScale().setVisibleLogicalRange(range);
    });
    window.requestAnimationFrame(() => {
      visibleRangeInitializedRef.current = true;
    });
  };

  const requestOlderDataIfNeeded = (range) => {
    if (!visibleRangeInitializedRef.current) return;
    if (!loadOlderDataRef.current || !range || loadingOlderRef.current) return;
    const dataLength = dataLengthRef.current;
    if (dataLength <= DEFAULT_VISIBLE_BARS && range.to >= dataLength - 1) return;
    if (range.from > LOAD_OLDER_VISIBLE_THRESHOLD) return;

    loadingOlderRef.current = true;
    Promise.resolve(loadOlderDataRef.current())
      .finally(() => {
        loadingOlderRef.current = false;
      });
  };

  const clearAllCrosshairs = () => {
    setActiveLegendBar(null);
    onHoverBar?.(null);
    setSharedCrosshairX(null);
    setSharedCrosshairY(null);
    setSharedCrosshairTimeLabel('');
    if (priceSeriesRef.current && crosshairPriceLineRef.current) {
      priceSeriesRef.current.removePriceLine(crosshairPriceLineRef.current);
      crosshairPriceLineRef.current = null;
    }
    priceChartRef.current?.clearCrosshairPosition?.();
    volumeChartRef.current?.clearCrosshairPosition?.();
    Object.values(lowerChartRefs.current).forEach(chart => chart?.clearCrosshairPosition?.());
  };

  const setSharedPriceCrosshair = (price, preferredY = null) => {
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || !priceSeriesRef.current) {
      setSharedCrosshairY(null);
      if (priceSeriesRef.current && crosshairPriceLineRef.current) {
        priceSeriesRef.current.removePriceLine(crosshairPriceLineRef.current);
        crosshairPriceLineRef.current = null;
      }
      return;
    }

    const coordinate = Number.isFinite(preferredY)
      ? preferredY
      : priceSeriesRef.current.priceToCoordinate?.(numericPrice);
    if (!Number.isFinite(coordinate)) {
      setSharedCrosshairY(null);
      if (crosshairPriceLineRef.current) {
        priceSeriesRef.current.removePriceLine(crosshairPriceLineRef.current);
        crosshairPriceLineRef.current = null;
      }
      return;
    }

    setSharedCrosshairY(coordinate);
    if (crosshairPriceLineRef.current) {
      priceSeriesRef.current.removePriceLine(crosshairPriceLineRef.current);
    }
    crosshairPriceLineRef.current = priceSeriesRef.current.createPriceLine({
      price: numericPrice,
      color: '#26a69a',
      lineVisible: false,
      axisLabelVisible: true,
      title: ''
    });
  };

  const syncCrosshairByBar = (bar, source = 'price', priceContext = null) => {
    if (!bar || syncingCrosshairRef.current) return;

    syncingCrosshairRef.current = true;
    const time = getChartTime(bar);
    activeIndexRef.current = data.indexOf(bar);
    setActiveLegendBar(bar);
    onHoverBar?.(bar);

    setSharedCrosshairX(getSharedXForTime(time));
    setSharedCrosshairTimeLabel(formatCrosshairTimeLabel(bar));
    setSharedPriceCrosshair(priceContext?.price ?? bar.close, priceContext?.y);

    if (source !== 'price' && priceChartRef.current && priceSeriesRef.current) {
      priceChartRef.current.setCrosshairPosition(bar.close, time, priceSeriesRef.current);
    }

    if (volumeChartRef.current && volumeSeriesRef.current) {
      const volumeValue = Number(bar.volume || bar.vol || 0);
      if (Number.isFinite(volumeValue)) {
        volumeChartRef.current.setCrosshairPosition(volumeValue, time, volumeSeriesRef.current);
      }
    }

    Object.entries(lowerChartRefs.current).forEach(([key, chart]) => {
      if (!chart) return;
      if (source === key) return;
      const primarySeries = lowerSeriesRef.current[key]?.[0];
      const seriesData = lowerSeriesDataRef.current[key] || [];
      const point = seriesData.find(item => item.time === time);
      if (!primarySeries || !point || !Number.isFinite(point.value)) {
        chart.clearCrosshairPosition?.();
        return;
      }
      chart.setCrosshairPosition(point.value, time, primarySeries);
    });

    syncingCrosshairRef.current = false;
  };

  const updateSharedCrosshairLine = () => {
    const bar = Number.isInteger(activeIndexRef.current) ? data?.[activeIndexRef.current] : null;
    if (!bar || !priceChartRef.current) {
      setSharedCrosshairX(null);
      setSharedCrosshairY(null);
      if (priceSeriesRef.current && crosshairPriceLineRef.current) {
        priceSeriesRef.current.removePriceLine(crosshairPriceLineRef.current);
        crosshairPriceLineRef.current = null;
      }
      return;
    }

    setSharedCrosshairX(getSharedXForTime(getChartTime(bar)));
    setSharedCrosshairTimeLabel(formatCrosshairTimeLabel(bar));
    setSharedPriceCrosshair(bar.close);
  };

  useEffect(() => {
    if (!pricePaneRef.current || !volumePaneRef.current) return;

    const priceChart = createChart(pricePaneRef.current, {
      ...themedChartOptions,
      width: pricePaneRef.current.clientWidth,
      height: pricePaneRef.current.clientHeight,
      rightPriceScale: {
        ...themedChartOptions.rightPriceScale,
        mode: scaleMode === 'log' ? 1 : 0,
      },
      timeScale: {
        ...themedChartOptions.timeScale,
        ...(bottomTimeScalePane === 'price' ? visibleTimeScaleOptions : hiddenTimeScaleOptions),
      },
    });

    const volumeChart = createChart(volumePaneRef.current, {
      ...themedChartOptions,
      width: volumePaneRef.current.clientWidth,
      height: volumePaneRef.current.clientHeight,
      rightPriceScale: {
        ...themedChartOptions.rightPriceScale,
        minimumWidth: 72,
        scaleMargins: { top: 0.12, bottom: 0 },
      },
      timeScale: {
        ...themedChartOptions.timeScale,
        ...(bottomTimeScalePane === 'volume' ? visibleTimeScaleOptions : hiddenTimeScaleOptions),
      },
    });

    const lowerCharts = Object.fromEntries(
      lowerIndicatorItems
        .map(item => [item.key, lowerPaneRefs.current[item.key]])
        .filter(([, element]) => Boolean(element))
        .map(([key, element]) => [key, createChart(element, {
          ...themedChartOptions,
          width: element.clientWidth,
          height: element.clientHeight,
          rightPriceScale: {
            ...themedChartOptions.rightPriceScale,
            minimumWidth: 72,
            scaleMargins: { top: 0.12, bottom: 0.12 },
          },
          timeScale: {
            ...themedChartOptions.timeScale,
            ...(bottomTimeScalePane === key ? visibleTimeScaleOptions : hiddenTimeScaleOptions),
          },
        })])
    );

    priceChartRef.current = priceChart;
    volumeChartRef.current = volumeChart;
    lowerChartRefs.current = lowerCharts;

    const allCharts = [priceChart, volumeChart, ...Object.values(lowerCharts)].filter(Boolean);
    const syncTimeRange = (source) => {
      source.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (!range || syncingRangeRef.current) return;
        if (clampingRangeRef.current) return;
        requestOlderDataIfNeeded(range);
        const clampedRange = clampLogicalRange(range, dataLengthRef.current) || range;
        const rangeWasClamped = clampedRange.from !== range.from || clampedRange.to !== range.to;

        syncingRangeRef.current = true;
        allCharts.forEach(target => {
          if (target !== source || rangeWasClamped) {
            target.timeScale().setVisibleLogicalRange(clampedRange);
          }
        });
        if (rangeWasClamped) {
          updateSharedCrosshairLine();
        }
        syncingRangeRef.current = false;
      });
    };

    allCharts.forEach(syncTimeRange);

    const handleResize = () => {
      if (!pricePaneRef.current || !volumePaneRef.current) return;

      priceChart.applyOptions({
        width: pricePaneRef.current.clientWidth,
        height: pricePaneRef.current.clientHeight,
      });
      volumeChart.applyOptions({
        width: volumePaneRef.current.clientWidth,
        height: volumePaneRef.current.clientHeight,
      });
      Object.entries(lowerCharts).forEach(([key, chart]) => {
        const element = lowerPaneRefs.current[key];
        if (!element) return;
        chart.applyOptions({
          width: element.clientWidth,
          height: element.clientHeight,
        });
      });
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => window.requestAnimationFrame(handleResize))
      : null;

    if (resizeObserver) {
      resizeObserver.observe(pricePaneRef.current);
      resizeObserver.observe(volumePaneRef.current);
      Object.values(lowerPaneRefs.current).forEach(element => {
        if (element) resizeObserver.observe(element);
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      priceChart.remove();
      volumeChart.remove();
      Object.values(lowerCharts).forEach(chart => chart.remove());
      priceChartRef.current = null;
      volumeChartRef.current = null;
      lowerChartRefs.current = {};
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
      lowerSeriesRef.current = {};
      lowerSeriesDataRef.current = {};
      indicatorSeriesRef.current = {};
    };
  }, [lowerIndicatorKeySignature, bottomTimeScalePane, scaleMode]);

  useEffect(() => {
    const chartEntries = [
      ['price', priceChartRef.current],
      ['volume', volumeChartRef.current],
      ...Object.entries(lowerChartRefs.current)
    ].filter(([, chart]) => Boolean(chart));

    chartEntries.forEach(([key, chart]) => {
      chart.applyOptions({
        layout: themedChartOptions.layout,
        grid: themedChartOptions.grid,
        rightPriceScale: themedChartOptions.rightPriceScale,
        timeScale: {
          ...themedChartOptions.timeScale,
          ...(bottomTimeScalePane === key ? visibleTimeScaleOptions : hiddenTimeScaleOptions),
        },
      });
    });
  }, [bottomTimeScalePane, themedChartOptions, visibleTimeScaleOptions]);

  useEffect(() => {
    if (!priceChartRef.current || !data || data.length === 0) return undefined;

    const chart = priceChartRef.current;
    const handleRangeClamp = (range) => {
      if (!range || clampingRangeRef.current) return;

      const clamped = clampLogicalRange(range, data.length);
      if (!clamped || (clamped.from === range.from && clamped.to === range.to)) return;

      clampingRangeRef.current = true;
      chart.timeScale().setVisibleLogicalRange(clamped);
      volumeChartRef.current?.timeScale().setVisibleLogicalRange(clamped);
      Object.values(lowerChartRefs.current).forEach(lowerChart => {
        lowerChart?.timeScale().setVisibleLogicalRange(clamped);
      });
      updateSharedCrosshairLine();
      clampingRangeRef.current = false;
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeClamp);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeClamp);
    };
  }, [data]);

  useEffect(() => {
    if (!priceChartRef.current || !data || data.length === 0) return undefined;

    const chart = priceChartRef.current;
    const timeToBar = new Map(data.map(item => [getChartTime(item), item]));
    const getBarFromParam = (param) => {
      if (!param?.time || !param.point) {
        return null;
      }

      return timeToBar.get(getChartTime({ time: param.time })) || null;
    };
    const handlePriceCrosshairMove = (param) => {
      if (syncingCrosshairRef.current) return;
      const hoveredBar = getBarFromParam(param);
      if (!hoveredBar) {
        clearAllCrosshairs();
        return;
      }
      const hoveredPrice = priceSeriesRef.current?.coordinateToPrice?.(param.point?.y);
      syncCrosshairByBar(hoveredBar, 'price', {
        price: Number.isFinite(Number(hoveredPrice)) ? hoveredPrice : hoveredBar.close,
        y: param.point?.y
      });
    };
    const handleVolumeCrosshairMove = (param) => {
      if (syncingCrosshairRef.current) return;
      const hoveredBar = getBarFromParam(param);
      if (!hoveredBar) {
        clearAllCrosshairs();
        return;
      }
      syncCrosshairByBar(hoveredBar, 'volume');
    };
    const lowerHandlers = Object.entries(lowerChartRefs.current).map(([key, lowerChart]) => {
      const handler = (param) => {
        if (syncingCrosshairRef.current) return;
        const hoveredBar = getBarFromParam(param);
        if (!hoveredBar) {
          clearAllCrosshairs();
          return;
        }
        syncCrosshairByBar(hoveredBar, key);
      };
      lowerChart.subscribeCrosshairMove(handler);
      return [lowerChart, handler];
    });

    chart.subscribeCrosshairMove(handlePriceCrosshairMove);
    volumeChartRef.current?.subscribeCrosshairMove(handleVolumeCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handlePriceCrosshairMove);
      volumeChartRef.current?.unsubscribeCrosshairMove(handleVolumeCrosshairMove);
      lowerHandlers.forEach(([lowerChart, handler]) => {
        lowerChart.unsubscribeCrosshairMove(handler);
      });
    };
  }, [data, onHoverBar, lowerIndicatorKeySignature, bottomTimeScalePane]);

  const moveCrosshairToIndex = (index) => {
    const bar = data?.[index];
    if (!bar || !priceChartRef.current || !priceSeriesRef.current) return;

    const timeScale = priceChartRef.current.timeScale();
    const currentRange = timeScale.getVisibleLogicalRange();
    const nextRange = getLogicalRangeKeepingIndexVisible({
      range: currentRange,
      index,
      length: data.length,
      padding: 0
    });

    if (
      nextRange &&
      (!currentRange || nextRange.from !== currentRange.from || nextRange.to !== currentRange.to)
    ) {
      timeScale.setVisibleLogicalRange(nextRange);
      volumeChartRef.current?.timeScale().setVisibleLogicalRange(nextRange);
      Object.values(lowerChartRefs.current).forEach(lowerChart => {
        lowerChart?.timeScale().setVisibleLogicalRange(nextRange);
      });
      updateSharedCrosshairLine();
    }

    activeIndexRef.current = index;
    syncCrosshairByBar(bar, 'keyboard');
  };

  const handleKeyDown = (event) => {
    if (!data || data.length === 0 || !priceChartRef.current) return;

    if (event.key === 'End') {
      event.preventDefault();
      moveCrosshairToIndex(data.length - 1);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = getNextCrosshairIndex({
        currentIndex: activeIndexRef.current,
        direction: event.key === 'ArrowLeft' ? 'left' : 'right',
        length: data.length
      });
      moveCrosshairToIndex(nextIndex);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const timeScale = priceChartRef.current.timeScale();
      const anchorIndex = Number.isInteger(activeIndexRef.current)
        ? activeIndexRef.current
        : data.length - 1;
      const nextRange = getZoomedLogicalRange(
        timeScale.getVisibleLogicalRange(),
        event.key === 'ArrowUp' ? 'in' : 'out',
        anchorIndex
      );

      if (nextRange) {
        const clampedRange = clampLogicalRange(nextRange, data.length);
        timeScale.setVisibleLogicalRange(clampedRange);
        volumeChartRef.current?.timeScale().setVisibleLogicalRange(clampedRange);
        Object.values(lowerChartRefs.current).forEach(lowerChart => {
          lowerChart?.timeScale().setVisibleLogicalRange(clampedRange);
        });
        updateSharedCrosshairLine();
      }
    }
  };

  useEffect(() => {
    if (!priceChartRef.current) return;

    priceChartRef.current.priceScale('right').applyOptions({
      mode: scaleMode === 'log' ? 1 : 0,
    });
  }, [scaleMode]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      if (priceChartRef.current && pricePaneRef.current) {
        priceChartRef.current.applyOptions({
          width: pricePaneRef.current.clientWidth,
          height: pricePaneRef.current.clientHeight,
        });
      }

      if (volumeChartRef.current && volumePaneRef.current) {
        volumeChartRef.current.applyOptions({
          width: volumePaneRef.current.clientWidth,
          height: volumePaneRef.current.clientHeight,
        });
      }

      Object.entries(lowerChartRefs.current).forEach(([key, lowerChart]) => {
        const element = lowerPaneRefs.current[key];
        if (!lowerChart || !element) return;
        lowerChart.applyOptions({
          width: element.clientWidth,
          height: element.clientHeight,
        });
      });
    });
  }, [showVolume, paneLayout.lowerVisible]);

  useEffect(() => {
    if (!priceChartRef.current || !data || data.length === 0) return;
    const previousMeta = previousDataMetaRef.current;
    const firstTime = getChartTime(data[0]);
    const lastTime = getChartTime(data[data.length - 1]);
    const prependedCount = previousMeta.lastTime === lastTime && data.length > previousMeta.length
      ? data.length - previousMeta.length
      : 0;
    const previousRange = priceChartRef.current.timeScale().getVisibleLogicalRange();

    if (priceSeriesRef.current) {
      if (crosshairPriceLineRef.current) {
        priceSeriesRef.current.removePriceLine(crosshairPriceLineRef.current);
        crosshairPriceLineRef.current = null;
      }
      priceChartRef.current.removeSeries(priceSeriesRef.current);
      priceSeriesRef.current = null;
    }

    if (chartStyle === 'line') {
      priceSeriesRef.current = priceChartRef.current.addLineSeries({
        color: '#4ee093',
        lineWidth: 2,
        priceLineColor: '#4ee093',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      priceSeriesRef.current.setData(toLineData(data));
    } else if (chartStyle === 'area') {
      priceSeriesRef.current = priceChartRef.current.addAreaSeries({
        lineColor: '#4ee093',
        topColor: 'rgba(78, 224, 147, 0.26)',
        bottomColor: 'rgba(78, 224, 147, 0.02)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      priceSeriesRef.current.setData(toLineData(data));
    } else {
      priceSeriesRef.current = priceChartRef.current.addCandlestickSeries({
        upColor: '#ef5350',
        downColor: '#26a69a',
        borderVisible: false,
        wickUpColor: '#ef5350',
        wickDownColor: '#26a69a',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      priceSeriesRef.current.setData(toCandleData(data));
    }

    previousDataMetaRef.current = { length: data.length, firstTime, lastTime };

    if (prependedCount > 0 && previousRange) {
      if (Number.isInteger(activeIndexRef.current)) {
        activeIndexRef.current += prependedCount;
      }
      const shiftedRange = {
        from: previousRange.from + prependedCount,
        to: previousRange.to + prependedCount
      };
      priceChartRef.current.timeScale().setVisibleLogicalRange(shiftedRange);
      volumeChartRef.current?.timeScale().setVisibleLogicalRange(shiftedRange);
      Object.values(lowerChartRefs.current).forEach(lowerChart => {
        lowerChart?.timeScale().setVisibleLogicalRange(shiftedRange);
      });
    } else {
      applyDefaultVisibleRange();
    }
  }, [chartStyle, data, lowerIndicatorKeySignature, bottomTimeScalePane]);

  useEffect(() => {
    if (!priceSeriesRef.current) return;
    const patternMarkers = patterns?.showPatterns === false ? [] : getPatternMarkers(patterns);
    const markers = [...patternMarkers, ...strategyMarkers];
    priceSeriesRef.current.setMarkers(markers);
  }, [chartStyle, data, patterns, strategyMarkers, lowerIndicatorKeySignature, bottomTimeScalePane]);

  useEffect(() => {
    if (!volumeChartRef.current || !data || data.length === 0) return;

    if (volumeSeriesRef.current) {
      volumeChartRef.current.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    if (!showVolume) return;

    volumeSeriesRef.current = volumeChartRef.current.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'right',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    volumeSeriesRef.current.setData(toVolumeData(data));
    applyDefaultVisibleRange();
  }, [data, showVolume, lowerIndicatorKeySignature, bottomTimeScalePane]);

  useEffect(() => {
    if (!priceChartRef.current || !data || data.length === 0) return;

    Object.values(indicatorSeriesRef.current).forEach(series => {
      if (series && priceChartRef.current) {
        priceChartRef.current.removeSeries(series);
      }
    });
    indicatorSeriesRef.current = {};

    overlayLegendItems.forEach(item => {
      if (item.visible === false) return;
      const baseKey = item.baseKey || item.key;
      const state = item.state || indicators[baseKey] || {};

      if (baseKey === 'ma' && state.periods) {
        const colors = item.colors || getOverlayIndicatorSeriesColors('ma', state.periods.length);
        state.periods.forEach((period, index) => {
        const maSeries = priceChartRef.current.addLineSeries({
          color: colors[index % colors.length],
          lineWidth: 1,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          title: '',
        });

        maSeries.setData(calculateMA(data, period));
        indicatorSeriesRef.current[`${item.key}-ma-${period}`] = maSeries;
      });
        return;
      }

      if (baseKey === 'ema' && state.periods) {
        const colors = item.colors || getOverlayIndicatorSeriesColors('ema', state.periods.length);
        state.periods.forEach((period, index) => {
        const emaSeries = priceChartRef.current.addLineSeries({
          color: colors[index % colors.length],
          lineWidth: 1,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          title: '',
        });

        emaSeries.setData(calculateEMA(data, period));
        indicatorSeriesRef.current[`${item.key}-ema-${period}`] = emaSeries;
      });
        return;
      }

      if (baseKey === 'boll' && state.params) {
      const colors = item.colors || getOverlayIndicatorSeriesColors('boll', 3);
      const bollData = calculateBOLL(data, state.params);
      const bollSeries = [
        ['bollUpper', bollData.upper, colors[0]],
        ['bollMiddle', bollData.middle, colors[1]],
        ['bollLower', bollData.lower, colors[2]]
      ];

      bollSeries.forEach(([key, seriesData, color]) => {
        const lineSeries = priceChartRef.current.addLineSeries({
          color,
          lineWidth: key === 'bollMiddle' ? 1 : 1,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          title: '',
        });
        lineSeries.setData(seriesData);
        indicatorSeriesRef.current[`${item.key}-${key}`] = lineSeries;
      });
        return;
      }

      if (baseKey === 'vwap') {
      const [color] = item.colors || getOverlayIndicatorSeriesColors('vwap', 1);
      const vwapSeries = priceChartRef.current.addLineSeries({
        color,
        lineWidth: 1,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
        title: '',
      });
      vwapSeries.setData(calculateVWAP(data));
      indicatorSeriesRef.current[`${item.key}-vwap`] = vwapSeries;
      }
    });
  }, [data, indicators, overlayLegendItems, lowerIndicatorKeySignature, bottomTimeScalePane]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    Object.entries(lowerSeriesRef.current).forEach(([key, seriesList]) => {
      const lowerChart = lowerChartRefs.current[key];
      if (!lowerChart) return;
      seriesList.forEach(series => {
        if (series) lowerChart.removeSeries(series);
      });
    });
    lowerSeriesRef.current = {};
    lowerSeriesDataRef.current = {};

    if (!paneLayout.lowerVisible) return;

    lowerIndicatorItems.forEach(item => {
      const lowerChart = lowerChartRefs.current[item.key];
      if (!lowerChart) return;
      const seriesList = [];
      const baseKey = item.baseKey || item.key;

      if (baseKey === 'macd') {
        const colors = item.state.colors || getLowerIndicatorColors('macd', 3);
        const macdData = calculateMACD(data, item.state.params);
        const histogram = lowerChart.addHistogramSeries({
          color: colors[2],
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const macdLine = lowerChart.addLineSeries({
          color: colors[0],
          lineWidth: 1,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const signalLine = lowerChart.addLineSeries({
          color: colors[1],
          lineWidth: 1,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        histogram.setData(macdData.histogram);
        macdLine.setData(macdData.macd);
        signalLine.setData(macdData.signal);
        seriesList.push(histogram, macdLine, signalLine);
        lowerSeriesDataRef.current[item.key] = macdData.histogram;
      }

      if (baseKey === 'rsi') {
        const colors = item.state.colors || getLowerIndicatorColors('rsi', 1);
        const rsiData = calculateRSI(data, item.state.period || 14);
        const rsiLine = lowerChart.addLineSeries({
          color: colors[0],
          lineWidth: 1,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        rsiLine.setData(rsiData);
        lowerSeriesDataRef.current[item.key] = rsiData;
        seriesList.push(rsiLine);
      }

      if (baseKey === 'kdj') {
        const colors = item.state.colors || getLowerIndicatorColors('kdj', 3);
        const kdjData = calculateKDJ(data, item.state.params);
        lowerSeriesDataRef.current[item.key] = kdjData.k;
        [
          ['k', kdjData.k, colors[0]],
          ['d', kdjData.d, colors[1]],
          ['j', kdjData.j, colors[2]]
        ].forEach(([key, seriesData, color]) => {
          const line = lowerChart.addLineSeries({
            color,
            lineWidth: 1,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          line.setData(seriesData);
          seriesList.push(line);
        });
      }

      if (baseKey === 'obv') {
        const colors = item.state.colors || getLowerIndicatorColors('obv', 1);
        const obvData = calculateOBV(data);
        const obvLine = lowerChart.addLineSeries({
          color: colors[0],
          lineWidth: 1,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        obvLine.setData(obvData);
        lowerSeriesDataRef.current[item.key] = obvData;
        seriesList.push(obvLine);
      }

      lowerSeriesRef.current[item.key] = seriesList;
    });
    applyDefaultVisibleRange();
  }, [data, lowerIndicatorItems, paneLayout.lowerVisible, bottomTimeScalePane]);

  return (
    <div
      ref={containerRef}
      className={[
        'kline-chart-container',
        paneLayout.volumeVisible ? 'has-volume-pane' : 'no-volume-pane',
        paneLayout.lowerVisible ? 'has-lower-pane' : 'no-lower-pane'
      ].join(' ')}
      style={{ gridTemplateRows: paneLayout.priceRows }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => containerRef.current?.focus()}
    >
      <div ref={pricePaneRef} className="kline-price-pane">
        {Number.isFinite(sharedCrosshairX) && (
          <>
            <div
              className="kline-pane-crosshair-line"
              style={{ transform: `translateX(${sharedCrosshairX}px)` }}
            />
            {Number.isFinite(sharedCrosshairY) && (
              <>
                <div
                  className="kline-pane-crosshair-horizontal-line"
                  style={{ transform: `translateY(${sharedCrosshairY}px)` }}
                />
              </>
            )}
            {bottomTimeScalePane === 'price' && sharedCrosshairTimeLabel && (
              <div
                className="kline-crosshair-time-label"
                style={{ left: `${sharedCrosshairX}px` }}
              >
                {sharedCrosshairTimeLabel}
              </div>
            )}
          </>
        )}
        <DrawingOverlay
          activeDrawingTool={activeDrawingTool}
          addDrawing={addDrawing}
          chartRef={priceChartRef}
          data={data}
          deleteDrawing={deleteDrawing}
          drawingsBySymbol={drawingsBySymbol}
          paneRef={pricePaneRef}
          selectedDrawingId={selectedDrawingId}
          selectDrawing={selectDrawing}
          seriesRef={priceSeriesRef}
          symbol={currentSymbol}
          symbolType={currentType}
          period={period}
          updateDrawing={updateDrawing}
        />
      </div>
      {(overlayLegendItems.length > 0 || hiddenLowerLegendItems.length > 0 || patternLegendItems.length > 0) && (
        <div className={legendCollapsed ? 'kline-indicator-legend collapsed' : 'kline-indicator-legend'} aria-label="图表叠加项">
          {(overlayLegendItems.length > 0 || hiddenLowerLegendItems.length > 0) && (
            <button
              className="kline-indicator-legend-toggle"
              title={legendCollapsed ? '显示指标图例' : '隐藏指标图例'}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setLegendCollapsed(collapsed => !collapsed);
              }}
            >
              <UpOutlined />
            </button>
          )}
          {!legendCollapsed && visibleOverlayLegendItems.map(item => (
            <div className="kline-indicator-legend-block" key={item.key}>
              <div className="kline-indicator-legend-item">
                <span className="legend-name">{item.name}</span>
                {item.paramsLabel && <span className="legend-params">{item.paramsLabel}</span>}
                {item.valueItems?.length > 0 && (
                  <span className="legend-values">
                    {item.valueItems.map((valueItem, index) => (
                      <b key={`${valueItem.value}-${index}`} style={{ color: valueItem.color }}>
                        <small>{valueItem.label}</small>
                        {valueItem.value}
                      </b>
                    ))}
                  </span>
                )}
                <button
                  title={`编辑 ${item.label}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openLegendEditor(item);
                  }}
                >
                  <MoreOutlined />
                </button>
                <button
                  title={item.visible ? `隐藏 ${item.label}` : `显示 ${item.label}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIndicatorItemVisible(item, !item.visible);
                  }}
                >
                  <EyeOutlined />
                </button>
                <button
                  title={`移除 ${item.label}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeIndicatorItem(item);
                  }}
                >
                  <CloseOutlined />
                </button>
              </div>
            </div>
          ))}
          {!legendCollapsed && hiddenOverlayLegendItems.map(item => (
            <div className="kline-indicator-legend-block" key={`hidden-${item.key}`}>
              <div className="kline-indicator-legend-item muted">
                <span className="legend-name">{item.name}</span>
                {item.paramsLabel && <span className="legend-params">{item.paramsLabel}</span>}
                <span className="legend-values">
                  <b><small>主图</small>已隐藏</b>
                </span>
                <button
                  title={`编辑 ${item.label}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openLegendEditor(item);
                  }}
                >
                  <MoreOutlined />
                </button>
                <button
                  title={`显示 ${item.label}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIndicatorItemVisible(item, true);
                  }}
                >
                  <EyeInvisibleOutlined />
                </button>
                <button
                  title={`移除 ${item.label}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeIndicatorItem(item);
                  }}
                >
                  <CloseOutlined />
                </button>
              </div>
            </div>
          ))}
          {!legendCollapsed && hiddenLowerLegendItems.map(item => (
            <div className="kline-indicator-legend-block" key={`hidden-${item.key}`}>
              <div className="kline-indicator-legend-item muted">
                <span className="legend-name">{item.name}</span>
                {item.params && <span className="legend-params">{item.params}</span>}
                <span className="legend-values">
                  <b><small>面板</small>已隐藏</b>
                </span>
                <button
                  title={`编辑 ${item.name}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openLowerEditor(item);
                  }}
                >
                  <MoreOutlined />
                </button>
                <button
                  title={`显示 ${item.name}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setLowerIndicatorVisible(item, true);
                  }}
                >
                  <EyeInvisibleOutlined />
                </button>
                <button
                  title={`移除 ${item.name}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeLowerIndicator(item);
                  }}
                >
                  <CloseOutlined />
                </button>
              </div>
            </div>
          ))}
          {!legendCollapsed && patternLegendItems.map(item => (
            <div className={item.visible ? 'kline-pattern-legend-item' : 'kline-pattern-legend-item muted'} key={item.key}>
              <span>{item.name}</span>
              <strong>{item.count}</strong>
              <em>{item.groupName}</em>
              <button
                title={item.visible ? `隐藏 ${item.name}` : `显示 ${item.name}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  togglePatternLegendItemVisible(item);
                }}
              >
                {item.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              </button>
              <button
                title={`移除 ${item.name}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removePatternLegendItem(item);
                }}
              >
                <CloseOutlined />
              </button>
            </div>
          ))}
        </div>
      )}
      <div ref={volumePaneRef} className="kline-volume-pane" aria-hidden={!paneLayout.volumeVisible}>
        {Number.isFinite(sharedCrosshairX) && (
          <>
            <div
              className="kline-pane-crosshair-line"
              style={{ transform: `translateX(${sharedCrosshairX}px)` }}
            />
            {bottomTimeScalePane === 'volume' && sharedCrosshairTimeLabel && (
              <div
                className="kline-crosshair-time-label"
                style={{ left: `${sharedCrosshairX}px` }}
              >
                {sharedCrosshairTimeLabel}
              </div>
            )}
          </>
        )}
        {paneLayout.volumeVisible && (
          <div className="kline-lower-legend">
            <span className="kline-indicator-legend-item">
              <span className="legend-name">VOL</span>
              <span className="legend-values">
                <b style={{ color: '#8d9aa7' }}>
                  <small>成交量</small>
                  {volumeLegendValue}
                </b>
              </span>
            </span>
          </div>
        )}
      </div>
      {lowerIndicatorItems.map(indicatorItem => {
        const legendItem = lowerLegendItems.find(item => item.key === indicatorItem.key);
        const lowerLegendKey = legendItem?.key || indicatorItem.key;
        const lowerLegendIsCollapsed = Boolean(lowerLegendCollapsed[lowerLegendKey]);

        return (
        <div
          ref={element => {
            if (element) lowerPaneRefs.current[indicatorItem.key] = element;
          }}
          className="kline-lower-pane"
          key={indicatorItem.key}
        >
          {Number.isFinite(sharedCrosshairX) && (
            <>
              <div
                className="kline-pane-crosshair-line"
                style={{ transform: `translateX(${sharedCrosshairX}px)` }}
              />
              {bottomTimeScalePane === indicatorItem.key && sharedCrosshairTimeLabel && (
                <div
                  className="kline-crosshair-time-label"
                  style={{ left: `${sharedCrosshairX}px` }}
                >
                  {sharedCrosshairTimeLabel}
                </div>
              )}
            </>
          )}
          <div className="kline-lower-legend">
              <span
                className={lowerLegendIsCollapsed ? 'kline-indicator-legend-item lower-legend-item collapsed' : 'kline-indicator-legend-item lower-legend-item'}
                role={lowerLegendIsCollapsed ? 'button' : undefined}
                tabIndex={lowerLegendIsCollapsed ? 0 : undefined}
                title={lowerLegendIsCollapsed ? `展开 ${legendItem?.name}` : undefined}
                onClick={lowerLegendIsCollapsed ? (event) => {
                  event.stopPropagation();
                  toggleLowerLegendCollapsed(lowerLegendKey);
                } : undefined}
                onKeyDown={lowerLegendIsCollapsed ? (event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  toggleLowerLegendCollapsed(lowerLegendKey);
                } : undefined}
              >
                <span className="legend-name">{legendItem?.name}</span>
                {lowerLegendIsCollapsed && (
                  <button
                    title={`展开 ${legendItem?.name}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleLowerLegendCollapsed(lowerLegendKey);
                    }}
                  >
                    <DownOutlined />
                  </button>
                )}
                {!lowerLegendIsCollapsed && (
                  <>
                    {legendItem?.params && <span className="legend-params">{legendItem.params}</span>}
                    {legendItem?.values?.length > 0 && (
                      <span className="legend-values">
                        {legendItem.values.map(valueItem => (
                          <b key={valueItem.label} style={{ color: valueItem.color }}>
                            <small>{valueItem.label}</small>
                            {valueItem.value}
                          </b>
                        ))}
                      </span>
                    )}
                    <span className="lower-legend-actions">
                      <button
                        title={`编辑 ${legendItem?.name}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openLowerEditor(legendItem);
                        }}
                      >
                        <MoreOutlined />
                      </button>
                      <button
                        title={`隐藏 ${legendItem?.name}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setLowerIndicatorVisible(legendItem, false);
                        }}
                      >
                        <EyeOutlined />
                      </button>
                      <button
                        title={`移除 ${legendItem?.name}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeLowerIndicator(legendItem);
                        }}
                      >
                        <CloseOutlined />
                      </button>
                      <button
                        title={`收起 ${legendItem?.name}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleLowerLegendCollapsed(lowerLegendKey);
                        }}
                      >
                        <UpOutlined />
                      </button>
                    </span>
                  </>
                )}
              </span>
          </div>
        </div>
        );
      })}
      {(() => {
        const editingItem = overlayLegendItems.find(item => item.key === editingLegendKey);
        const editorRows = getOverlayIndicatorEditorRows(editingItem || {}, legendDraft);
        const baseKey = editingItem?.baseKey || editingItem?.key;
        const inputRows = editorRows.filter(editorRow => editorRow.periodEditable);

        return (
          <Modal
            centered
            className="terminal-feature-modal kline-indicator-settings-modal"
            footer={null}
            open={Boolean(editingItem)}
            title={editingItem ? `${editingItem.name} 设置` : '指标设置'}
            width={460}
            onCancel={closeLegendEditor}
          >
            {editingItem && (
              <div className="kline-indicator-modal-editor">
                <div className="feature-status-strip modal-context-strip">
                  <span>{editingItem.label}</span>
                  <span>指标范围：当前图表</span>
                </div>

                <div className="indicator-modal-settings-grid">
                  <label className="indicator-modal-setting-row">
                    <span>显示</span>
                    <input
                      checked={legendDraft?.visible ?? editingItem.visible}
                      type="checkbox"
                      onChange={(event) => setLegendDraft(draft => ({ ...draft, visible: event.target.checked }))}
                    />
                  </label>

                  {inputRows.map((editorRow, index) => (
                    <label className="indicator-modal-setting-row" key={`${editorRow.key}-input`}>
                      <span>{editorRow.label}</span>
                      <input
                        min="1"
                        type="number"
                        value={legendDraft?.periods?.[index] || editorRow.period || 1}
                        onChange={(event) => updateDraftPeriod(index, Number(event.target.value))}
                      />
                    </label>
                  ))}

                  {baseKey === 'boll' && (
                    <>
                      <label className="indicator-modal-setting-row">
                        <span>Period</span>
                        <input
                          min="1"
                          type="number"
                          value={legendDraft?.params?.period || 1}
                          onChange={(event) => updateDraftBollParam('period', Number(event.target.value))}
                        />
                      </label>
                      <label className="indicator-modal-setting-row">
                        <span>Std Dev</span>
                        <input
                          min="0.1"
                          step="0.1"
                          type="number"
                          value={legendDraft?.params?.stdDev || 0.1}
                          onChange={(event) => updateDraftBollParam('stdDev', Number(event.target.value))}
                        />
                      </label>
                    </>
                  )}

                  {editorRows.map((editorRow, index) => (
                    <label className="indicator-modal-setting-row" key={`${editorRow.key}-style`}>
                      <span>{editorRow.label} 颜色</span>
                      <input
                        aria-label={`${editorRow.label} 颜色`}
                        type="color"
                        value={legendDraft?.colors?.[index] || editingItem.colors?.[index] || editorRow.color}
                        onChange={(event) => updateDraftLineColor(index, event.target.value)}
                      />
                    </label>
                  ))}
                </div>

                <div className="indicator-modal-editor-actions">
                  <button type="button" onClick={closeLegendEditor}>取消</button>
                  <button type="button" onClick={() => confirmLegendEditor(editingItem)}>应用</button>
                </div>
              </div>
            )}
          </Modal>
        );
      })()}
      {(() => {
        const lowerEditingItem = [...lowerLegendItems, ...hiddenLowerLegendItems]
          .find(item => item.key === editingLowerKey);
        const lowerEditingBaseKey = lowerEditingItem?.baseKey || lowerEditingItem?.key;
        const lowerParamRows = lowerEditingBaseKey === 'macd'
          ? [
            ['fast', 'Fast Length'],
            ['slow', 'Slow Length'],
            ['signal', 'Signal Length']
          ]
          : lowerEditingBaseKey === 'kdj'
            ? [
              ['n', 'Length'],
              ['m1', 'K Smoothing'],
              ['m2', 'D Smoothing']
            ]
            : [];
        const lowerColorRows = lowerEditingItem?.values?.map((valueItem, index) => ({
          color: valueItem.color,
          index,
          label: valueItem.label
        })) || [];

        return (
          <Modal
            centered
            className="terminal-feature-modal kline-indicator-settings-modal"
            footer={null}
            open={Boolean(lowerEditingItem)}
            title={lowerEditingItem ? `${lowerEditingItem.name} 设置` : '指标设置'}
            width={460}
            onCancel={closeLowerEditor}
          >
            {lowerEditingItem && (
              <div className="kline-indicator-modal-editor">
                <div className="feature-status-strip modal-context-strip">
                  <span>{lowerEditingItem.name}</span>
                  <span>指标范围：副图面板</span>
                </div>

                <div className="indicator-modal-settings-grid">
                  <label className="indicator-modal-setting-row">
                    <span>显示</span>
                    <input
                      checked={lowerDraft?.visible ?? lowerEditingItem.visible}
                      type="checkbox"
                      onChange={(event) => setLowerDraft(draft => ({ ...draft, visible: event.target.checked }))}
                    />
                  </label>

                  {lowerEditingBaseKey === 'rsi' && (
                    <label className="indicator-modal-setting-row">
                      <span>Period</span>
                      <input
                        min="1"
                        type="number"
                        value={lowerDraft?.period || 1}
                        onChange={(event) => setLowerDraft(draft => ({ ...draft, period: Number(event.target.value) || 1 }))}
                      />
                    </label>
                  )}

                  {lowerParamRows.map(([paramName, label]) => (
                    <label className="indicator-modal-setting-row" key={paramName}>
                      <span>{label}</span>
                      <input
                        min="1"
                        type="number"
                        value={lowerDraft?.params?.[paramName] || 1}
                        onChange={(event) => updateLowerDraftParam(paramName, Number(event.target.value))}
                      />
                    </label>
                  ))}

                  {lowerColorRows.map(row => (
                    <label className="indicator-modal-setting-row" key={`${row.label}-color`}>
                      <span>{row.label} 颜色</span>
                      <input
                        aria-label={`${row.label} 颜色`}
                        type="color"
                        value={lowerDraft?.colors?.[row.index] || row.color}
                        onChange={(event) => updateLowerDraftColor(row.index, event.target.value)}
                      />
                    </label>
                  ))}
                </div>

                <div className="indicator-modal-editor-actions">
                  <button type="button" onClick={closeLowerEditor}>取消</button>
                  <button type="button" onClick={() => confirmLowerEditor(lowerEditingItem)}>应用</button>
                </div>
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
};

function calculateMA(data, period) {
  const result = [];
  if (!Array.isArray(data) || !Number.isFinite(period) || period <= 0 || data.length < period) {
    return result;
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;

    let sum = 0;
    for (let j = 0; j < period; j++) {
      const close = Number(data[i - j]?.close);
      if (!Number.isFinite(close)) {
        sum = null;
        break;
      }
      sum += close;
    }
    if (sum === null) continue;
    result.push({
      time: getChartTime(data[i]),
      value: parseFloat((sum / period).toFixed(2)),
    });
  }
  return result;
}

function calculateEMA(data, period) {
  const result = [];
  if (!Array.isArray(data) || !Number.isFinite(period) || period <= 0 || data.length < period) {
    return result;
  }

  const multiplier = 2 / (period + 1);

  let ema = 0;
  for (let i = 0; i < period; i++) {
    const close = Number(data[i]?.close);
    if (!Number.isFinite(close)) return result;
    ema += close;
  }
  ema = ema / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;

    if (i === period - 1) {
      result.push({
        time: getChartTime(data[i]),
        value: parseFloat(ema.toFixed(2)),
      });
    } else {
      const close = Number(data[i]?.close);
      if (!Number.isFinite(close)) continue;
      ema = (close - ema) * multiplier + ema;
      result.push({
        time: getChartTime(data[i]),
        value: parseFloat(ema.toFixed(2)),
      });
    }
  }
  return result;
}

function calculateBOLL(data, params = {}) {
  const period = Number(params.period || 20);
  const stdDev = Number(params.stdDev || 2);
  const upper = [];
  const middle = [];
  const lower = [];
  if (!Array.isArray(data) || !Number.isFinite(period) || period <= 0 || data.length < period || !Number.isFinite(stdDev)) {
    return { upper, middle, lower };
  }

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const closes = slice.map(item => Number(item?.close));
    if (closes.some(close => !Number.isFinite(close))) continue;
    const avg = closes.reduce((sum, close) => sum + close, 0) / period;
    const variance = slice.reduce((sum, item) => {
      const diff = Number(item.close) - avg;
      return sum + diff * diff;
    }, 0) / period;
    const deviation = Math.sqrt(variance) * stdDev;
    const time = getChartTime(data[i]);

    upper.push({ time, value: parseFloat((avg + deviation).toFixed(2)) });
    middle.push({ time, value: parseFloat(avg.toFixed(2)) });
    lower.push({ time, value: parseFloat((avg - deviation).toFixed(2)) });
  }

  return { upper, middle, lower };
}

function calculateVWAP(data) {
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;
  if (!Array.isArray(data)) return [];

  return data.map(item => {
    const volume = Number(item.volume || item.vol || 1);
    const high = Number(item.high);
    const low = Number(item.low);
    const close = Number(item.close);
    if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
      return { time: getChartTime(item) };
    }
    const typical = (high + low + close) / 3;
    cumulativeTypicalVolume += typical * volume;
    cumulativeVolume += volume;
    return {
      time: getChartTime(item),
      value: parseFloat((cumulativeTypicalVolume / cumulativeVolume).toFixed(2))
    };
  });
}

function calculateMACD(data, params = {}) {
  if (!Array.isArray(data)) return { macd: [], signal: [], histogram: [] };
  const fast = Number(params.fast || 12);
  const slow = Number(params.slow || 26);
  const signalPeriod = Number(params.signal || 9);
  if (![fast, slow, signalPeriod].every(value => Number.isFinite(value) && value > 0)) {
    const blank = data.map(item => ({ time: getChartTime(item) }));
    return { macd: blank, signal: blank, histogram: blank };
  }
  const fastEma = calculateEMA(data, fast);
  const slowEma = calculateEMA(data, slow);
  const slowByTime = new Map(slowEma.map(item => [item.time, item.value]));
  const macdRaw = fastEma
    .filter(item => slowByTime.has(item.time))
    .map(item => ({
      time: item.time,
      close: Number((item.value - slowByTime.get(item.time)).toFixed(4))
    }));
  const signal = calculateEMA(macdRaw, signalPeriod);
  const signalByTime = new Map(signal.map(item => [item.time, item.value]));
  const macdByTime = new Map(macdRaw.map(item => [item.time, Number(item.close.toFixed(4))]));
  const allTimes = data.map(item => getChartTime(item));
  const macd = allTimes.map(time => (
    macdByTime.has(time) ? { time, value: macdByTime.get(time) } : { time }
  ));
  const signalLine = allTimes.map(time => (
    signalByTime.has(time) ? { time, value: signalByTime.get(time) } : { time }
  ));
  const histogram = allTimes.map(time => {
    const macdValue = macdByTime.get(time);
    const signalValue = signalByTime.get(time);
    if (!Number.isFinite(macdValue) || !Number.isFinite(signalValue)) return { time };
    const value = Number((macdValue - signalValue).toFixed(4));
    return {
      time,
      value,
      color: value >= 0 ? '#26a69a' : '#ef5350'
    };
  });

  return { macd, signal: signalLine, histogram };
}

function calculateRSI(data, period = 14) {
  if (!Array.isArray(data)) return [];
  period = Number(period);
  const result = data.map(item => ({ time: getChartTime(item) }));
  if (!Number.isFinite(period) || period <= 0 || data.length <= period) return result;

  for (let i = period; i < data.length; i += 1) {
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const currentClose = Number(data[j]?.close);
      const previousClose = Number(data[j - 1]?.close);
      if (!Number.isFinite(currentClose) || !Number.isFinite(previousClose)) {
        gains = null;
        break;
      }
      const diff = currentClose - previousClose;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    if (gains === null) continue;
    const rs = losses === 0 ? 100 : gains / losses;
    const value = losses === 0 ? 100 : 100 - (100 / (1 + rs));
    result[i] = { time: getChartTime(data[i]), value: Number(value.toFixed(2)) };
  }
  return result;
}

function calculateKDJ(data, params = {}) {
  if (!Array.isArray(data)) return { k: [], d: [], j: [] };
  const period = Number(params.n || 9);
  const kSmooth = Number(params.m1 || 3);
  const dSmooth = Number(params.m2 || 3);
  const k = data.map(item => ({ time: getChartTime(item) }));
  const d = data.map(item => ({ time: getChartTime(item) }));
  const j = data.map(item => ({ time: getChartTime(item) }));
  if (![period, kSmooth, dSmooth].every(value => Number.isFinite(value) && value > 0) || data.length < period) {
    return { k, d, j };
  }
  let previousK = 50;
  let previousD = 50;

  for (let i = period - 1; i < data.length; i += 1) {
    const slice = data.slice(i - period + 1, i + 1);
    const lows = slice.map(item => Number(item?.low));
    const highs = slice.map(item => Number(item?.high));
    const close = Number(data[i]?.close);
    if ([...lows, ...highs, close].some(value => !Number.isFinite(value))) continue;
    const low = Math.min(...lows);
    const high = Math.max(...highs);
    const rsv = high === low ? 50 : ((close - low) / (high - low)) * 100;
    previousK = ((kSmooth - 1) * previousK + rsv) / kSmooth;
    previousD = ((dSmooth - 1) * previousD + previousK) / dSmooth;
    const currentJ = 3 * previousK - 2 * previousD;
    const time = getChartTime(data[i]);
    k[i] = { time, value: Number(previousK.toFixed(2)) };
    d[i] = { time, value: Number(previousD.toFixed(2)) };
    j[i] = { time, value: Number(currentJ.toFixed(2)) };
  }

  return { k, d, j };
}

function calculateOBV(data) {
  let obv = 0;
  if (!Array.isArray(data)) return [];
  return data.map((item, index) => {
    const volume = Number(item.volume || item.vol || 0);
    if (index > 0) {
      const close = Number(item?.close);
      const previousClose = Number(data[index - 1]?.close);
      if (Number.isFinite(close) && Number.isFinite(previousClose)) {
        if (close > previousClose) obv += volume;
        if (close < previousClose) obv -= volume;
      }
    }
    return { time: getChartTime(item), value: obv };
  });
}

export default KlineChart;
