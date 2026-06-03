export const getScannerWatchlistOptions = (groups = []) => (
  groups
    .filter(group => group?.id && group?.name)
    .map(group => ({
      value: group.id,
      label: group.name,
      count: Array.isArray(group.symbols) ? group.symbols.length : 0
    }))
);

export const resolveScannerWatchlistSelection = (selectedId, groups = []) => {
  const options = getScannerWatchlistOptions(groups);
  if (!options.length) return '';
  if (options.some(option => option.value === selectedId)) return selectedId;
  return options[0].value;
};
