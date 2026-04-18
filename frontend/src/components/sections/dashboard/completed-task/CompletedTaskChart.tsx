import { SxProps, useTheme } from '@mui/material';
import { fontFamily } from 'theme/typography';
import { useState, useMemo, useEffect, useRef } from 'react';
import Stack from '@mui/material/Stack';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import * as echarts from 'echarts';
import EChartsReactCore from 'echarts-for-react/lib/core';
import ReactEchart from 'components/base/ReactEchart';
import { TimelineItem } from 'lib/api';

type RangeHours = 1 | 3 | 6 | 12 | 24;
const RANGES: { label: string; hours: RangeHours }[] = [
  { label: '1H', hours: 1 },
  { label: '3H', hours: 3 },
  { label: '6H', hours: 6 },
  { label: '12H', hours: 12 },
  { label: '24H', hours: 24 },
];

interface CompletedTaskChartProps {
  sx?: SxProps;
  timeline: TimelineItem[];
}

const CompletedTaskChart = ({ timeline, ...rest }: CompletedTaskChartProps) => {
  const theme = useTheme();
  const [activeRange, setActiveRange] = useState<RangeHours>(24);
  const chartRef = useRef<EChartsReactCore>(null);
  // Track the first timestamp of the loaded window; when it changes, re-apply zoom
  const windowKeyRef = useRef<string>('');
  const rangeRef = useRef<RangeHours>(24);

  const seriesData = useMemo(
    () => timeline.map((entry) => [entry.timestamp, entry.granted + entry.denied + entry.delayed]),
    [timeline],
  );

  const maxVal = useMemo(() => {
    const vals = seriesData.map((d) => Number(d[1]));
    return vals.length ? Math.max(...vals, 10) : 10;
  }, [seriesData]);

  /** Imperatively set zoom so data-updates (polling) never reset user's zoom */
  const applyZoom = (rangeHours: RangeHours, data: (string | number)[][]) => {
    if (!chartRef.current || data.length === 0) return;
    const instance = chartRef.current.getEchartsInstance();
    const lastTs = new Date(data[data.length - 1][0] as string).getTime();
    const firstTs = new Date(data[0][0] as string).getTime();
    const windowStart = Math.max(firstTs, lastTs - rangeHours * 60 * 60 * 1000);
    instance.dispatchAction({
      type: 'dataZoom',
      dataZoomIndex: 0,
      startValue: windowStart,
      endValue: lastTs + 60_000,
    });
  };

  // Re-apply zoom only when the data window changes (i.e., date changed or first load)
  useEffect(() => {
    if (seriesData.length === 0) return;
    const newKey = seriesData[0][0] as string;
    if (newKey !== windowKeyRef.current) {
      windowKeyRef.current = newKey;
      // Small timeout to ensure chart has rendered the new data first
      const t = setTimeout(() => applyZoom(rangeRef.current, seriesData), 150);
      return () => clearTimeout(t);
    }
  }, [seriesData]);

  const handleRangeChange = (hours: RangeHours) => {
    setActiveRange(hours);
    rangeRef.current = hours;
    applyZoom(hours, seriesData);
  };

  // The option intentionally has NO startValue/endValue in dataZoom —
  // zoom is controlled imperatively via dispatchAction so polling never resets it.
  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        formatter: (params: { value: [string, number] }[]) => {
          const p = params[0];
          const date = new Date(p.value[0]);
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `${time}: ${p.value[1]} decisions`;
        },
      },
      grid: { top: 10, bottom: 20, left: 35, right: 10 },
      dataZoom: [{ type: 'inside', zoomLock: false }],
      xAxis: {
        type: 'time',
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: {
          margin: 8,
          color: theme.palette.text.secondary,
          fontSize: theme.typography.caption.fontSize,
          fontFamily: fontFamily.monaSans,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: theme.palette.text.secondary,
          fontSize: theme.typography.caption.fontSize,
          fontFamily: fontFamily.monaSans,
        },
        splitLine: { show: false },
        min: 0,
        max: maxVal + Math.ceil(maxVal * 0.2),
      },
      series: [
        {
          data: seriesData,
          type: 'line',
          showSymbol: true,
          symbolSize: 4,
          lineStyle: { color: theme.palette.secondary.main, width: 1.5 },
          itemStyle: { color: theme.palette.secondary.main },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 194, 255, 0.25)' },
                { offset: 1, color: 'rgba(0, 194, 255, 0)' },
              ],
            },
          },
        },
      ],
    }),
    [theme, seriesData, maxVal],
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Range buttons */}
      <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pt: 0.5, pb: 0.5 }}>
        <ButtonGroup size="small" disableElevation sx={{ '& .MuiButtonGroup-grouped': { minWidth: 36 } }}>
          {RANGES.map(({ label, hours }) => (
            <Button
              key={hours}
              onClick={() => handleRangeChange(hours)}
              sx={{
                py: 0.3,
                fontSize: '0.65rem',
                fontWeight: 700,
                fontFamily: fontFamily.monaSans,
                letterSpacing: 0.5,
                ...(activeRange === hours
                  ? { bgcolor: 'rgba(0,194,255,0.2)', color: '#00c2ff', borderColor: 'rgba(0,194,255,0.4)' }
                  : { borderColor: 'rgba(255,255,255,0.08)', color: 'text.secondary', bgcolor: 'transparent' }),
                '&:hover': { bgcolor: 'rgba(0,194,255,0.1)', borderColor: 'rgba(0,194,255,0.3)' },
              }}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </Stack>

      {/* Chart */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ReactEchart
          ref={chartRef}
          echarts={echarts}
          option={option}
          sx={{ height: '100% !important' }}
          {...rest}
        />
      </Box>
    </Box>
  );
};

export default CompletedTaskChart;
