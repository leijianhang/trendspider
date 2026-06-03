import React, { useEffect, useMemo, useState } from 'react';
import { Empty, Input, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getFallbackMarketSymbols, loadLiveFutures, loadLiveMarketSymbols, searchLiveFutures, searchLiveStocks } from '../data/liveMarketData';
import { getSymbolSearchPage } from '../data/symbolSearchModel';
import { futuresAPI, stockAPI } from '../services/api';
import { useChartStore } from '../store/chartStore';
import './SearchPanel.css';

const STOCK_RESULT_LIMIT = 10;
const FUTURES_RESULT_LIMIT = 12;

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
  return { amount, percent, tone: (Number.isFinite(amount) ? amount : percent) < 0 ? 'down' : 'up', loading: false };
};

const formatSignedNumber = value => {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
};

const formatSignedPercent = value => {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
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

const tabOptions = [
  { key: 'stock', label: '股票' },
  { key: 'futures', label: '期货' }
];

const SearchPanel = ({ children, compact = false, onSelect, placeholder, triggerClassName }) => {
  const {
    currentSymbol,
    currentName,
    currentType,
    setCurrentSymbol
  } = useChartStore();
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState(currentType === 'futures' ? 'futures' : 'stock');
  const [query, setQuery] = useState('');
  const [symbols, setSymbols] = useState(getFallbackMarketSymbols);
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [dailyChangeBySymbol, setDailyChangeBySymbol] = useState({});
  const resultLimit = activeType === 'futures' ? FUTURES_RESULT_LIMIT : STOCK_RESULT_LIMIT;

  useEffect(() => {
    if (!open) {
      setActiveType(currentType === 'futures' ? 'futures' : 'stock');
    }
  }, [currentType, open]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setLoadingSymbols(true);

    const hasQuery = Boolean(query.trim());
    const loader = hasQuery
      ? (activeType === 'stock'
        ? searchLiveStocks(query.trim(), { limit: resultLimit })
        : searchLiveFutures(query.trim(), { limit: resultLimit }))
      : (activeType === 'futures' ? loadLiveFutures() : loadLiveMarketSymbols({ limit: resultLimit }));

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
  }, [activeType, open, query, resultLimit]);

  const pageModel = useMemo(() => getSymbolSearchPage({
    symbols,
    type: activeType,
    query,
    page: 1,
    pageSize: activeType === 'futures' && !query.trim() ? symbols.length : resultLimit
  }), [activeType, query, resultLimit, symbols]);

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

  const displaySymbol = currentSymbol ? `${currentSymbol} ${currentName || ''}`.trim() : '';
  const triggerLabel = placeholder || displaySymbol || '搜索标的';
  const activeTabLabel = activeType === 'futures' ? '期货' : '股票';

  const handleOpen = () => {
    setActiveType(currentType === 'futures' ? 'futures' : 'stock');
    setQuery('');
    setOpen(true);
  };

  const handleTypeChange = (type) => {
    setActiveType(type);
    setQuery('');
  };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSelectItem = (item) => {
    if (onSelect) onSelect(item);
    else setCurrentSymbol(item.symbol, item.name, item.type);
    setOpen(false);
  };

  const getResultMeta = item => {
    if (item.type === 'futures') {
      return [item.varietyName, item.mktName || item.market].filter(Boolean).join(' · ') || item.setup;
    }
    if (item.type !== 'stock') return item.setup;
    return [item.industry, item.market].filter(Boolean).join(' · ') || item.setup;
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
    <div className={compact ? 'search-panel compact' : 'search-panel'}>
      <button className={triggerClassName || 'symbol-search-trigger'} onClick={handleOpen} type="button">
        {children || (
          <>
            <SearchOutlined />
            <span className="symbol-search-text">{triggerLabel}</span>
          </>
        )}
      </button>

      <Modal
        centered
        className="symbol-search-modal"
        footer={null}
        open={open}
        title="搜索标的"
        width={840}
        onCancel={() => setOpen(false)}
      >
        <div className="symbol-search-shell">
          <div aria-label="标的类型" className="symbol-search-tabs" role="tablist">
            {tabOptions.map(tab => (
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
            allowClear
            autoFocus
            className="symbol-search-input"
            placeholder={`按代码或名称搜索${activeTabLabel}`}
            prefix={<SearchOutlined />}
            value={query}
            onChange={handleQueryChange}
          />

          <div className="symbol-search-list" role="listbox">
            {pageModel.items.length > 0 ? (
              pageModel.items.map(item => (
                <div
                  aria-selected={item.symbol === currentSymbol}
                  className={item.symbol === currentSymbol ? 'symbol-result-row active' : 'symbol-result-row'}
                  key={item.symbol}
                  onClick={() => handleSelectItem(item)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    handleSelectItem(item);
                  }}
                  role="option"
                  tabIndex={0}
                >
                  <span className="symbol-result-main">
                    <strong>
                      {item.symbol}
                      {item.type === 'futures' && item.mainFlag && (
                        <span className="symbol-main-contract-badge">M</span>
                      )}
                    </strong>
                    <span>{item.name}</span>
                  </span>
                  <span className="symbol-result-setup">{getResultMeta(item)}</span>
                  <span className={getDailyChangeDisplay(item).tone === 'down' ? 'symbol-result-change down' : 'symbol-result-change'}>
                    <strong>{getDailyChangeDisplay(item).amountText}</strong>
                    <small>{getDailyChangeDisplay(item).percentText}</small>
                  </span>
                </div>
              ))
            ) : (
              <Empty description={loadingSymbols ? '正在加载标的...' : '未找到标的'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>

          <div className="symbol-search-footer">
            <span>{activeTabLabel}结果：{pageModel.items.length}{pageModel.total > pageModel.items.length ? ` / ${pageModel.total}` : ''}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SearchPanel;
