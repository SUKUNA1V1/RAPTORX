import { fontFamily } from 'theme/typography';
import { useState, useEffect, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconifyIcon from 'components/base/IconifyIcon';
import OrdersStatusTable from './OrdersStatusTable';
import { apiClient, AccessLogItem } from 'lib/api';
import paths from 'routes/paths';

import { useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

interface DayjsLike {
  startOf: (unit: string) => { toISOString: () => string };
}

const OrdersStatus = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [timeframe, setTimeframe] = useState('all');
  const [customDate, setCustomDate] = useState<DayjsLike | null>(null);

  const fetchData = async () => {
    try {
      const data = await apiClient.getAccessLogs(1, 50, {});
      setLogs(data.items);
    } catch (err) {
      console.error('Failed to fetch access logs:', err);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []); // Run only on initial mount

  const handleGo = () => {
    const params = new URLSearchParams();
    if (decisionFilter !== 'all') params.set('decision', decisionFilter);
    
    if (timeframe === 'custom' && customDate) {
      params.set('date_from', customDate.startOf('day').toISOString());
    } else if (timeframe !== 'all' && timeframe !== 'custom') {
      const date = new Date();
      if (timeframe === '1h') date.setHours(date.getHours() - 1);
      else if (timeframe === '12h') date.setHours(date.getHours() - 12);
      else if (timeframe === '24h') date.setDate(date.getDate() - 1);
      else if (timeframe === '7d') date.setDate(date.getDate() - 7);
      params.set('date_from', date.toISOString());
    }

    navigate(`${paths.accessLogs}?${params.toString()}`);
  };

  const handleDecisionFilterChange = (e: SelectChangeEvent) => {
    setDecisionFilter(e.target.value);
  };

  const handleTimeframeChange = (e: SelectChangeEvent) => {
    setTimeframe(e.target.value);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const getNativeStatus = (decision: string) => {
    const d = decision.toLowerCase();
    if (d === 'granted') return 'delivered';
    if (d === 'denied') return 'canceled';
    return 'pending';
  };

  const formattedData = logs.map((log) => ({
    id: log.id.toString(), // Fix: Ensure string
    client: {
      name: `${log.user?.first_name || 'System'} ${log.user?.last_name || 'Node'}`, // Fix: Optional chaining
      email: log.user?.role || 'Unknown',
    },
    date: new Date(log.timestamp),
    status: getNativeStatus(log.decision),
    country: log.access_point?.name || 'Local AP',
    total: log.risk_score.toString(),
  }));

  return (
    <Paper sx={{ px: 0 }}>
      <Stack
        px={3.5}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack
          spacing={2}
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          flexGrow={1}
        >
          <Typography variant="h6" fontWeight={400} fontFamily={fontFamily.workSans}>
            Real-time Security Logs
          </Typography>
          <TextField
            variant="filled"
            size="small"
            placeholder="Search for..."
            value={searchText}
            onChange={handleInputChange}
            sx={{ width: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconifyIcon icon={'mingcute:search-line'} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
        <Stack
          spacing={1.5}
          direction={{ xs: 'column-reverse', sm: 'row' }}
          alignItems={{ xs: 'flex-end', sm: 'center' }}
        >
          <Select
            size="small"
            value={timeframe}
            onChange={handleTimeframeChange}
            displayEmpty
            sx={{ 
              width: 140, 
              bgcolor: 'background.paper',
              '& .MuiSelect-select': { py: 0.8 },
            }}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="12h">Last 12 Hours</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="custom">Custom Date</MenuItem>
          </Select>
          
          {timeframe === 'custom' && (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={customDate}
                onChange={(newValue) => setCustomDate(newValue)}
                format="MMM DD, YYYY"
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      width: 140,
                      bgcolor: 'background.paper',
                      '& .MuiInputBase-input': { py: 0.8 },
                    }
                  }
                }}
              />
            </LocalizationProvider>
          )}

          <Select
            size="small"
            value={decisionFilter}
            onChange={handleDecisionFilterChange}
            displayEmpty
            sx={{ 
              width: 160, 
              bgcolor: 'background.paper',
              '& .MuiSelect-select': { py: 0.8 },
            }}
          >
            <MenuItem value="all">All Decisions</MenuItem>
            <MenuItem value="granted">Granted</MenuItem>
            <MenuItem value="denied">Denied</MenuItem>
            <MenuItem value="delayed">Delayed</MenuItem>
          </Select>
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleGo}
            sx={{ minWidth: 64, height: 36 }}
          >
            GO
          </Button>
        </Stack>
      </Stack>

      <Box mt={1.5} sx={{ height: 594, width: 1 }}>
        <OrdersStatusTable searchText={searchText} data={formattedData} />
      </Box>
    </Paper>
  );
};

export default OrdersStatus;
