export const workspaceLayoutOptions = [
  { value: 'single', label: '1 图表', panes: 1, className: 'layout-single' },
  { value: 'two-column', label: '2 图表', panes: 2, className: 'layout-two-column' },
  { value: 'two-row', label: '上下 2 图表', panes: 2, className: 'layout-two-row' },
  { value: 'three-column', label: '3 图表', panes: 3, className: 'layout-three-column' },
  { value: 'four-grid', label: '4 图表', panes: 4, className: 'layout-four-grid' },
  { value: 'nine-grid', label: '9 图表', panes: 9, className: 'layout-nine-grid' }
];

export const getWorkspaceLayout = value =>
  workspaceLayoutOptions.find(item => item.value === value) || workspaceLayoutOptions[0];

export const getWorkspacePaneCount = value => getWorkspaceLayout(value).panes;
