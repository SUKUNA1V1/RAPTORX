import { useEffect, useState, useRef } from 'react';
import { fontFamily } from 'theme/typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import EChartsReactCore from 'echarts-for-react/lib/core';
import VisitorsChartLegends from './VisitorsChartLegends';
import VisitorsChart from './VisitorsChart';
import { apiClient, OverviewStats } from 'lib/api';

const WebsiteVisitors = () => {
  const chartRef = useRef<EChartsReactCore>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.getOverview();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    void fetchData();
  }, []);

  if (!stats) {
    return (
      <Paper sx={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ height: 500 }}>
      {/* header */}
      <Stack alignItems="center" justifyContent="space-between" mb={-2}>
        <Typography variant="h6" fontWeight={400} fontFamily={fontFamily.workSans}>
          Access Traffic (Today)
        </Typography>
      </Stack>

      {/* polar bar chart */}
      <VisitorsChart chartRef={chartRef} data={stats} />

      {/* legends */}
      <VisitorsChartLegends chartRef={chartRef} data={stats} />
    </Paper>
  );
};

export default WebsiteVisitors;
