import { fontFamily } from 'theme/typography';
import { useState, useEffect, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import DateSelect from 'components/dates/DateSelect';
import IconifyIcon from 'components/base/IconifyIcon';
import OrdersStatusTable from './OrdersStatusTable';
import { apiClient, AccessLogItem } from 'lib/api';

const OrdersStatus = () => {
  const [searchText, setSearchText] = useState('');
  const [logs, setLogs] = useState<AccessLogItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.getAccessLogs();
        setLogs(data.items);
      } catch (err) {
        console.error('Failed to fetch access logs:', err);
      }
    };
    void fetchData();
  }, []);

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
          <DateSelect />
          <Button variant="contained" size="small">
            Filter Logs
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
