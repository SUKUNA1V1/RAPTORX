import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import RateChip from 'components/chips/RateChip';
import IconifyIcon from 'components/base/IconifyIcon';
import CompletedTaskChart from './CompletedTaskChart';
import { apiClient, OverviewStats, TimelineItem } from 'lib/api';

const toLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CompletedTask = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');   // '' = auto-anchor mode
  const [pendingDate, setPendingDate] = useState<string>('');      // what's typed in the box
  const [isAuto, setIsAuto] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, timelineData] = await Promise.all([
          apiClient.getOverview(),
          apiClient.getAccessTimeline(isAuto ? undefined : selectedDate),
        ]);
        setStats(overviewData);
        setTimeline(timelineData);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    void fetchData();
    const interval = setInterval(() => void fetchData(), 3000);
    return () => clearInterval(interval);
  }, [selectedDate, isAuto]);

  const handleApplyDate = () => {
    if (!pendingDate) return;
    setSelectedDate(pendingDate);
    setIsAuto(false);
  };

  const handleResetToAuto = () => {
    setSelectedDate('');
    setPendingDate('');
    setIsAuto(true);
  };

  // Compute grant rate as the "decisions processed" rate metric
  const total = stats?.total_accesses_today ?? 0;
  const grantRate =
    total > 0 ? ((stats!.granted_today / total) * 100).toFixed(1) + '%' : '—';
  const isUp = total > 0 && stats!.granted_today >= stats!.denied_today;

  return (
    <Paper sx={{ height: 300, display: 'flex', flexDirection: 'column' }}>
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

        {/* Date selector */}
        <Stack direction="row" alignItems="center" gap={0.5}>
          <TextField
            type="date"
            size="small"
            value={pendingDate || toLocalDateString(new Date())}
            onChange={(e) => setPendingDate(e.target.value)}
            inputProps={{ max: toLocalDateString(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)) }}
            sx={{
              width: 150,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.04)',
                borderRadius: 2,
                fontSize: '0.75rem',
              },
              '& .MuiInputBase-input': { py: 0.6, px: 1.2, color: 'text.secondary' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' },
            }}
          />
          <Tooltip title="Load selected date">
            <IconButton
              size="small"
              onClick={handleApplyDate}
              disabled={!pendingDate}
              sx={{
                color: pendingDate ? '#00c2ff' : 'text.disabled',
                bgcolor: pendingDate ? 'rgba(0,194,255,0.08)' : 'transparent',
                border: '1px solid',
                borderColor: pendingDate ? 'rgba(0,194,255,0.3)' : 'rgba(255,255,255,0.06)',
                borderRadius: 1.5,
                p: 0.5,
              }}
            >
              <IconifyIcon icon="mdi:check-bold" fontSize="small" />
            </IconButton>
          </Tooltip>
          {!isAuto && (
            <Tooltip title="Reset to latest activity">
              <IconButton size="small" onClick={handleResetToAuto} sx={{ color: 'text.secondary' }}>
                <IconifyIcon icon="mdi:refresh" fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* line chart */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <CompletedTaskChart sx={{ height: '100% !important' }} timeline={timeline} />
      </Box>
    </Paper>
  );
};

export default CompletedTask;
