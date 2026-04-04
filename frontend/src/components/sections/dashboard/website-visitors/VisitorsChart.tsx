import { SxProps, useTheme } from '@mui/material';
import { fontFamily } from 'theme/typography';
import { useMemo } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { PolarComponent, TooltipComponent, GraphicComponent } from 'echarts/components';
import ReactEchart from 'components/base/ReactEchart';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { OverviewStats } from 'lib/api';

echarts.use([PolarComponent, TooltipComponent, GraphicComponent, BarChart, CanvasRenderer]);

interface PolarBarChartProps {
  chartRef: React.RefObject<EChartsReactCore>;
  data: OverviewStats;
  sx?: SxProps;
}

const VisitorsChart = ({ chartRef, data, ...rest }: PolarBarChartProps) => {
  const theme = useTheme();

  const total = Number(data?.total_accesses_today || 0);

  const option = useMemo(
    () => ({
      polar: {
        radius: [80, '75%'],
      },
      angleAxis: {
        max: total > 0 ? total : 100,
        startAngle: 180,
        axisLine: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
      radiusAxis: {
        show: false,
        type: 'category',
        data: ['Denied', 'Delayed', 'Granted'],
      },
      tooltip: {},
      series: [
        {
          type: 'bar',
          data: [
            {
              type: 'Denied',
              value: data?.denied_today || 0,
              itemStyle: {
                color: theme.palette.secondary.main,
              },
            },
            {
              type: 'Delayed',
              value: data?.delayed_today || 0,
              itemStyle: {
                color: theme.palette.secondary.lighter,
              },
            },
            {
              type: 'Granted',
              value: data?.granted_today || 0,
              itemStyle: {
                color: theme.palette.primary.main,
              },
            },
          ],
          coordinateSystem: 'polar',
          barCategoryGap: '35%',
          label: {
            show: false,
          },
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: {
            text: total.toLocaleString(),
            fill: theme.palette.text.primary,
            fontSize: theme.typography.h3.fontSize,
            fontFamily: fontFamily.workSans,
            fontWeight: 500,
            letterSpacing: 1,
          },
        },
      ],
    }),
    [theme, data, total],
  );

  return <ReactEchart ref={chartRef} echarts={echarts} option={option} {...rest} />;
};

export default VisitorsChart;
