export const getDrawingOverlayClassName = activeDrawingTool =>
  activeDrawingTool && activeDrawingTool !== 'select'
    ? 'drawing-overlay drawing-mode'
    : 'drawing-overlay selection-mode';

export const getSelectedDrawingControlPoint = (points = []) => {
  const validPoints = points.filter(point =>
    Number.isFinite(point?.x) && Number.isFinite(point?.y)
  );

  if (validPoints.length === 0) return null;

  const right = Math.max(...validPoints.map(point => point.x));
  const top = Math.min(...validPoints.map(point => point.y));

  return {
    x: right + 8,
    y: Math.max(12, top - 8)
  };
};
