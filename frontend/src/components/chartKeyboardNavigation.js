export const getNextCrosshairIndex = ({ currentIndex, direction, length }) => {
  const lastIndex = Math.max(0, Number(length) - 1);
  if (!Number.isInteger(currentIndex)) return lastIndex;
  const baseIndex = currentIndex;
  const delta = direction === 'left' ? -1 : 1;
  return Math.min(lastIndex, Math.max(0, baseIndex + delta));
};

export const getZoomedLogicalRange = (range, direction, anchor) => {
  if (!range) return null;

  const span = range.to - range.from;
  if (!Number.isFinite(span) || span <= 2) return range;

  const nextSpan = direction === 'in' ? span * 0.8 : span * 1.2;
  const hasAnchor = Number.isFinite(anchor) && anchor >= range.from && anchor <= range.to;

  if (hasAnchor) {
    const ratio = (anchor - range.from) / span;
    return {
      from: anchor - nextSpan * ratio,
      to: anchor + nextSpan * (1 - ratio)
    };
  }

  const offset = (span - nextSpan) / 2;

  return {
    from: range.from + offset,
    to: range.to - offset
  };
};

export const clampLogicalRange = (range, length) => {
  if (!range) return null;

  const lastIndex = Math.max(0, Number(length) - 1);
  const span = range.to - range.from;
  if (!Number.isFinite(span) || span <= 0) return range;

  if (span >= lastIndex) {
    return { from: 0, to: lastIndex };
  }

  if (range.from < 0) {
    return { from: 0, to: span };
  }

  if (range.to > lastIndex) {
    return { from: lastIndex - span, to: lastIndex };
  }

  return range;
};

export const getLogicalRangeKeepingIndexVisible = ({
  range,
  index,
  length,
  padding = 2
}) => {
  if (!range || !Number.isFinite(index)) return range || null;

  const safePadding = Math.max(0, Number(padding) || 0);
  const span = range.to - range.from;
  if (!Number.isFinite(span) || span <= 0) return range;

  const leftBoundary = range.from + safePadding;
  const rightBoundary = range.to - safePadding;

  if (index < leftBoundary) {
    const offset = index - leftBoundary;
    return clampLogicalRange(
      {
        from: range.from + offset,
        to: range.to + offset
      },
      length
    );
  }

  if (index > rightBoundary) {
    const offset = index - rightBoundary;
    return clampLogicalRange(
      {
        from: range.from + offset,
        to: range.to + offset
      },
      length
    );
  }

  return range;
};
