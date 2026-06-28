/**
 * Read design tokens from CSS variables for chart libraries.
 */

function readVar(name, fallback = '') {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function getChartTheme() {
  return {
    accent: readVar('--accent', '#2D6BFF'),
    grid: readVar('--grid', '#EAEDF1'),
    ink: readVar('--ink', '#10151D'),
    inkSecondary: readVar('--ink-secondary', '#4A5568'),
    inkTertiary: readVar('--ink-tertiary', '#8A94A6'),
    profit: readVar('--profit', '#0E9F6E'),
    loss: readVar('--loss', '#E02424'),
    surface: readVar('--surface', '#FFFFFF'),
    border: readVar('--border', '#DDE1E8'),
    fontMono: readVar('--font-mono', 'monospace'),
    fontUi: readVar('--font-ui', 'sans-serif'),
    series: [
      readVar('--series-1', '#2D6BFF'),
      readVar('--series-2', '#9333EA'),
      readVar('--series-3', '#0891B2'),
      readVar('--series-4', '#C2410C'),
      readVar('--series-5', '#4D7C0F'),
      readVar('--series-6', '#BE185D'),
    ],
  };
}

export function apexBaseOptions() {
  const t = getChartTheme();
  return {
    chart: {
      background: 'transparent',
      fontFamily: t.fontUi,
      toolbar: { show: false },
    },
    grid: {
      borderColor: t.grid,
      strokeDashArray: 0,
    },
    xaxis: {
      labels: {
        style: { colors: t.inkTertiary, fontSize: '11px', fontFamily: t.fontMono },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: t.inkTertiary, fontSize: '11px', fontFamily: t.fontMono },
      },
    },
    tooltip: { theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light' },
  };
}

export function rechartsTheme() {
  const t = getChartTheme();
  return {
    gridStroke: t.grid,
    axisFill: t.inkTertiary,
    fontFamily: t.fontMono,
    accent: t.accent,
    profit: t.profit,
    loss: t.loss,
  };
}

export function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
