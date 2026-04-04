import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RateChip from 'components/chips/RateChip';
import DateSelect from 'components/dates/DateSelect';
import IconifyIcon from 'components/base/IconifyIcon';
import CompletedTaskChart from './CompletedTaskChart';
import { apiClient, OverviewStats, HourlyTimelineItem } from 'lib/api';

const CompletedTask = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [timeline, setTimeline] = useState<HourlyTimelineItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, timelineData] = await Promise.all([
          apiClient.getOverview(),
          apiClient.getAccessTimeline(),
        ]);
        setStats(overviewData);
        setTimeline(timelineData);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    void fetchData();
  }, []);

  // Compute grant rate as the "decisions processed" rate metric
  const total = stats?.total_accesses_today ?? 0;
  const grantRate =
    total > 0 ? ((stats!.granted_today / total) * 100).toFixed(1) + '%' : '—';
  const isUp = total > 0 && stats!.granted_today >= stats!.denied_today;

  return (
    <Paper sx={{ height: 300 }}>
      {/* header */}
      <Stack alignItems="center" spacing={0.6}>
        <IconifyIcon icon="ph:clock-fill" color="text.secondary" fontSize="h6.fontSize" />
        <Typography variant="body2" color="text.secondary">
          Decisions processed
        </Typography>
      </Stack>

      <Stack mt={1.5} alignItems="center" justifyContent="space-between" direction="row">
        <Stack alignItems="center" gap={0.875} direction="row">
          <Typography variant="h3" fontWeight={600} letterSpacing={1}>
            {stats ? stats.total_accesses_today.toLocaleString() : '...'}
          </Typography>
          <RateChip rate={grantRate} isUp={isUp} />
        </Stack>

        <DateSelect />
      </Stack>

      {/* line chart */}
      <Box height={220}>
        <CompletedTaskChart sx={{ height: '100% !important' }} timeline={timeline} />
      </Box>
    </Paper>
  );
};

export default CompletedTask;
