import React, { useState } from 'react';
import {
  AimOutlined,
  BorderOutlined,
  ClearOutlined,
  DeleteOutlined,
  FontSizeOutlined,
  SelectOutlined
} from '@ant-design/icons';
import { drawingToolOptions } from './drawingTools';
import './ToolRail.css';

const toolIcons = {
  select: <SelectOutlined />,
  trend: <span className="tool-glyph trend" />,
  segment: <span className="tool-glyph segment" />,
  extended: <span className="tool-glyph extended" />,
  channel: <span className="tool-glyph channel" />,
  pitchfork: <span className="tool-glyph pitchfork" />,
  horizontal: <span className="tool-glyph horizontal" />,
  vertical: <span className="tool-glyph vertical" />,
  arrow: <span className="tool-glyph arrow" />,
  rectangle: <BorderOutlined />,
  ellipse: <span className="tool-glyph ellipse" />,
  fibonacci: <span className="tool-glyph fibonacci" />,
  fibExtension: <span className="tool-glyph fib-extension" />,
  fibTimeZones: <span className="tool-glyph fib-time-zones" />,
  priceRange: <span className="tool-glyph price-range" />,
  dateRange: <span className="tool-glyph date-range" />,
  text: <FontSizeOutlined />,
  callout: <span className="tool-glyph callout" />,
  measure: <AimOutlined />
};

const toolGroups = [
  { key: 'select', tools: ['select'] },
  { key: 'lines', label: '线条', primary: 'trend', tools: ['trend', 'segment', 'extended', 'channel', 'pitchfork', 'horizontal', 'vertical', 'arrow'] },
  { key: 'shapes', label: '形状', primary: 'rectangle', tools: ['rectangle', 'ellipse'] },
  { key: 'fib', label: '斐波那契', primary: 'fibonacci', tools: ['fibonacci', 'fibExtension', 'fibTimeZones'] },
  { key: 'measure', label: '测量', primary: 'priceRange', tools: ['priceRange', 'dateRange', 'measure'] },
  { key: 'notes', label: '标注', primary: 'text', tools: ['text', 'callout'] }
];

const toolByKey = Object.fromEntries(drawingToolOptions.map(tool => [tool.key, tool]));

const LAST_TOOL_STORAGE_KEY = 'trendspider.toolRailLastTools.v1';

const readStoredLastTools = () => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(LAST_TOOL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const writeStoredLastTools = toolsByGroup => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LAST_TOOL_STORAGE_KEY, JSON.stringify(toolsByGroup));
  } catch {
    // Storage is a convenience only; drawing selection should still work.
  }
};

const getGroupActiveTool = (group, activeDrawingTool, lastToolsByGroup) => {
  if (group.tools.includes(activeDrawingTool)) return activeDrawingTool;
  if (group.tools.includes(lastToolsByGroup[group.key])) return lastToolsByGroup[group.key];
  return group.primary;
};

const ToolRail = ({
  activeDrawingTool,
  drawingsDisabled,
  onClearDrawings,
  onDeleteDrawing,
  onDrawingToolSelect,
  selectedDrawingId
}) => {
  const [lastToolsByGroup, setLastToolsByGroup] = useState(readStoredLastTools);

  const selectTool = (toolKey, groupKey) => {
    if (groupKey && groupKey !== 'select') {
      setLastToolsByGroup(previous => {
        const next = { ...previous, [groupKey]: toolKey };
        writeStoredLastTools(next);
        return next;
      });
    }

    onDrawingToolSelect?.(toolKey);
  };

  return (
    <aside className="tool-rail" aria-label="图表工具">
      {toolGroups.map(group => (
        <div className="tool-rail-group" key={group.key}>
          {group.key === 'select' ? (
            <button
              className={activeDrawingTool === 'select' ? 'tool-button active' : 'tool-button'}
              title={toolByKey.select.label}
              aria-label={toolByKey.select.label}
              aria-pressed={activeDrawingTool === 'select'}
              disabled={drawingsDisabled}
              onClick={() => selectTool('select', 'select')}
              type="button"
            >
              {toolIcons.select}
            </button>
          ) : (
            <div className="tool-menu">
              {(() => {
                const activeToolKey = getGroupActiveTool(group, activeDrawingTool, lastToolsByGroup);
                const activeTool = toolByKey[activeToolKey];
                const groupActive = group.tools.includes(activeDrawingTool);

                return (
                  <>
                    <button
                      className={groupActive ? 'tool-button active' : 'tool-button'}
                      title={activeTool.label}
                      aria-label={activeTool.label}
                      aria-pressed={groupActive}
                      disabled={drawingsDisabled}
                      onClick={() => selectTool(activeToolKey, group.key)}
                      type="button"
                    >
                      {toolIcons[activeToolKey]}
                    </button>
                    <button
                      className="tool-menu-trigger"
                      title={`${group.label}工具`}
                      aria-haspopup="menu"
                      aria-label={`${group.label}工具`}
                      disabled={drawingsDisabled}
                      type="button"
                    >
                      <span className="tool-menu-corner" aria-hidden="true" />
                    </button>
                    <div className="tool-popout" role="menu">
                      <div className="tool-popout-title">{group.label}</div>
                      {group.tools.map(toolKey => {
                        const tool = toolByKey[toolKey];
                        return (
                          <button
                            className={activeDrawingTool === toolKey ? 'tool-popout-item active' : 'tool-popout-item'}
                            key={toolKey}
                            role="menuitem"
                            type="button"
                            onClick={() => selectTool(toolKey, group.key)}
                          >
                            {toolIcons[toolKey]}
                            <span>{tool.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      ))}

      <div className="tool-rail-group destructive">
        <button
          className="tool-button"
          title="删除所选画线"
          aria-label="删除所选画线"
          disabled={drawingsDisabled || !selectedDrawingId}
          onClick={onDeleteDrawing}
          type="button"
        >
          <DeleteOutlined />
        </button>
        <button
          className="tool-button"
          title="清空当前标的画线"
          aria-label="清空当前标的画线"
          disabled={drawingsDisabled}
          onClick={onClearDrawings}
          type="button"
        >
          <ClearOutlined />
        </button>
      </div>
    </aside>
  );
};

export default ToolRail;
