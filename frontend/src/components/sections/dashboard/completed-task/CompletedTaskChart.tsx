import { SxProps, useTheme } from '@mui/material';
import { fontFamily } from 'theme/typography';
import { useMemo } from 'react';
import { graphic } from 'echarts';
import * as echarts from 'echarts/core';
import ReactEchart from 'components/base/ReactEchart';
import { HourlyTimelineItem } from 'lib/api';

interface CompletedTaskChartProps {
  sx?: SxProps;
  timeline: HourlyTimelineItem[];
}

const CompletedTaskChart = ({ timeline, ...rest }: CompletedTaskChartProps) => {
  const theme = useTheme();

  const option = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const totalByHour = hours.map((_, i) => {
      const entry = timeline.find((t) => t.hour === i);
      return entry ? entry.granted + entry.denied + entry.delayed : 0;
    });
    const maxVal = Math.max(...totalByHour, 10);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0];
          return `${p.name}: ${p.value} decisions`;
        },
      },
      grid: { top: 30, bottom: 70, left: 30, right: 0 },
      xAxis: {
        type: 'category',
        data: hours.filter((_, i) => i % 3 === 0), // show every 3h for readability
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          margin: 10,
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
          data: totalByHour.filter((_, i) => i % 3 === 0),
          type: 'line',
          showSymbol: false,
          lineStyle: { color: theme.palette.secondary.main, width: 1.2 },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 194, 255, 0.2)' },
              { offset: 1, color: 'rgba(0, 194, 255, 0)' },
            ]),
          },
        },
      ],
    };
  }, [theme, timeline]);

  return <ReactEchart echarts={echarts} option={option} {...rest} />;
};

export default CompletedTaskChart;
