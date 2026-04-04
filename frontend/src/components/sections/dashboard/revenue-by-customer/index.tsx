import { useRef, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import RateChip from 'components/chips/RateChip';
import DateSelect from 'components/dates/DateSelect';
import EChartsReactCore from 'echarts-for-react/lib/core';
import RevenueChartLegends from './RevenueChartLegends';
import RevenueChart from './RevenueChart';
import { apiClient, OverviewStats, MonthlyTimelineItem } from 'lib/api';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const RevenueByCustomer = () => {
  const chartRef = useRef<EChartsReactCore>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [monthly, setMonthly] = useState<MonthlyTimelineItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, monthlyData] = await Promise.all([
          apiClient.getOverview(),
          apiClient.getMonthlyTimeline(),
        ]);
        setStats(overviewData);
        setMonthly(monthlyData);
      } catch (err) {
        console.error('Failed to fetch revenue data:', err);
      }
    };
    void fetchData();
  }, []);

  const revenueData = {
    categories: MONTH_LABELS,
    series: [
      { name: 'Granted', data: MONTH_LABELS.map((_, i) => monthly.find((m) => m.month === i + 1)?.granted ?? 0) },
      { name: 'Delayed', data: MONTH_LABELS.map((_, i) => monthly.find((m) => m.month === i + 1)?.delayed ?? 0) },
      { name: 'Denied',  data: MONTH_LABELS.map((_, i) => monthly.find((m) => m.month === i + 1)?.denied ?? 0) },
    ],
  };

  const total = stats?.total_accesses_today ?? 0;
  const grantRate = total > 0 ? ((stats!.granted_today / total) * 100).toFixed(1) + '%' : '—';
  const isUp = total > 0 && stats!.granted_today >= stats!.denied_today;

  return (
    <Paper sx={{ height: { xs: 540, md: 500 } }}>
      {/* header */}
      <Typography variant="subtitle1" color="text.secondary">
        Security Events by type
      </Typography>

      {/* subheader */}
      <Stack justifyContent="space-between" mt={1}>
        <Stack alignItems="center" gap={0.875}>
          <Typography variant="h3" fontWeight={600} letterSpacing={1}>
            {stats ? stats.total_accesses_today.toLocaleString() : '...'}
          </Typography>
          <RateChip rate={grantRate} isUp={isUp} />
        </Stack>

        <Stack alignItems="center" spacing={2}>
          {/* legends for bigger screen */}
          <Box display={{ xs: 'none', md: 'block' }}>
            <RevenueChartLegends chartRef={chartRef} sm={false} revenueData={revenueData} />
          </Box>
          <DateSelect />
        </Stack>
      </Stack>

      {/* legends for smaller screen */}
      <Box display={{ xs: 'block', md: 'none' }}>
        <RevenueChartLegends chartRef={chartRef} sm={true} revenueData={revenueData} />
      </Box>

      {/* stacked bar chart */}
      <Box height={400}>
        <RevenueChart chartRef={chartRef} data={revenueData} sx={{ minHeight: 1 }} />
      </Box>
    </Paper>
  );
};

export default RevenueByCustomer;
