import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, Empty, Input, Modal, Pagination, Spin, message } from 'antd';
import {
  AreaChartOutlined,
  BarChartOutlined,
  CaretDownOutlined,
  LineChartOutlined,
  SearchOutlined,
  StockOutlined
} from '@ant-design/icons';
import IndicatorPanel from './components/IndicatorPanel';
import KlineChart from './components/KlineChart';
import SearchPanel from './components/SearchPanel';
import TerminalTopBar from './components/TerminalTopBar';
import ToolRail from './components/ToolRail';
import RightInsightRail from './components/RightInsightRail';
import BottomSignalDock from './components/BottomSignalDock';
import { getFallbackMarketSymbols, loadLiveFutures, loadLiveMarketSymbols, searchLiveFutures, searchLiveStocks } from './data/liveMarketData';
import { getSymbolSearchPage } from './data/symbolSearchModel';
import {
  chartStyleOptions,
  getChartStyleOption,
  getTimeframeOption,
  timeframeOptions
} from './components/chartControlOptions';
import { getQuoteSnapshotForBar } from './components/chartQuoteFormat';
import { getChartTime, normalizeKlineRows } from './components/chartDataTransform';
import { hasActiveIndicators } from './components/indicatorLibrary';
import { getWorkspaceLayout, getWorkspacePaneCount } from './components/workspaceLayoutOptions';
import { reconcileWorkspacePaneSettings, syncAllPaneSymbols } from './components/workspacePaneSettings';
import { getPaneDataKey, getPaneKlineData, setPaneKlineData } from './components/workspacePaneData';
import { clearStoredPatternSelections, getStoredPatternSelections } from './components/patternSelection';
import { hasActivePatterns } from './components/patternMarkers';
import { getStrategyTradeMarkers } from './data/strategyTesterModel';
import { useChartStore } from './store/chartStore';
import { authAPI, futuresAPI, patternAPI, stockAPI } from './services/api';
import './App.css';

const dockFeatures = {
  'Market Scanner': 'Market Scanner',
  'Strategy Tester': 'Strategy Tester',
  'Alerts & Bots': 'Alerts & Bots',
  AI: "What's Happening Now",
  MTFA: 'Timing'
};

const dockTabToFeature = {
  'Market Scanner': 'Market Scanner',
  'Strategy Tester': 'Strategy Tester',
  'Alerts & Bots': 'Alerts & Bots',
  "What's Happening Now": 'AI',
  Timing: 'MTFA'
};

const getKlineBatchLimit = period => {
  return 160;
};

const getInitialKlineLimit = period => {
  return 200;
};

const getSymbolChangeKey = item => `${item.type || 'stock'}:${item.symbol}`;

const getLatestDailyChange = rows => {
  const latest = Array.isArray(rows)
    ? rows.reduce((current, row) => {
      if (!current) return row;
      return String(row?.time || '') > String(current?.time || '') ? row : current;
    }, null)
    : null;
  const amount = Number(latest?.change ?? latest?.changeAmount ?? latest?.change_abs);
  const percent = Number(latest?.pctChange ?? latest?.pct_change ?? latest?.pct_chg ?? latest?.changePercent);
  if (!Number.isFinite(amount) && !Number.isFinite(percent)) return null;
  return {
    amount,
    percent,
    tone: (Number.isFinite(amount) ? amount : percent) < 0 ? 'down' : 'up',
    loading: false
  };
};

const getFallbackDailyChange = item => {
  const percent = Number(item.changePercent ?? parseFloat(item.change));
  const last = Number(item.last);
  const amount = Number.isFinite(last) && Number.isFinite(percent)
    ? (last * percent) / 100
    : null;
  return {
    amount,
    percent: Number.isFinite(percent) ? percent : null,
    tone: (Number.isFinite(amount) ? amount : percent) < 0 ? 'down' : 'up',
    loading: false
  };
};

const formatSignedNumber = value => {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
};

