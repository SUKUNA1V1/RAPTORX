import { useState } from 'react';
import Stack from '@mui/material/Stack';
import EChartsReactCore from 'echarts-for-react/lib/core';
import RevenueChartLegend from './RevenueChartLegend';

interface RevenueData {
  categories: string[];
  series: { name: string; data: number[] }[];
}

interface LegendsProps {
  chartRef: React.RefObject<EChartsReactCore>;
  sm?: boolean;
  revenueData: RevenueData;
}

const legendsData = [
  { id: 1, type: 'Granted' },
  { id: 2, type: 'Delayed' },
  { id: 3, type: 'Denied' },
];

const RevenueChartLegends = ({ chartRef, sm, revenueData }: LegendsProps) => {
  const [toggleColor, setToggleColor] = useState({
    granted: true,
    delayed: true,
    denied: true,
  });

  const handleLegendToggle = (seriesName: string) => {
    const echartsInstance = chartRef.current?.getEchartsInstance();
    if (!echartsInstance) return;

    if (seriesName === 'Granted') {
      setToggleColor({ ...toggleColor, granted: !toggleColor.granted });
    } else if (seriesName === 'Delayed') {
      setToggleColor({ ...toggleColor, delayed: !toggleColor.delayed });
    } else if (seriesName === 'Denied') {
      setToggleColor({ ...toggleColor, denied: !toggleColor.denied });
    }

    const option = echartsInstance.getOption() as echarts.EChartsOption;

    if (Array.isArray(option.series)) {
      const series = option.series.map((s) => {
        if (s.name === seriesName && s.type === 'bar') {
          const isBarVisible = (s.data as number[]).some((value) => value !== 0);
          return {
            ...s,
            data: isBarVisible
              ? (s.data as number[]).map(() => 0)
              : revenueData.series.find((r) => r.name === seriesName)?.data || [],
          };
        }
        return s;
      });
      echartsInstance.setOption({ series });
    }
  };

  return (
    <Stack
      alignItems="center"
      justifyContent={sm ? 'center' : 'flex-start'}
      spacing={2}
      pt={sm ? 3 : 0}
      width={sm ? 1 : 'auto'}
    >
      {legendsData.map((item) => (
        <RevenueChartLegend
          key={item.id}
          data={item}
          toggleColor={toggleColor}
          handleLegendToggle={handleLegendToggle}
        />
      ))}
    </Stack>
  );
};

export default RevenueChartLegends;
