import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { rechartsTheme, hexToRgba } from '../../lib/chartTheme';

/**
 * Signature equity curve — design.md §7.1
 */
export default function EquityCurveChart({
  data = [],
  xKey = 'date',
  yKey = 'equity',
  splitIndex = null,
  initialCapital = null,
  height = 320,
  compareKey = null,
}) {
  const theme = rechartsTheme();

  const enriched = data.map((row, i) => {
    const equity = Number(row[yKey] ?? 0);
    let peak = equity;
    for (let j = 0; j <= i; j += 1) {
      peak = Math.max(peak, Number(data[j][yKey] ?? 0));
    }
    return {
      ...row,
      _peak: peak,
      _drawdown: equity < peak ? peak : null,
      _equity: equity,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={enriched} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={theme.gridStroke} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: theme.axisFill, fontSize: 11, fontFamily: theme.fontFamily }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: theme.axisFill, fontSize: 11, fontFamily: theme.fontFamily }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
          }}
        />
        {initialCapital != null && (
          <ReferenceLine
            y={initialCapital}
            stroke={theme.axisFill}
            strokeDasharray="4 4"
            label={{ value: 'capital', fill: theme.axisFill, fontSize: 10 }}
          />
        )}
        {splitIndex != null && enriched[splitIndex] && (
          <ReferenceLine
            x={enriched[splitIndex][xKey]}
            stroke={theme.axisFill}
            strokeDasharray="4 4"
            label={{ value: 'split', fill: theme.axisFill, fontSize: 10 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="_peak"
          stroke="none"
          fill="transparent"
          activeDot={false}
          isAnimationActive={false}
        />
        <Area
          type="stepAfter"
          dataKey="_drawdown"
          stroke="none"
          fill={hexToRgba(theme.loss, 0.08)}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="_equity"
          stroke={theme.accent}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        {compareKey && (
          <Line
            type="monotone"
            dataKey={compareKey}
            stroke={theme.profit}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
