export const DRAWING_STORAGE_KEY = 'trendspider.chartDrawings.v1';

export const drawingToolOptions = [
  { key: 'select', label: '选择' },
  { key: 'trend', label: '趋势线' },
  { key: 'segment', label: '线段' },
  { key: 'extended', label: '延长线' },
  { key: 'channel', label: '趋势通道' },
  { key: 'pitchfork', label: '叉形线' },
  { key: 'horizontal', label: '水平线' },
  { key: 'vertical', label: '垂直线' },
  { key: 'arrow', label: '箭头' },
  { key: 'rectangle', label: '矩形' },
  { key: 'ellipse', label: '椭圆' },
  { key: 'fibonacci', label: '斐波那契回撤' },
  { key: 'fibExtension', label: '斐波那契扩展' },
  { key: 'fibTimeZones', label: '斐波那契时间周期' },
  { key: 'priceRange', label: '价格区间' },
  { key: 'dateRange', label: '日期区间' },
  { key: 'text', label: '文本' },
  { key: 'callout', label: '标注' },
  { key: 'measure', label: '测量' }
];

export const drawableToolKeys = drawingToolOptions
  .filter(item => item.key !== 'select')
  .map(item => item.key);

export const defaultDrawingStyle = {
  color: '#4ee093',
  width: 2,
  dash: 'solid'
};

export const getDrawingSymbolKey = ({ symbol, symbolType, type } = {}) => {
  if (!symbol) return null;
  return `${symbolType || type || 'stock'}:${symbol}`;
};

export const getDrawingsForSymbol = (drawingsBySymbol = {}, symbolInput) => {
  const key = typeof symbolInput === 'string' ? symbolInput : getDrawingSymbolKey(symbolInput);
  if (!key) return [];
  return drawingsBySymbol[key] || [];
};

const normalizeAnchors = anchors => (Array.isArray(anchors) ? anchors : [])
  .filter(anchor => Number.isFinite(anchor?.time) && Number.isFinite(anchor?.price))
  .map(anchor => ({
    time: anchor.time,
    price: anchor.price
  }));

export const createDrawing = ({
  id,
  tool,
  symbol,
  symbolType,
  anchors,
  text = '',
  style = {},
  now = Date.now()
}) => ({
  id: id || `drawing-${now}-${Math.random().toString(36).slice(2, 8)}`,
  type: tool,
  symbol,
  symbolType: symbolType || 'stock',
  anchors: normalizeAnchors(anchors),
  text,
  style: {
    ...defaultDrawingStyle,
    ...style
  },
  createdAt: now,
  updatedAt: now
});

export const upsertDrawing = (drawingsBySymbol = {}, drawing) => {
  const key = getDrawingSymbolKey(drawing);
  if (!key) return drawingsBySymbol;

  const current = drawingsBySymbol[key] || [];
  const existingIndex = current.findIndex(item => item.id === drawing.id);
  const next = existingIndex >= 0
    ? current.map(item => (item.id === drawing.id ? drawing : item))
    : [...current, drawing];

  return {
    ...drawingsBySymbol,
    [key]: next
  };
};

export const updateDrawing = (drawingsBySymbol = {}, drawingId, patch, now = Date.now()) => {
  let changed = false;
  const nextEntries = Object.entries(drawingsBySymbol).map(([key, drawings]) => {
    const nextDrawings = drawings.map(item => {
      if (item.id !== drawingId) return item;
      changed = true;
      return {
        ...item,
        ...patch,
        anchors: patch.anchors ? normalizeAnchors(patch.anchors) : item.anchors,
        style: patch.style ? { ...item.style, ...patch.style } : item.style,
        updatedAt: now
      };
    });
    return [key, nextDrawings];
  });

  return changed ? Object.fromEntries(nextEntries) : drawingsBySymbol;
};

export const deleteDrawing = (drawingsBySymbol = {}, drawingId) => {
  const nextEntries = Object.entries(drawingsBySymbol).map(([key, drawings]) => [
    key,
    drawings.filter(item => item.id !== drawingId)
  ]);

  return Object.fromEntries(nextEntries.filter(([, drawings]) => drawings.length > 0));
};

export const clearDrawingsForSymbol = (drawingsBySymbol = {}, symbolInput) => {
  const key = typeof symbolInput === 'string' ? symbolInput : getDrawingSymbolKey(symbolInput);
  if (!key || !drawingsBySymbol[key]) return drawingsBySymbol;

  const { [key]: _removed, ...rest } = drawingsBySymbol;
  return rest;
};
