import React, { useState } from 'react';
import { Dropdown } from 'antd';
import {
  AppstoreOutlined,
  FunctionOutlined,
  HeatMapOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MoreOutlined,
  NodeIndexOutlined,
  RadarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import SearchPanel from './SearchPanel';
import { getWorkspaceLayout, workspaceLayoutOptions } from './workspaceLayoutOptions';
import './TerminalTopBar.css';

const featureButtons = [
  { key: 'Auto Fib', label: '自动斐波那契', icon: <NodeIndexOutlined /> },
  { key: 'Trends', label: '趋势', icon: <LineChartOutlined /> },
  { key: 'Indicators', label: '指标', icon: <FunctionOutlined /> },
  { key: 'Patterns', label: '形态', icon: <RadarChartOutlined /> },
  { key: 'Heatmap', label: '热力图', icon: <HeatMapOutlined /> }
];

const TerminalTopBar = ({
  currentSymbol,
  currentName,
  workspaceLayout,
  activeFeature,
  indicatorsActive,
  patternsActive,
  onLayoutChange,
  onIndicatorMenuOpen,
  onIndicatorToggle,
  onPatternMenuOpen,
  onPatternToggle,
  onFeatureSelect,
  themePreference = 'night',
  resolvedTheme = 'night',
  onThemePreferenceChange,
  onLogout,
  currentUser
}) => {
  const [activeSettingsMenu, setActiveSettingsMenu] = useState(null);
  const displaySymbol = currentSymbol ? `${currentSymbol} ${currentName || ''}`.trim() : '搜索标的';
  const activeLayout = getWorkspaceLayout(workspaceLayout);
  const layoutOverlay = (
    <div className="workspace-layout-menu">
      <div className="workspace-layout-title">
        <strong>工作区布局</strong>
        <span>{activeLayout.label}</span>
      </div>
      <div className="workspace-layout-grid">
        {workspaceLayoutOptions.map(item => (
          <button
            className={activeLayout.value === item.value ? 'active' : ''}
            key={item.value}
            onClick={() => onLayoutChange?.(item.value)}
            type="button"
          >
            <span className={`layout-icon ${item.className}`}>
              {Array.from({ length: item.panes }).map((_, index) => <i key={index} />)}
            </span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
      <div className="workspace-layout-actions">
        <button type="button">保存工作区</button>
        <button type="button">切换工作区</button>
      </div>
    </div>
  );
  const themeOptions = [
    { value: 'night', label: '夜间', detail: '深色交易工作区' },
    { value: 'day', label: '日间', detail: '浅色交易工作区' },
    { value: 'auto', label: '自动', detail: '07:00-18:59 使用日间模式' }
  ];
  const settingsOverlay = (
    <div className="topbar-settings-menu">
      <div className="topbar-settings-title">
        <strong>设置</strong>
        <span>{resolvedTheme === 'day' ? '日间模式' : '夜间模式'}</span>
      </div>
      <div className="settings-hover-shell" onMouseLeave={() => setActiveSettingsMenu(null)}>
        <div className="settings-menu-list">
          <button
            className={activeSettingsMenu === 'theme' ? 'active' : ''}
            onFocus={() => setActiveSettingsMenu('theme')}
            onMouseEnter={() => setActiveSettingsMenu('theme')}
            type="button"
          >
            <strong>主题设置</strong>
            <span>夜间、日间、自动</span>
          </button>
          <button
            className={activeSettingsMenu === 'account' ? 'active' : ''}
            onFocus={() => setActiveSettingsMenu('account')}
            onMouseEnter={() => setActiveSettingsMenu('account')}
            type="button"
          >
            <strong>账户</strong>
            <span>退出当前登录</span>
          </button>
        </div>
        {activeSettingsMenu === 'theme' ? (
          <div className="settings-submenu-panel">
            <div className="theme-option-list">
              {themeOptions.map(option => (
                <button
                  className={themePreference === option.value ? 'active' : ''}
                  key={option.value}
                  onClick={() => onThemePreferenceChange?.(option.value)}
                  type="button"
                >
                  <strong>{option.label}</strong>
                  <span>{option.detail}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {activeSettingsMenu === 'account' ? (
          <div className="settings-submenu-panel account-submenu-panel">
            <div className="account-current-user">
              <span>当前用户</span>
              <strong>{currentUser?.account || currentUser?.username || '未登录'}</strong>
            </div>
            <button className="topbar-logout-button" onClick={() => onLogout?.()} type="button">
              <LogoutOutlined />
              <span>退出登录</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <header className="terminal-topbar">
      <div className="topbar-brand">
        <span className="brand-mark">ET</span>
        <span className="brand-name">EagleTrace</span>
      </div>

      <div className="topbar-search">
        <SearchPanel compact placeholder={displaySymbol} />
      </div>

      <nav className="topbar-feature-strip" aria-label="分析功能">
        <Dropdown
          overlayClassName="workspace-layout-dropdown"
          placement="bottomLeft"
          popupRender={() => layoutOverlay}
          trigger={['click']}
        >
          <button
            className="layout-button"
            title="布局"
            type="button"
          >
            <AppstoreOutlined />
            <span>{activeLayout.label}</span>
          </button>
        </Dropdown>
        {featureButtons.map(item => (
          item.key === 'Indicators' || item.key === 'Patterns' ? (
            <span className="split-topbar-control" key={item.key}>
              <button
                className={
                  item.key === 'Indicators'
                    ? (indicatorsActive ? 'active split-main-button' : 'split-main-button')
                    : (patternsActive ? 'active split-main-button' : 'split-main-button')
                }
                title={item.label}
                onClick={() => {
                  if (item.key === 'Indicators') onIndicatorToggle?.();
                  else onPatternToggle?.();
                }}
                type="button"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
              {item.key === 'Indicators' ? (
                <button
                  className="split-more-topbar-button"
                  title="添加、配置或删除指标"
                  onClick={() => onIndicatorMenuOpen?.()}
                  type="button"
                >
                  <MoreOutlined />
                </button>
              ) : (
                <button
                  className="split-more-topbar-button"
                  title="搜索并应用形态"
                  onClick={() => onPatternMenuOpen?.()}
                  type="button"
                >
                  <MoreOutlined />
                </button>
              )}
            </span>
          ) : (
            <button
              key={item.key}
              className={activeFeature === item.key ? 'active' : ''}
              title={item.label}
              onClick={() => onFeatureSelect?.(item.key)}
              type="button"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          )
        ))}
      </nav>
      <Dropdown
        overlayClassName="topbar-settings-dropdown"
        placement="bottomRight"
        popupRender={() => settingsOverlay}
        onOpenChange={open => {
          if (!open) setActiveSettingsMenu(null);
        }}
        trigger={['click']}
      >
        <button className="topbar-settings-button" title="显示设置" type="button">
          <SettingOutlined />
        </button>
      </Dropdown>
    </header>
  );
};

export default TerminalTopBar;