const formatSignedPercent = value => {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const THEME_STORAGE_KEY = 'signalforge.themePreference.v1';
const getTimeBasedTheme = (timestamp = Date.now()) => {
  const hour = new Date(timestamp).getHours();
  return hour >= 7 && hour < 19 ? 'day' : 'night';
};
const resolveThemePreference = (preference, timestamp) => (preference === 'auto' ? getTimeBasedTheme(timestamp) : preference);

const featurePanelMeta = {
  Layout: { title: '布局', width: 720 },
  'Auto Fib': { title: '自动斐波那契', width: 740 },
  Trends: { title: '趋势线检测', width: 740 },
  Patterns: { title: '形态', width: 560 },
  'The Strat': { title: 'The Strat', width: 560 },
  Heatmap: { title: '市场热力图', width: 760 },
  Scripts: { title: '脚本管理', width: 760 },
  Compare: { title: '标的对比', width: 680 },
  'Chart Settings': { title: '图表设置', width: 680 },
  'More Chart Tools': { title: '更多图表工具', width: 680 }
};

const layoutPresets = [
  { name: '单图表', detail: '一个图表，搭配自选列表和底部面板。' },
  { name: '纵向 2 图表', detail: '并排对比标的或周期。' },
  { name: '4 图表网格', detail: '适合盘中多标的监控。' },
  { name: '扫描器 + 图表', detail: '将扫描结果固定在图表旁。' }
];

const fibLevels = ['0.236', '0.382', '0.500', '0.618', '0.786', '1.272'];
const heatmapRows = [
  { name: 'Liquor', value: '+2.4%', tone: 'hot' },
  { name: 'Copper', value: '+1.8%', tone: 'hot' },
  { name: 'Banks', value: '-0.3%', tone: 'cool' },
  { name: 'Gold', value: '+1.1%', tone: 'warm' }
];
const patternCategoryOptions = [
  { value: 'all', label: '全部形态' },
  { value: 'thestrat', label: 'TheStrat' },
  { value: 'candlestick', label: 'K线形态' },
  { value: 'chart', label: '图表形态' }
];
const patternCatalog = [
  { name: '1-2D Inside Break', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '1-2U Inside Break', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '1-2U-2D Inside Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '1-2D-2U Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '1-3-1-2D Volatility Expansion', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '1-3-1-2U Volatility Expansion', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2D-1-2D Measured Move Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2D-1-2U Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2U-1-2D Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2U-1-2U Measured Move Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2D-2D Continuation', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2U-2U Continuation', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2D-2U Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2U-2D Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2D-2U Hammer Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2U-2D Shooting Star Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2D-2D Shooting Star Momentum Continuation', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '2U-2U Hammer Momentum Continuation', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '3-2D Range Expansion Continuation', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '3-2U Range Expansion Continuation', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '3-2D-2U Broadening Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: '3-2U-2D Broadening Reversal', category: 'thestrat', status: 'Ready', type: 'TheStrat' },
  { name: 'Hammer', category: 'candlestick', status: 'Ready', type: 'Candlestick', backendType: 'hammer' },
  { name: 'Inverted Hammer', category: 'candlestick', status: 'Ready', type: 'Candlestick', backendType: 'inverted_hammer' },
  { name: 'Shooting Star', category: 'candlestick', status: 'Ready', type: 'Candlestick', backendType: 'shooting_star' },
  { name: 'Hanging Man', category: 'candlestick', status: 'Ready', type: 'Candlestick', backendType: 'hanging_man' },
  { name: 'Doji', category: 'candlestick', status: 'Ready', type: 'Candlestick', backendType: 'doji' },
  { name: 'Bullish Engulfing', category: 'candlestick', status: 'Ready', type: 'Candlestick', backendType: 'bullish_engulfing' },
  { name: 'Bearish Engulfing', category: 'candlestick', status: 'Ready', type: 'Candlestick', backendType: 'bearish_engulfing' },
  { name: 'Morning Star', category: 'candlestick', status: 'Ready', type: 'Candlestick', backendType: 'morning_star' },
  { name: 'Evening Star', category: 'candlestick', status: 'Ready', type: 'Candlestick', backendType: 'evening_star' },
  { name: 'Head and Shoulders Top', category: 'chart', status: 'Ready', type: 'Chart', backendType: 'head_and_shoulders_top' },
  { name: 'Head and Shoulders Bottom', category: 'chart', status: 'Ready', type: 'Chart', backendType: 'head_and_shoulders_bottom' },
  { name: 'Double Top', category: 'chart', status: 'Ready', type: 'Chart', backendType: 'double_top' },
  { name: 'Double Bottom', category: 'chart', status: 'Ready', type: 'Chart', backendType: 'double_bottom' },
  { name: 'Ascending Triangle', category: 'chart', status: 'Ready', type: 'Chart', backendType: 'ascending_triangle' },
  { name: 'Descending Triangle', category: 'chart', status: 'Ready', type: 'Chart', backendType: 'descending_triangle' },
  { name: 'Symmetrical Triangle', category: 'chart', status: 'Ready', type: 'Chart', backendType: 'symmetrical_triangle' },
  { name: 'Bull Flag', category: 'chart', status: 'Ready', type: 'Chart', backendType: 'bull_flag' },
  { name: 'Bear Flag', category: 'chart', status: 'Ready', type: 'Chart', backendType: 'bear_flag' }
];

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

const getCatalogItem = name => patternCatalog.find(item => item.name === name);

const getChartPatternTime = (pattern, data = []) => {
  const candidateIndex =
    pattern.rightShoulder?.index ??
    pattern.secondTop?.index ??
    pattern.secondBottom?.index ??
    pattern.flagEnd ??
    pattern.poleEnd ??
    pattern.highs?.at?.(-1)?.index ??
    pattern.lows?.at?.(-1)?.index ??
    pattern.support?.at?.(-1)?.index ??
    pattern.resistance?.at?.(-1)?.index;

  if (Number.isInteger(candidateIndex) && data[candidateIndex]) return data[candidateIndex].time;
  return data.at?.(-1)?.time;
};

const SYMBOL_SEARCH_PAGE_SIZE = 2;
const symbolTypeTabs = [
  { key: 'stock', label: '股票' },
  { key: 'futures', label: '期货' }
];

function FeaturePanel({ feature, currentSymbol, currentName, period, klineData = [], onClose }) {
  const [patternCategory, setPatternCategory] = useState('all');
  const [patternQuery, setPatternQuery] = useState('');
  const [patternScanState, setPatternScanState] = useState({ loading: false, result: null, error: null });
  const storedPatterns = useChartStore(state => state.patterns);
  const setPatterns = useChartStore(state => state.setPatterns);
  const [selectedPatterns, setSelectedPatterns] = useState(() => getStoredPatternSelections(storedPatterns));
  const activeContext = currentSymbol
    ? `${currentSymbol} ${currentName || ''} 路 ${period}`
    : `未加载标的 路 ${period}`;

  useEffect(() => {
    if (feature === 'Patterns') {
      setSelectedPatterns(getStoredPatternSelections(storedPatterns));
    }
    if (feature === 'The Strat') {
      setSelectedPatterns(getStoredPatternSelections(storedPatterns, 'thestrat'));
    }
  }, [feature, storedPatterns]);

  if (feature === 'Layout') {
    return (
      <div className="feature-modal-body layout-panel">
        <p>在当前终端内保存、拆分和恢复图表工作区。</p>
        <div className="layout-preset-grid">
          {layoutPresets.map(item => (
            <button key={item.name} type="button">
              <span>{item.name}</span>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>
        <div className="feature-status-strip">
          <span>当前：单图表</span>
          <span>{activeContext}</span>
          <span>自动保存：开启</span>
          <span>云同步：就绪</span>
        </div>
      </div>
    );
  }

  if (feature === 'Auto Fib') {
    return (
      <div className="feature-modal-body fib-panel">
        <p>自动识别摆动点，并在可见图表上投射回撤区域。</p>
        <div className="fib-preview">
          {fibLevels.map((level, index) => (
            <div className="fib-level" key={level} style={{ top: `${14 + index * 12}%` }}>
              <span>{level}</span>
            </div>
          ))}
        </div>
        <div className="feature-option-grid compact">
          {['最近主要摆动', '可见区间', '向右延伸水平位', '显示共振区域'].map(item => (
            <button key={item} type="button"><span>{item}</span><em>切换</em></button>
          ))}
        </div>
        <div className="feature-status-strip">
          <span>{activeContext}</span>
          <span>摆动来源：可见图表</span>
        </div>
      </div>
    );
  }

  if (feature === 'Trends') {
    const rows = ['价格趋势线', '水平价位', '成交量确认', '突破提醒'];

    return (
      <div className="feature-modal-body detection-panel">
        <p>自动查找支撑、阻力和突破线。</p>
        <div className="detection-table">
          {rows.map((row, index) => (
            <button key={row} type="button">
              <strong>{row}</strong>
              <span>{index % 2 === 0 ? '已启用' : '就绪'}</span>
              <em>{92 - index * 7}%</em>
            </button>
          ))}
        </div>
        <div className="feature-status-strip">
          <span>{activeContext}</span>
          <span>检测范围：可见区间</span>
        </div>
      </div>
    );
  }

  if (feature === 'Patterns') {
    const normalizedQuery = patternQuery.trim().toLowerCase();
    const visiblePatterns = patternCatalog.filter(item => (
      (patternCategory === 'all' || item.category === patternCategory)
      && (!normalizedQuery || item.name.toLowerCase().includes(normalizedQuery) || item.type.toLowerCase().includes(normalizedQuery))
    ));
    const activePattern = visiblePatterns.find(item => selectedPatterns.includes(item.name));
    const selectedItems = selectedPatterns.map(getCatalogItem).filter(Boolean);
    const selectedTheStratNames = selectedItems.filter(item => item.category === 'thestrat').map(item => item.name);
    const selectedCandleTypes = selectedItems.filter(item => item.category === 'candlestick').map(item => item.backendType);
    const selectedChartTypes = selectedItems.filter(item => item.category === 'chart').map(item => item.backendType);
    const hasChartData = Array.isArray(klineData) && klineData.length > 1;
    const togglePatternSelection = (name) => {
      setSelectedPatterns(current =>
        current.includes(name)
          ? current.filter(item => item !== name)
          : [...current, name]
      );
    };
    const applyPattern = async () => {
      if (selectedItems.length === 0) {
        setPatterns(clearStoredPatternSelections(storedPatterns));
        setPatternScanState({ loading: false, result: { count: 0 }, error: null });
        onClose?.();
        return;
      }
      if (!hasChartData) {
        setPatternScanState({ loading: false, result: null, error: '应用 TheStrat 形态前请先加载图表。' });
        return;
      }
      setPatternScanState({ loading: true, result: null, error: null });
      try {
        const response = await patternAPI.scanAll(klineData);
        if (!response.success) throw new Error(response.error || '形态扫描失败');
        const selectedTheStratMatches = response.data.theStratPatterns.patterns.filter(item => selectedTheStratNames.includes(item.pattern.name));
        const selectedCandleRows = response.data.candlePatterns.patterns
          .map(row => ({
            ...row,
            patterns: row.patterns.filter(pattern => selectedCandleTypes.includes(pattern.type))
          }))
          .filter(row => row.patterns.length > 0);
        const selectedChartMatches = response.data.chartPatterns.patterns
          .filter(pattern => selectedChartTypes.includes(pattern.type))
          .map(pattern => ({
            ...pattern,
            time: getChartPatternTime(pattern, klineData)
          }));
        const nextPatterns = {
          ...storedPatterns,
          candlePatterns: {
            count: selectedCandleRows.reduce((count, row) => count + row.patterns.length, 0),
            patterns: selectedCandleRows,
            selected: selectedItems.filter(item => item.category === 'candlestick').map(item => item.name)
          },
          chartPatterns: {
            count: selectedChartMatches.length,
            patterns: selectedChartMatches,
            selected: selectedItems.filter(item => item.category === 'chart').map(item => item.name)
          },
          theStratPatterns: {
            count: selectedTheStratMatches.length,
            patterns: selectedTheStratMatches,
            selected: selectedTheStratNames
          },
          showPatterns: true
        };
        setPatterns(nextPatterns);
        setPatternScanState({ loading: false, result: { count: nextPatterns.candlePatterns.count + nextPatterns.chartPatterns.count + nextPatterns.theStratPatterns.count }, error: null });
        onClose?.();
      } catch (error) {
        setPatternScanState({ loading: false, result: null, error: getApiErrorMessage(error, '形态扫描失败') });
      }
    };

    return (
      <div className="feature-modal-body pattern-selector-panel">
        <div className="pattern-selector-toolbar">
          <select value={patternCategory} onChange={event => setPatternCategory(event.target.value)}>
            {patternCategoryOptions.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <Input
            allowClear
            className="pattern-search-input"
            onChange={event => setPatternQuery(event.target.value)}
            placeholder="搜索形态"
            prefix={<SearchOutlined />}
            value={patternQuery}
          />
        </div>
        <div className="pattern-selector-list" role="listbox" aria-label="形态列表">
          {visiblePatterns.length > 0 ? (
            visiblePatterns.map(item => (
              <button
                className={selectedPatterns.includes(item.name) ? 'active' : ''}
                key={item.name}
                onClick={() => togglePatternSelection(item.name)}
                type="button"
              >
                <strong><i />{item.name}</strong>
                <span>{item.type}</span>
                <em>{selectedPatterns.includes(item.name) ? '已选择' : (item.status === 'Ready' ? '就绪' : item.status)}</em>
              </button>
            ))
          ) : (
            <div className="pattern-selector-empty">没有匹配的形态。</div>
          )}
        </div>
        <div className="pattern-selector-message">
          {!hasChartData ? <span className="error">应用形态前请先加载图表。</span> : null}
          {patternScanState.result ? <span>当前图表找到 {patternScanState.result.count} 个匹配。</span> : null}
          {patternScanState.error ? <span className="error">{patternScanState.error}</span> : null}
        </div>
        <div className="pattern-selector-footer">
          <span>
            {activePattern ? <strong>{activePattern.name}</strong> : null}
            <em>{selectedPatterns.length} 个已选择 路 {patternCategoryOptions.find(item => item.value === patternCategory)?.label} 路 {activeContext}</em>
          </span>
          <div>
            <button className="secondary" onClick={onClose} type="button">取消</button>
            <button disabled={patternScanState.loading || !hasChartData} onClick={applyPattern} type="button">
              {patternScanState.loading ? '应用中...' : '应用'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (feature === 'The Strat') {
    const hasChartData = Array.isArray(klineData) && klineData.length > 1;
    const theStratSelections = selectedPatterns.filter(name =>
      patternCatalog.find(item => item.name === name)?.category === 'thestrat'
    );
    const togglePatternSelection = (name) => {
      setSelectedPatterns(current =>
        current.includes(name)
          ? current.filter(item => item !== name)
          : [...current, name]
      );
    };
    const scanTheStrat = async () => {
      if (theStratSelections.length === 0) {
        setPatterns({
          ...storedPatterns,
          theStratPatterns: {
            count: 0,
            patterns: [],
            selected: [],
            hidden: []
          },
          showPatterns: true
        });
        setPatternScanState({ loading: false, result: { count: 0 }, error: null });
        onClose?.();
        return;
      }
      if (!hasChartData) {
        setPatternScanState({ loading: false, result: null, error: '应用 TheStrat 形态前请先加载图表。' });
        return;
      }
      setPatternScanState({ loading: true, result: null, error: null });
      try {
        const response = await patternAPI.scanTheStrat(klineData);
        if (!response.success) throw new Error(response.error || 'TheStrat 扫描失败');
        const selectedMatches = response.data.patterns.filter(item => theStratSelections.includes(item.pattern.name));
        const nextPatterns = {
          ...storedPatterns,
          theStratPatterns: {
            count: selectedMatches.length,
            patterns: selectedMatches,
            selected: theStratSelections
          },
          showPatterns: true
        };
        setPatterns(nextPatterns);
        setPatternScanState({ loading: false, result: nextPatterns.theStratPatterns, error: null });
        onClose?.();
      } catch (error) {
        setPatternScanState({ loading: false, result: null, error: getApiErrorMessage(error, 'TheStrat 扫描失败') });
      }
    };

    return (
      <div className="feature-modal-body pattern-selector-panel">
        <div className="pattern-selector-toolbar">
          <select defaultValue="thestrat">
            <option value="thestrat">TheStrat</option>
          </select>
          <Input allowClear className="pattern-search-input" placeholder="搜索 TheStrat 形态" prefix={<SearchOutlined />} />
        </div>
        <div className="pattern-selector-list" role="listbox" aria-label="TheStrat 形态列表">
          {patternCatalog.filter(item => item.category === 'thestrat').map(item => (
              <button
                className={selectedPatterns.includes(item.name) ? 'active' : ''}
                key={item.name}
                onClick={() => togglePatternSelection(item.name)}
                type="button"
              >
                <strong><i />{item.name}</strong>
                <span>{item.type}</span>
                <em>{selectedPatterns.includes(item.name) ? '已选择' : (item.status === 'Ready' ? '就绪' : item.status)}</em>
              </button>
            ))}
        </div>
        <div className="pattern-selector-message">
          {!hasChartData ? <span className="error">应用形态前请先加载图表。</span> : null}
          {patternScanState.result ? <span>当前图表找到 {patternScanState.result.count} 个匹配。</span> : null}
          {patternScanState.error ? <span className="error">{patternScanState.error}</span> : null}
        </div>
        <div className="pattern-selector-footer">
          <span>
            {theStratSelections[0] ? <strong>{theStratSelections[0]}</strong> : null}
            <em>{theStratSelections.length} 个已选择 路 TheStrat 路 {activeContext}</em>
          </span>
          <div>
            <button className="secondary" onClick={onClose} type="button">取消</button>
            <button disabled={patternScanState.loading || !hasChartData} onClick={scanTheStrat} type="button">
              {patternScanState.loading ? '应用中...' : '应用'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (feature === 'Heatmap') {
    return (
      <div className="feature-modal-body heatmap-panel">
        <p>在一个紧凑面板中对比板块、期货和自选列表表现。</p>
        <div className="heatmap-grid">
          {heatmapRows.map(item => (
            <button className={item.tone} key={item.name} type="button">
              <strong>{item.name}</strong>
              <span>{item.value}</span>
            </button>
          ))}
        </div>
        <div className="feature-status-strip">
          <span>{activeContext}</span>
          <span>范围：A股 + 期货</span>
        </div>
      </div>
    );
  }

  if (feature === 'Scripts') {
    return (
      <div className="feature-modal-body scripts-panel">
        <p>为指标、提醒、扫描器和策略构建自定义条件。</p>
        <div className="script-builder">
          <div><span>如果</span><strong>收盘价上穿 MA20</strong></div>
          <div><span>并且</span><strong>成交量 &gt; 1.5 倍均量</strong></div>
          <div><span>则</span><strong>加入扫描器并布防提醒</strong></div>
        </div>
        <div className="feature-status-strip">
          <span>{activeContext}</span>
          <span>已保存公式：12</span>
          <span>语法有效</span>
        </div>
      </div>
    );
  }

  const fallbackPanels = {
    Compare: {
      lead: '将另一个股票或期货合约叠加到当前图表上对比。',
      items: ['添加 A 股标的', '添加期货合约', '归一化表现', '显示相关性']
    },
    'Chart Settings': {
      lead: '控制图表显示、坐标轴、交易时段和画线行为。',
      items: ['交易时段', '价格轴', '水印', '画线默认值']
    },
    'More Chart Tools': {
      lead: '打开次级图表工具，不占用主工具栏空间。',
      items: ['数据窗口', '测量涨跌幅', '回放模式', '导出图片']
    }
  };

  const currentPanel = fallbackPanels[feature];
  if (!currentPanel) return null;

  return (
    <div className="feature-modal-body">
      <p>{currentPanel.lead}</p>
      <div className="feature-option-grid">
        {currentPanel.items.map(item => (
          <button key={item} type="button">
            <span>{item}</span>
            <em>配置</em>
          </button>
        ))}
      </div>
      <div className="feature-status-strip">
        <span>{activeContext}</span>
      </div>
    </div>
  );
}

function ChartWorkspace({
  currentSymbol,
  currentName,
  currentType,
  currentPeriod,
  adjust,
  klineData,
  activeDrawingTool,
  addDrawing,
  deleteDrawing,
  drawingsBySymbol,
  updateDrawing,
  paneDataCache,
  indicators,
  patterns,
  paneSettings,
  scaleMode,
  selectedDrawingId,
  selectDrawing,
  workspaceLayout,
  strategyMarkers,
  theme,
  onPaneSettingChange,
  onIndicatorSettings,
  onLoadOlderData
}) {
  const [lowerLegendCollapsed, setLowerLegendCollapsed] = useState({});
  const activeLayout = getWorkspaceLayout(workspaceLayout);
  const paneCount = getWorkspacePaneCount(workspaceLayout);
  const panes = reconcileWorkspacePaneSettings({
    previous: paneSettings,
    count: paneCount,
    defaults: { symbol: currentSymbol, name: currentName, type: currentType, period: 'daily', chartStyle: 'candles', showVolume: false }
  });
  const mainKlineData = Array.isArray(klineData) ? klineData : [];

  if (currentSymbol && mainKlineData.length > 0) {
    return (
      <div className={`chart-workspace ${activeLayout.className}`}>
        {panes.map((pane, index) => (
          <WorkspaceChartPane
            adjust={adjust}
            currentName={pane.name || currentName}
            currentSymbol={pane.symbol || currentSymbol}
            currentType={pane.type || currentType}
            data={(pane.symbol || currentSymbol) === currentSymbol && pane.period === currentPeriod
              ? mainKlineData
              : (getPaneKlineData(paneDataCache, {
                paneId: pane.id,
                symbol: pane.symbol || currentSymbol,
                period: pane.period,
                adjust: (pane.type || currentType) === 'stock' ? adjust : ''
              }) || [])}
            indicators={indicators}
            patterns={patterns}
            strategyMarkers={index === 0 ? strategyMarkers : []}
            activeDrawingTool={activeDrawingTool}
            addDrawing={addDrawing}
            deleteDrawing={deleteDrawing}
            drawingsBySymbol={drawingsBySymbol}
            updateDrawing={updateDrawing}
            index={index}
            key={`${activeLayout.value}-${pane.id}`}
            pane={pane}
            scaleMode={scaleMode}
            theme={theme}
            selectedDrawingId={selectedDrawingId}
            selectDrawing={selectDrawing}
            lowerLegendCollapsed={lowerLegendCollapsed}
            onLowerLegendCollapsedChange={setLowerLegendCollapsed}
            onChange={(patch) => onPaneSettingChange?.(pane.id, patch)}
            onIndicatorSettings={onIndicatorSettings}
            onLoadOlderData={(pane.symbol || currentSymbol) === currentSymbol && pane.period === currentPeriod
              ? onLoadOlderData
              : undefined}
            onSymbolChange={(item) => onPaneSettingChange?.(pane.id, {
              symbol: item.symbol,
              name: item.name,
              type: item.type
            })}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="empty-container">
      <div className="empty-chart-panel">
        <span>未加载标的</span>
        <strong>请选择股票或期货品种</strong>
        <p>可通过顶部搜索、右侧自选列表或下方扫描结果加载图表。</p>
      </div>
    </div>
  );
}

function WorkspaceChartPane({
  currentSymbol,
  currentName,
  currentType,
  data,
  indicators,
  patterns,
  index,
  pane,
  scaleMode,
  theme,
  strategyMarkers = [],
  activeDrawingTool,
  addDrawing,
  deleteDrawing,
  drawingsBySymbol,
  selectedDrawingId,
  selectDrawing,
  updateDrawing,
  lowerLegendCollapsed,
  onLowerLegendCollapsedChange,
  onChange,
  onIndicatorSettings,
  onLoadOlderData,
  onSymbolChange
}) {
  const [hoverBar, setHoverBar] = useState(null);
  const chartData = Array.isArray(data) ? data : [];
  useEffect(() => {
    setHoverBar(null);
  }, [data]);
  const quote = getQuoteSnapshotForBar(chartData, hoverBar);

  return (
    <div className="workspace-chart-pane">
            <div className="workspace-pane-header">
              <div className="workspace-pane-symbol">
                <SearchPanel onSelect={onSymbolChange} triggerClassName="pane-symbol-button">
                  <strong>{currentSymbol}</strong>
                  <span>{currentName}</span>
                </SearchPanel>
                <em>开 {quote.open}</em>
                <em>高 {quote.high}</em>
                <em>低 {quote.low}</em>
                <em className="workspace-quote-close">
                  收 {quote.close}
                  <span className={`workspace-quote-change ${quote.tone}`}>
                    {quote.change} / {quote.pctChange}
                  </span>
                </em>
              </div>
              <PaneControls
                pane={pane}
                onChange={onChange}
              />
            </div>
            {chartData.length > 0 ? (
              <KlineChart
                data={chartData}
                currentSymbol={currentSymbol}
                currentType={currentType}
                period={pane.period}
                indicators={indicators}
                patterns={patterns}
                strategyMarkers={strategyMarkers}
                chartStyle={pane.chartStyle}
                showVolume={pane.showVolume}
                scaleMode={scaleMode}
                theme={theme}
                activeDrawingTool={activeDrawingTool}
                addDrawing={addDrawing}
                deleteDrawing={deleteDrawing}
                drawingsBySymbol={drawingsBySymbol}
                selectedDrawingId={selectedDrawingId}
                selectDrawing={selectDrawing}
                updateDrawing={updateDrawing}
                lowerLegendCollapsed={lowerLegendCollapsed}
                onLowerLegendCollapsedChange={onLowerLegendCollapsedChange}
                onHoverBar={setHoverBar}
                onIndicatorSettings={onIndicatorSettings}
                onLoadOlderData={onLoadOlderData}
              />
            ) : (
              <div className="pane-loading-state">正在加载标的数据...</div>
            )}
          </div>
  );
}

function PaneSymbolSearch({ currentSymbol, currentName, currentType, onSelect }) {
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState(currentType === 'futures' ? 'futures' : 'stock');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [symbols, setSymbols] = useState(getFallbackMarketSymbols);
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [dailyChangeBySymbol, setDailyChangeBySymbol] = useState({});

  useEffect(() => {
    if (!open) setActiveType(currentType === 'futures' ? 'futures' : 'stock');
  }, [currentType, open]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setLoadingSymbols(true);

    const hasQuery = Boolean(query.trim());
    const loader = hasQuery
      ? (activeType === 'stock'
        ? searchLiveStocks(query.trim())
        : searchLiveFutures(query.trim()))
      : (activeType === 'futures' ? loadLiveFutures() : loadLiveMarketSymbols());

    loader
      .then(rows => {
        if (!cancelled) setSymbols(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingSymbols(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeType, open, query]);

  const pageModel = React.useMemo(() => getSymbolSearchPage({
    symbols,
    type: activeType,
    query,
    page,
    pageSize: SYMBOL_SEARCH_PAGE_SIZE
  }), [activeType, page, query, symbols]);

  useEffect(() => {
    if (pageModel.page !== page) setPage(pageModel.page);
  }, [page, pageModel.page]);

  useEffect(() => {
    if (!open || !pageModel.items.length) return undefined;

    let cancelled = false;
    const missingItems = pageModel.items.filter(item => !dailyChangeBySymbol[getSymbolChangeKey(item)]);
    if (!missingItems.length) return undefined;

    setDailyChangeBySymbol(current => {
      const next = { ...current };
      missingItems.forEach(item => {
        next[getSymbolChangeKey(item)] = { ...getFallbackDailyChange(item), loading: true };
      });
      return next;
    });

    Promise.all(missingItems.map(async item => {
      const key = getSymbolChangeKey(item);
      try {
        const response = item.type === 'futures'
          ? await futuresAPI.getKline(item.symbol, 'daily', { limit: 1 })
          : await stockAPI.getKline(item.symbol, 'daily', 'qfq', { limit: 1 });
        return [key, getLatestDailyChange(response?.data) || getFallbackDailyChange(item)];
      } catch {
        return [key, getFallbackDailyChange(item)];
      }
    })).then(entries => {
      if (cancelled) return;
      setDailyChangeBySymbol(current => ({
        ...current,
        ...Object.fromEntries(entries)
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [open, pageModel.items]);

  const handleTypeChange = (type) => {
    setActiveType(type);
    setQuery('');
    setPage(1);
  };

  const handleSelect = (item) => {
    onSelect?.(item);
    setOpen(false);
  };

  const getDailyChangeDisplay = item => {
    const change = dailyChangeBySymbol[getSymbolChangeKey(item)] || getFallbackDailyChange(item);
    return {
      ...change,
      amountText: change.loading ? '—' : formatSignedNumber(change.amount),
      percentText: change.loading ? '—' : formatSignedPercent(change.percent)
    };
  };

  return (
    <>
      <button
        className="pane-symbol-button"
        onClick={() => {
          setQuery('');
          setPage(1);
          setOpen(true);
        }}
        type="button"
      >
        <strong>{currentSymbol}</strong>
        <span>{currentName}</span>
      </button>
      <Modal
        className="symbol-search-modal"
        centered
        footer={null}
        open={open}
        title="选择标的"
        width={680}
        onCancel={() => setOpen(false)}
      >
        <div className="symbol-search-shell">
          <div className="symbol-search-tabs" role="tablist" aria-label="分窗标的类型">
            {symbolTypeTabs.map(tab => (
              <button
                aria-selected={activeType === tab.key}
                className={activeType === tab.key ? 'active' : ''}
                key={tab.key}
                onClick={() => handleTypeChange(tab.key)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Input
            autoFocus
            allowClear
            className="symbol-search-input"
            placeholder="按代码或名称搜索标的"
            prefix={<SearchOutlined />}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />

          <div className="symbol-search-list" role="listbox">
            {pageModel.items.length > 0 ? (
              pageModel.items.map(item => (
                <button
                  className={item.symbol === currentSymbol ? 'symbol-result-row active' : 'symbol-result-row'}
                  key={item.symbol}
                  onClick={() => handleSelect(item)}
                  type="button"
                >
                  <span className="symbol-result-main">
                    <strong>{item.symbol}</strong>
                    <span>{item.name}</span>
                  </span>
                  <span className="symbol-result-setup">{item.setup}</span>
                  <span className={getDailyChangeDisplay(item).tone === 'down' ? 'symbol-result-change down' : 'symbol-result-change'}>
                    <strong>{getDailyChangeDisplay(item).amountText}</strong>
                    <small>{getDailyChangeDisplay(item).percentText}</small>
                  </span>
                </button>
              ))
            ) : (
              <Empty description="没有匹配的标的" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>

          <div className="symbol-search-footer">
            <span>{activeType === 'futures' ? '期货' : '股票'}列表 · {pageModel.total} 条结果</span>
            <Pagination
              current={pageModel.page}
              pageSize={SYMBOL_SEARCH_PAGE_SIZE}
              showSizeChanger={false}
              size="small"
              total={pageModel.total}
              onChange={setPage}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

function PaneControls({ pane, onChange }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const activeTimeframe = getTimeframeOption(pane.period);
  const activeChartStyle = getChartStyleOption(pane.chartStyle);
  const chartStyleIcon = {
    candles: <StockOutlined />,
    line: <LineChartOutlined />,
    area: <AreaChartOutlined />
  }[activeChartStyle.value];

  const timeframeItems = timeframeOptions.map(item => ({
    key: item.value,
    label: item.label,
    className: pane.period === item.value ? 'active-chart-menu-item' : ''
  }));
  const chartStyleItems = chartStyleOptions.map(item => ({
    key: item.value,
    label: item.label,
    icon: item.value === 'candles'
      ? <StockOutlined />
      : item.value === 'line'
        ? <LineChartOutlined />
        : <AreaChartOutlined />,
    className: pane.chartStyle === item.value ? 'active-chart-menu-item' : ''
  }));

  return (
    <div className="workspace-pane-controls">
      <Dropdown
        destroyOnHidden
        menu={{
          items: timeframeItems,
          onClick: ({ key }) => {
            onChange({ period: key });
            setOpenDropdown(null);
          }
        }}
        open={openDropdown === 'period'}
        overlayClassName="chart-control-dropdown period-dropdown pane-control-dropdown"
        placement="bottomRight"
        trigger={['click']}
        onOpenChange={(open) => setOpenDropdown(open ? 'period' : null)}
      >
        <button className="pane-folded-control period-control" type="button">
          <span>{activeTimeframe.label}</span>
          <CaretDownOutlined />
        </button>
      </Dropdown>

      <Dropdown
        destroyOnHidden
        menu={{
          items: chartStyleItems,
          onClick: ({ key }) => {
            onChange({ chartStyle: key });
            setOpenDropdown(null);
          }
        }}
        open={openDropdown === 'style'}
        overlayClassName="chart-control-dropdown style-dropdown pane-control-dropdown"
        placement="bottomRight"
        trigger={['click']}
        onOpenChange={(open) => setOpenDropdown(open ? 'style' : null)}
      >
        <button className="pane-folded-control style-control" type="button">
          {chartStyleIcon}
          <span>{activeChartStyle.label}</span>
          <CaretDownOutlined />
        </button>
      </Dropdown>

      <button
        className={pane.showVolume ? 'pane-icon-control active' : 'pane-icon-control'}
        title="成交量"
        type="button"
        onClick={() => onChange({ showVolume: !pane.showVolume })}
      >
        <BarChartOutlined />
      </button>
    </div>
  );
}

function AppShell({ onLogout }) {
  const [currentUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(window.sessionStorage.getItem('signalforge.user.v1') || 'null');
    } catch {
      return null;
    }
  });
  const [activeDockTab, setActiveDockTab] = useState('Market Scanner');
  const [themePreference, setThemePreference] = useState(() => {
    if (typeof window === 'undefined') return 'night';
    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'night';
  });
  const [themeClock, setThemeClock] = useState(() => Date.now());
  const [activeFeaturePanel, setActiveFeaturePanel] = useState(null);
  const [activeFeature, setActiveFeature] = useState('Market Scanner');
  const [activeIndicatorKey, setActiveIndicatorKey] = useState(null);
  const [workspaceLayout, setWorkspaceLayout] = useState('single');
  const [strategyTesterRunState, setStrategyTesterRunState] = useState('idle');
  const [strategyTesterRunResult, setStrategyTesterRunResult] = useState(null);
  const [paneDataCache, setPaneDataCache] = useState({});
  const paneDataCacheRef = useRef({});
  const paneDataRequestKeysRef = useRef(new Set());
  const klineRequestSeqRef = useRef(0);
  const olderKlineLoadingRef = useRef(false);
  const olderKlineExhaustedRef = useRef(false);
  const [paneSettings, setPaneSettings] = useState(() => reconcileWorkspacePaneSettings({
    previous: [],
    count: 1,
    defaults: { period: 'daily', chartStyle: 'candles', showVolume: false }
  }));
  const {
    currentSymbol,
    currentName,
    currentType,
    period,
    adjust,
    klineData,
    indicators,
    patterns,
    showIndicators,
    chartStyle,
    showVolume,
    scaleMode,
    loading,
    activeDrawingTool,
    selectedDrawingId,
    drawingsBySymbol,
    setActiveDrawingTool,
    selectDrawing,
    addDrawing,
    deleteDrawing,
    updateDrawing,
    clearDrawingsForSymbol,
    setKlineData,
    setLoading,
    setError,
    setPeriod,
    toggleIndicatorsVisible,
    toggleShowPatterns
  } = useChartStore();
  const indicatorsActive = hasActiveIndicators(indicators);
  const patternsActive = hasActivePatterns(patterns);
  const visibleIndicators = showIndicators ? indicators : {};
  const resolvedTheme = useMemo(() => resolveThemePreference(themePreference, themeClock), [themeClock, themePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    if (themePreference !== 'auto') return undefined;

    const timer = window.setInterval(() => setThemeClock(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, [themePreference]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.toggle('theme-day', resolvedTheme === 'day');
    document.body.classList.toggle('theme-night', resolvedTheme === 'night');
    return () => {
      document.body.classList.remove('theme-day', 'theme-night');
    };
  }, [resolvedTheme]);

  useEffect(() => {
    setPaneSettings(previous => reconcileWorkspacePaneSettings({
      previous,
      count: getWorkspacePaneCount(workspaceLayout),
      defaults: { symbol: currentSymbol, name: currentName, type: currentType, period, chartStyle, showVolume }
    }));
  }, [chartStyle, currentName, currentSymbol, currentType, period, showVolume, workspaceLayout]);

  useEffect(() => {
    if (!currentSymbol) return;

    setPaneSettings(previous => syncAllPaneSymbols(previous, {
      symbol: currentSymbol,
      name: currentName,
      type: currentType
    }));
  }, [currentName, currentSymbol, currentType]);

  useEffect(() => {
    if (!currentSymbol) return undefined;

    let cancelled = false;
    const activePaneSettings = reconcileWorkspacePaneSettings({
      previous: paneSettings,
      count: getWorkspacePaneCount(workspaceLayout),
      defaults: { symbol: currentSymbol, name: currentName, type: currentType, period, chartStyle, showVolume }
    });

    activePaneSettings.forEach((pane) => {
      const paneSymbol = pane.symbol || currentSymbol;
      const paneType = pane.type || currentType;
      const paneAdjust = paneType === 'stock' ? adjust : '';
      const usesMainKlineData = paneSymbol === currentSymbol
        && paneType === currentType
        && pane.period === period
        && paneAdjust === (currentType === 'stock' ? adjust : '');
      const keyParams = {
        paneId: pane.id,
        symbol: paneSymbol,
        period: pane.period,
        adjust: paneAdjust
      };
      const paneDataKey = getPaneDataKey(keyParams);

      if (usesMainKlineData) return;
      if (!paneSymbol || getPaneKlineData(paneDataCacheRef.current, keyParams)) return;
      if (paneDataRequestKeysRef.current.has(paneDataKey)) return;

      const paneApi = paneType === 'stock' ? stockAPI : futuresAPI;
      paneDataRequestKeysRef.current.add(paneDataKey);
      paneApi.getKline(
        paneSymbol,
        pane.period,
        paneType === 'stock' ? adjust : { limit: getInitialKlineLimit(pane.period) },
        paneType === 'stock' ? { limit: getInitialKlineLimit(pane.period) } : undefined
      ).then(response => {
        if (cancelled || !response.success) return;
        setPaneDataCache(previous => {
          const nextCache = setPaneKlineData(previous, {
            ...keyParams,
            data: normalizeKlineRows(response.data)
          });
          paneDataCacheRef.current = nextCache;
          return nextCache;
        });
      }).catch(error => {
        console.error('Pane K-line data request failed:', error);
      }).finally(() => {
        paneDataRequestKeysRef.current.delete(paneDataKey);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    adjust,
    chartStyle,
    currentName,
    currentSymbol,
    currentType,
    paneSettings,
    period,
    showVolume,
    workspaceLayout
  ]);

  useEffect(() => {
    paneDataCacheRef.current = paneDataCache;
  }, [paneDataCache]);

  useEffect(() => {
    if (!currentSymbol) return;

    const requestSeq = klineRequestSeqRef.current + 1;
    klineRequestSeqRef.current = requestSeq;
    olderKlineExhaustedRef.current = false;
    olderKlineLoadingRef.current = false;

    const loadKlineData = async () => {
      setLoading(true);
      setKlineData([]);
      try {
        const api = currentType === 'stock' ? stockAPI : futuresAPI;
        const response = await api.getKline(
          currentSymbol,
          period,
          currentType === 'stock'
            ? adjust
            : { limit: getInitialKlineLimit(period) },
          currentType === 'stock' ? { limit: getInitialKlineLimit(period) } : undefined
        );

        if (klineRequestSeqRef.current !== requestSeq) return;

        if (response.success) {
          setKlineData(normalizeKlineRows(response.data));
        } else {
          message.error('行情数据加载失败，请稍后重试');
        }
      } catch (error) {
        if (klineRequestSeqRef.current !== requestSeq) return;
        console.error('K-line data request failed:', error);
        message.error('行情数据请求失败，请检查服务连接。');
        setError(error.message);
      } finally {
        if (klineRequestSeqRef.current === requestSeq) {
          setLoading(false);
        }
      }
    };

    loadKlineData();
  }, [currentSymbol, period, adjust, currentType, setError, setKlineData, setLoading]);

  const handleLoadOlderKlineData = async () => {
    if (!currentSymbol || !klineData.length) return;
    if (olderKlineLoadingRef.current || olderKlineExhaustedRef.current) return;

    olderKlineLoadingRef.current = true;
    const requestSeq = klineRequestSeqRef.current;
    const before = klineData[0]?.time;

    try {
      const response = currentType === 'stock'
        ? await stockAPI.getKline(currentSymbol, period, adjust, {
          limit: getKlineBatchLimit(period),
          before
        })
        : await futuresAPI.getKline(currentSymbol, period, {
          limit: getKlineBatchLimit(period),
          before
        });
      if (klineRequestSeqRef.current !== requestSeq || !response.success) return;

      const olderRows = Array.isArray(response.data) ? response.data : [];
      if (olderRows.length === 0) {
        olderKlineExhaustedRef.current = true;
        return;
      }

      setKlineData(previous => {
        const previousRows = Array.isArray(previous) ? previous : [];
        const existingTimes = new Set();
        previousRows.forEach(row => {
          try {
            existingTimes.add(getChartTime(row));
          } catch {
            // Ignore rows the charting library cannot render.
          }
        });
        const uniqueOlderRows = olderRows.filter(row => {
          try {
            return !existingTimes.has(getChartTime(row));
          } catch {
            return false;
          }
        });
        if (!uniqueOlderRows.length) {
          olderKlineExhaustedRef.current = true;
          return previousRows;
        }
        return normalizeKlineRows([...uniqueOlderRows, ...previousRows]);
      });
    } catch (error) {
      console.error('Older K-line data request failed:', error);
    } finally {
      olderKlineLoadingRef.current = false;
    }
  };

  const handleFeatureSelect = (feature) => {
    setActiveFeature(feature);

    if (feature === 'Crosshair') {
      setActiveFeaturePanel(null);
      return;
    }

    if (feature === 'Indicators') {
      if (indicatorsActive) toggleIndicatorsVisible();
      setActiveFeaturePanel(null);
      return;
    }

    if (dockFeatures[feature]) {
      setActiveDockTab(dockFeatures[feature]);
      return;
    }

    setActiveFeaturePanel(feature);
  };

  const handlePatternToggle = () => {
    if (patternsActive) toggleShowPatterns();
  };

  const handlePatternMenuOpen = () => {
    setActiveFeature('Patterns');
    setActiveFeaturePanel('Patterns');
  };

  const handleIndicatorMenuOpen = () => {
    setActiveFeature('Indicators');
    setActiveIndicatorKey(null);
    setActiveFeaturePanel('Indicators');
  };

  const handleIndicatorSettingsOpen = (indicatorKey) => {
    setActiveFeature('Indicators');
    setActiveIndicatorKey(indicatorKey);
    setActiveFeaturePanel('Indicators');
  };

  const handleDockTabChange = (tab) => {
    setActiveDockTab(tab);
    setActiveFeature(dockTabToFeature[tab] || tab);
  };

  const closeFeaturePanel = () => setActiveFeaturePanel(null);
  const modalMeta = featurePanelMeta[activeFeaturePanel] || {};
  const handlePaneSettingChange = (paneId, patch) => {
    if (paneId === 'pane-1' && patch.period && getWorkspacePaneCount(workspaceLayout) === 1) {
      setPeriod(patch.period);
    }

    setPaneSettings(previous => previous.map(pane =>
      pane.id === paneId ? { ...pane, ...patch } : pane
    ));
  };

  return (
    <div className={`terminal-app theme-${resolvedTheme}`}>
      <TerminalTopBar
        currentSymbol={currentSymbol}
        currentName={currentName}
        currentType={currentType}
        period={period}
        workspaceLayout={workspaceLayout}
        activeFeature={activeFeature}
        indicatorsActive={indicatorsActive && showIndicators}
        patternsActive={patternsActive && patterns.showPatterns !== false}
        onLayoutChange={setWorkspaceLayout}
        onIndicatorMenuOpen={handleIndicatorMenuOpen}
        onIndicatorToggle={() => {
          if (indicatorsActive) toggleIndicatorsVisible();
        }}
        onPatternMenuOpen={handlePatternMenuOpen}
        onPatternToggle={handlePatternToggle}
        onFeatureSelect={handleFeatureSelect}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        onThemePreferenceChange={setThemePreference}
        onLogout={onLogout}
        currentUser={currentUser}
      />

      <div className="terminal-body">
        <ToolRail
          activeDrawingTool={activeDrawingTool}
          drawingsDisabled={!currentSymbol}
          selectedDrawingId={selectedDrawingId}
          onClearDrawings={() => clearDrawingsForSymbol({ symbol: currentSymbol, symbolType: currentType })}
          onDeleteDrawing={() => {
            if (selectedDrawingId) deleteDrawing(selectedDrawingId);
          }}
          onDrawingToolSelect={setActiveDrawingTool}
        />

        <main className="terminal-main">
          <section className="terminal-chart-area">
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
              </div>
            ) : currentSymbol && klineData.length > 0 ? (
              <ChartWorkspace
                currentSymbol={currentSymbol}
                currentName={currentName}
                currentType={currentType}
                currentPeriod={period}
                adjust={currentType === 'stock' ? adjust : ''}
                klineData={klineData}
                activeDrawingTool={activeDrawingTool}
                addDrawing={addDrawing}
                deleteDrawing={deleteDrawing}
                drawingsBySymbol={drawingsBySymbol}
                updateDrawing={updateDrawing}
                paneDataCache={paneDataCache}
                indicators={visibleIndicators}
                patterns={patterns}
                paneSettings={paneSettings}
                scaleMode={scaleMode}
                selectedDrawingId={selectedDrawingId}
                selectDrawing={selectDrawing}
                workspaceLayout={workspaceLayout}
                strategyMarkers={activeDockTab === 'Strategy Tester' && strategyTesterRunState === 'done' ? getStrategyTradeMarkers(strategyTesterRunResult) : []}
                theme={resolvedTheme}
                onPaneSettingChange={handlePaneSettingChange}
                onIndicatorSettings={handleIndicatorSettingsOpen}
                onLoadOlderData={handleLoadOlderKlineData}
              />
            ) : (
              <div className="empty-container">
                <div className="empty-chart-panel">
                  <span>未加载标的</span>
                  <strong>请选择股票或期货品种</strong>
                  <p>可通过顶部搜索、右侧自选列表或下方扫描结果加载图表。</p>
                </div>
              </div>
            )}
          </section>

          <BottomSignalDock
            activeTab={activeDockTab}
            onTabChange={handleDockTabChange}
            onStrategyRunStateChange={(state, result) => {
              setStrategyTesterRunState(state);
              setStrategyTesterRunResult(result);
            }}
          />
        </main>

        <RightInsightRail />
      </div>

      <Modal
        title={activeFeaturePanel === 'Indicators' ? '指标' : modalMeta.title}
        open={Boolean(activeFeaturePanel)}
        onCancel={closeFeaturePanel}
        footer={null}
        width={activeFeaturePanel === 'Indicators' ? 860 : (modalMeta.width || 680)}
        centered
        className={
          activeFeaturePanel === 'Patterns' || activeFeaturePanel === 'The Strat'
            ? 'terminal-feature-modal pattern-selector-modal'
            : 'terminal-feature-modal'
        }
        destroyOnHidden
      >
        {activeFeaturePanel === 'Indicators' ? (
          <>
            <div className="feature-status-strip modal-context-strip">
              <span>{currentSymbol ? `${currentSymbol} ${currentName || ''} 路 ${period}` : `未加载标的 路 ${period}`}</span>
              <span>指标范围：当前图表</span>
            </div>
            <IndicatorPanel
              initialIndicatorKey={activeIndicatorKey}
              onCancel={closeFeaturePanel}
              onConfirm={closeFeaturePanel}
            />
          </>
        ) : (
          <FeaturePanel
            feature={activeFeaturePanel}
            currentSymbol={currentSymbol}
            currentName={currentName}
            period={period}
            klineData={klineData}
            onClose={closeFeaturePanel}
          />
        )}
      </Modal>
    </div>
  );
}

function BrandSpark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L14.8 9H9.2L12 2Z" />
      <path d="M12 22L9.2 15H14.8L12 22Z" />
      <path d="M2 12L9 9.2V14.8L2 12Z" />
      <path d="M22 12L15 14.8V9.2L22 12Z" />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17.9 17.9A10.2 10.2 0 0 1 12 20C5 20 1 12 1 12a18 18 0 0 1 5-5.9" />
        <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c7 0 11 8 11 8a18.4 18.4 0 0 1-2.2 3.2" />
        <path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" />
        <path d="M1 1l22 22" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LoginCharacterScene({ mood, cursor }) {
  const faceX = Math.max(-14, Math.min(14, (cursor.x - 50) / 2.5));
  const faceY = Math.max(-9, Math.min(9, (cursor.y - 50) / 4));
  const skew = Math.max(-6, Math.min(6, (50 - cursor.x) / 10));

  return (
    <div
      className={`login-character-scene login-character-scene-${mood}`}
      style={{
        '--face-x': `${faceX}px`,
        '--face-y': `${faceY}px`,
        '--body-skew': `${skew}deg`
      }}
      aria-hidden="true"
    >
      <div className="login-character login-character-purple">
        <div className="login-eyes login-eyes-white login-purple-eyes">
          <span><i /></span>
          <span><i /></span>
        </div>
      </div>
      <div className="login-character login-character-black">
        <div className="login-eyes login-eyes-white login-black-eyes">
          <span><i /></span>
          <span><i /></span>
        </div>
      </div>
      <div className="login-character login-character-orange">
        <div className="login-eyes login-eyes-dot login-orange-eyes">
          <span />
          <span />
        </div>
        <div className="login-orange-mouth" />
      </div>
      <div className="login-character login-character-yellow">
        <div className="login-eyes login-eyes-dot login-yellow-eyes">
          <span />
          <span />
        </div>
        <div className="login-yellow-mouth" />
      </div>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cursor, setCursor] = useState({ x: 50, y: 42 });

  const mood = error
    ? 'error'
    : focusedField === 'password' && !showPassword
      ? 'away'
      : showPassword && password
        ? 'peek'
        : focusedField === 'username'
          ? 'typing'
          : 'idle';

  const handleSubmit = async event => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    setError('');

    if (!trimmedUsername) {
      setError('请输入用户名。');
      return;
    }

    if (!password) {
      setError('请输入密码。');
      return;
    }

    try {
      setSubmitting(true);
      const response = await authAPI.login({ username: trimmedUsername, password });
      if (!response.success) {
        setError(response.error || '用户名或密码错误。');
        return;
      }

      if (remember) {
        window.localStorage.setItem('signalforge.loginRemembered.v1', 'true');
      }
      onLogin(response.data?.user);
    } catch (error) {
      setError(error?.response?.data?.error || error?.message || '登录失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  const updateCursor = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    });
  };

  return (
    <main className="login-page" onMouseMove={updateCursor}>
      <section className="login-art-panel" aria-label="EagleTrace 登录插画">
        <div className="login-brand">
          <BrandSpark />
          <span>EagleTrace</span>
        </div>

        <div className="login-characters-wrap">
          <LoginCharacterScene mood={mood} cursor={cursor} />
        </div>

        <nav className="login-footer-links" aria-label="相关链接">
          <a href="#">隐私政策</a>
          <a href="#">服务条款</a>
          <a href="#">联系我们</a>
        </nav>
      </section>

      <section className="login-form-panel">
        <div className="login-form-container">
          <div className="login-spark">
            <BrandSpark />
          </div>

          <header className="login-form-header">
            <h1>欢迎回来！</h1>
            <p>请输入您的登录信息</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className={`login-field ${error && !username.trim() ? 'login-field-error' : ''}`}>
              <span>用户名</span>
              <input
                type="text"
                value={username}
                placeholder="请输入用户名"
                autoComplete="username"
                onChange={event => setUsername(event.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
              />
            </label>

            <label className={`login-field ${error && !password ? 'login-field-error' : ''}`}>
              <span>密码</span>
              <div className="login-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  onChange={event => setPassword(event.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPassword(value => !value)}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={event => setRemember(event.target.checked)}
                />
                <span>记住登录状态</span>
              </label>
              <a href="#">忘记密码？</a>
            </div>

            {error ? <div className="login-error" role="alert">{error}</div> : null}

            <button className="login-submit" type="submit" disabled={submitting}>
              <span className="login-btn-text">{submitting ? '登录中...' : '登录'}</span>
              <span className="login-btn-hover">
                登录
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </button>
          </form>

          <p className="login-signup">还没有账号？<a href="#">注册</a></p>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('signalforge.authenticated.v1') === 'true';
  });

  const handleLogin = user => {
    window.sessionStorage.setItem('signalforge.authenticated.v1', 'true');
    if (user) {
      window.sessionStorage.setItem('signalforge.user.v1', JSON.stringify(user));
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem('signalforge.authenticated.v1');
    window.sessionStorage.removeItem('signalforge.user.v1');
    setIsAuthenticated(false);
  };

  return isAuthenticated ? <AppShell onLogout={handleLogout} /> : <LoginPage onLogin={handleLogin} />;
}

export default App;
