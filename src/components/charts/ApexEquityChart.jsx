/**
 * ApexCharts equity curve — shared by Results and Order variance.
 */

import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { getChartTheme } from '../../lib/chartTheme';

function fmtUsdAxis(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtUsdTooltip(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * @param {Array<{ name: string, data: Array<{x:number,y:number}>, color?: string, strokeWidth?: number, opacity?: number }>} series
 */
export default function ApexEquityChart({
  series = [],
  height = 400,
  initialCapital = null,
}) {
  const { apexSeries, options } = useMemo(() => {
    const chartTheme = getChartTheme();

    const validSeries = (series || [])
      .map((s) => ({
        ...s,
        data: (s.data || []).filter(
          (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y),
        ),
      }))
      .filter((s) => s.data.length > 0);

    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'dark';

    const allTimestamps = validSeries.flatMap((s) => s.data.map((p) => p.x));
    const xMin = allTimestamps.length ? Math.min(...allTimestamps) : undefined;
    const xMax = allTimestamps.length ? Math.max(...allTimestamps) : undefined;

    const annotations = [];
    if (initialCapital != null && Number.isFinite(initialCapital)) {
      annotations.push({
        y: Number(initialCapital),
        borderColor: chartTheme.inkTertiary,
        strokeDashArray: 4,
        label: {
          text: 'Initial capital',
          style: { color: chartTheme.inkTertiary, fontSize: '10px' },
        },
      });
    }

    const opts = {
      chart: {
        type: 'line',
        background: 'transparent',
        fontFamily: chartTheme.fontUi,
        animations: { enabled: false },
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      theme: { mode: isDark ? 'dark' : 'light' },
      stroke: {
        width: validSeries.map((s) => s.strokeWidth ?? 2),
        curve: 'straight',
      },
      colors: validSeries.map((s) => {
        if (!s.color) return chartTheme.accent;
        if (s.opacity != null && s.opacity < 1) {
          const hex = s.color.replace('#', '');
          const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
          const n = parseInt(full, 16);
          const r = (n >> 16) & 255;
          const g = (n >> 8) & 255;
          const b = n & 255;
          return `rgba(${r},${g},${b},${s.opacity})`;
        }
        return s.color;
      }),
      xaxis: {
        type: 'datetime',
        ...(xMin != null && { min: xMin }),
        ...(xMax != null && { max: xMax }),
        tickPlacement: 'on',
        labels: { style: { colors: chartTheme.inkTertiary, fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        title: {
          text: 'Equity ($)',
          style: { color: chartTheme.inkSecondary, fontSize: '12px' },
        },
        labels: {
          style: { colors: chartTheme.inkTertiary, fontSize: '11px' },
          formatter: fmtUsdAxis,
        },
      },
      grid: {
        borderColor: chartTheme.grid,
        strokeDashArray: 0,
        padding: {
          left: 0,
          right: 0,
        },
      },
      legend: {
        show: validSeries.length > 1,
        position: 'top',
        labels: { colors: chartTheme.inkSecondary },
      },
      tooltip: {
        shared: true,
        intersect: false,
        x: { format: 'dd MMM yyyy' },
        y: { formatter: fmtUsdTooltip },
      },
      annotations: {
        yaxis: annotations,
      },
    };

    return {
      apexSeries: validSeries.map((s) => ({ name: s.name, data: s.data })),
      options: opts,
    };
  }, [series, initialCapital]);

  if (!apexSeries.length) {
    return <p className="text-sm text-ink-tertiary py-8 text-center">No equity data</p>;
  }

  return <Chart options={options} series={apexSeries} type="line" height={height} />;
}

/** Map API equity points → Apex {x,y} series data */
export function equityPointsToApexData(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((p) => {
      const ts = p.timestamp ?? p.date ?? p.t;
      const eq = p.equity ?? p.y;
      const x = new Date(ts).getTime();
      const y = Number(eq);
      if (!Number.isFinite(x) || Number.isNaN(x) || !Number.isFinite(y)) return null;
      return { x, y };
    })
    .filter(Boolean)
    .sort((a, b) => a.x - b.x);
}
