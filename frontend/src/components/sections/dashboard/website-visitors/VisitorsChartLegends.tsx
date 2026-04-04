import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@mui/material';
import Stack from '@mui/material/Stack';
import VisitorsChartLegend from './VisitorsChartLegend';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { OverviewStats } from 'lib/api';

interface LegendsProps {
  chartRef: React.RefObject<EChartsReactCore>;
  data: OverviewStats;
}

const VisitorsChartLegends = ({ chartRef, data }: LegendsProps) => {
  const theme = useTheme();
  const [toggleColor, setToggleColor] = useState({
    granted: true,
    delayed: true,
    denied: true,
  });

  const total = Number(data?.total_accesses_today || 1);

  const legendsData = useMemo(() => [
    {
      id: 1,
      type: 'Granted',
      rate: `${Math.round(((data?.granted_today || 0) / total) * 100)}%`,
    },
    {
      id: 2,
      type: 'Delayed',
      rate: `${Math.round(((data?.delayed_today || 0) / total) * 100)}%`,
    },
    {
      id: 3,
      type: 'Denied',
      rate: `${Math.round(((data?.denied_today || 0) / total) * 100)}%`,
    },
  ], [data, total]);

  useEffect(() => {
    const handleBodyClick = (e: MouseEvent) => {
      handleToggleLegend(e as unknown as React.MouseEvent, null);
    };
    document.body.addEventListener('click', handleBodyClick);
    return () => {
      document.body.removeEventListener('click', handleBodyClick);
    };
  }, []);

  const getActiveColor = (type: string) => {
    if (type === 'Granted') {
      return theme.palette.primary.main;
    } else if (type === 'Delayed') {
      return theme.palette.secondary.lighter;
    } else if (type === 'Denied') {
      return theme.palette.secondary.main;
    }
  };

  const getDisableColor = (type: string) => {
    if (type === 'Granted') {
      return theme.palette.primary.dark;
    } else if (type === 'Delayed') {
      return theme.palette.secondary.darker;
    } else if (type === 'Denied') {
      return theme.palette.secondary.dark;
    }
  };

  const handleToggleLegend = (e: React.MouseEvent, type: string | null) => {
    e.stopPropagation();
    const echartsInstance = chartRef.current?.getEchartsInstance();
    if (!echartsInstance) return;

    const option = echartsInstance.getOption() as echarts.EChartsOption;

    if (type === 'Granted') {
      setToggleColor({ granted: true, delayed: false, denied: false });
    } else if (type === 'Delayed') {
      setToggleColor({ granted: false, delayed: true, denied: false });
    } else if (type === 'Denied') {
      setToggleColor({ granted: false, delayed: false, denied: true });
    } else {
      setToggleColor({ granted: true, delayed: true, denied: true });
    }

    if (Array.isArray(option.series)) {
      const series = option.series.map((s) => {
        if (Array.isArray(s.data)) {
          s.data.forEach((item) => {
            if (type !== null && item.itemStyle && item.itemStyle.color) {
              if (type === item.type) {
                item.itemStyle.color = getActiveColor(item.type);
              } else {
                item.itemStyle.color = getDisableColor(item.type);
              }
            } else {
              item.itemStyle.color = getActiveColor(item.type);
            }
          });
        }
        return s;
      });

      echartsInstance.setOption({ series });
    }
  };

  return (
    <Stack mt={-1} spacing={3} direction="column">
      {legendsData.map((item) => (
        <VisitorsChartLegend
          key={item.id}
          data={item}
          toggleColor={toggleColor}
          handleToggleLegend={handleToggleLegend}
        />
      ))}
    </Stack>
  );
};

export default VisitorsChartLegends;
